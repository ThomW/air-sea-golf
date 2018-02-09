
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-game', { preload: preload, create: create, update: update, render: render });

var soundNames = ['shoot', 'inhole', 'planecollide', 'ballbounce', 'planebounce'];
var sounds = [];

function preload () {
   game.load.image('background', 'img/background.png');
   game.load.image('title', 'img/title.png');
   game.load.image('plane', 'img/plane.png');
   game.load.image('ball', 'img/ball.png');
   game.load.image('arrow', 'img/arrow.png');
   game.load.image('flag', 'img/flag.png');
   game.load.image('shooter', 'img/shooter.png');
   game.load.image('scanlines', 'img/scanlines.png');
   game.load.image('tv', 'img/tv-overlay.png');

   game.load.image('scoreFont', 'fonts/asb.png');


   for (var i = 0; i < soundNames.length; i++) {
      game.load.audio(soundNames[i], 'audio/' + soundNames[i] + '.mp3');
   }
}

var title;

var ballSprite;
var arrowSprite;
var flagSprite;
var holeBgSprite;
var holeSensor;

var shooterBaseSprite;
var shooterAngleSprite;

var mouseDownPosition = {};

var groundLevel = 600 - 128; // platform is 128 high, centered at bottom of screen

 var planes;

var hillGraphics = [];
var hillBodies = [];

var tv;
var scanlines;

// Some game variables
var MAX_BALLS = 3;
var score;
var remainingBalls = 0;

var GAME_STATE_BUSY = 0;
var GAME_STATE_TITLE = 1;
var GAME_STATE_PLAYING = 2;
var GAME_STATE_CHANGE_HOLES = 8;

var gameState = GAME_STATE_TITLE;

var shootingInput = null;

var score;
var scoreText;
var scoreImg;


function gameStart() {

   drawHills(false);

   score = 0;

   showTitle();

   // Start the game when the mouse is clicked
   gameState = GAME_STATE_TITLE;
   game.input.onDown.add(clickStart, this);
}

function clickStart() {

   gameState = GAME_STATE_PLAYING;

   // Remove the click event that starts the game
   game.input.onDown.removeAll();

   hideTitle();

   roundStart();
}

function drawHills(showHole) {

   if (showHole == null) {
      showHole = false;
   }

   // Kill the previous hill objects
   while (hillGraphics.length > 0) {
      hillGraphics.pop().destroy();
   }
   while (hillBodies.length > 0) {
      hillBodies.pop().destroy();
   }
   flagSprite.kill();
   holeSensor.kill();

   // Generate hills
   var NUM_VALLEYS = Math.round(3 + (Math.random() * 3));
   var NUM_VALLEY_SLICES = 10;

   var hillCoordinates = calcValleys(NUM_VALLEYS, NUM_VALLEY_SLICES);

   // console.log('hillCoordinates: ' + hillCoordinates.length + ' -- max: ' + hillCoordinates[hillCoordinates.length - 1][4]);

   if (showHole) {

      // Randomly place the hole somewhere on the right side of the screen
      var holeFinderIdx = Math.round((hillCoordinates.length * 0.5) * Math.random() + (hillCoordinates.length * 0.25));
      var wentDown = 0;
      for (var holeIdx = holeFinderIdx; holeIdx < hillCoordinates.length; holeIdx++) {

         // If we hit the edge of the screen, re-roll the starting index (this is highly irregular, but it works, so #YOLO)
         if (holeIdx + 1 == hillCoordinates.length) {
            holeIdx = Math.round((hillCoordinates.length * 0.5) * Math.random() + (hillCoordinates.length * 0.25));
            wentDown = 0;
         }

         // We want to make sure we're at the bottom of a hole, hence the 'went down' flag
         if (wentDown > 2 && hillCoordinates[holeIdx][5] > hillCoordinates[holeIdx + 1][5]) {

            // Store the point where the flag should be placed
            var flagPoint = new Phaser.Point((hillCoordinates[holeIdx][2] + hillCoordinates[holeIdx + 1][2]) * 0.5 , hillCoordinates[holeIdx][3]);

            hillCoordinates[holeIdx][3] = game.world.height - 5;
            hillCoordinates[holeIdx][5] = game.world.height - 5; // Hard code the hole depth
            holeFinderIdx = holeIdx;
            break;
         }
         else if (hillCoordinates[holeIdx][5] < hillCoordinates[holeIdx + 1][5]) {
            wentDown += 1;
         } 
         else if (hillCoordinates[holeIdx][5] >= hillCoordinates[holeIdx + 1][5]) {
            wentDown = 0;
         }


      }

      // Place the flag
      flagSprite.reset(flagPoint.x, flagPoint.y);

      // Place the hole sensor
      holeSensor.reset(flagPoint.x, game.world.height);
   }

   // 
   for (var i = 0; i < hillCoordinates.length; i++)
   {
      // Clone the hillCoordinates of this point so I can alter them to make them look blocky without affecting the physics
      var graphicPoints = hillCoordinates[i].slice(0);
      graphicPoints[3] = graphicPoints[5];

      // I have to turn this dumb thing into a sprite I guess. 
      poly = new Phaser.Polygon(graphicPoints);
      graphics = game.add.graphics(0,0);
      graphics.beginFill(0x008800);
      graphics.drawPolygon(poly.points);
      graphics.endFill();

      var body = new Phaser.Physics.Box2D.Body(game, null, 0, 0);
      body.setChain(hillCoordinates[i]);
      body.static = true;

      // Store the graphics and body objects so they can be destroyed next redraw
      hillGraphics.push(graphics);
      hillBodies.push(body);
   }

   // Make the shooter touch the ground
   var shooterBottomX = shooterBaseSprite.world.x + (shooterBaseSprite.width * 0.5);
   for (var i = 0; i < hillCoordinates.length; i++) {
      // Find the first hillCoordinates under the center of the shooter base
      if (hillCoordinates[i][0] >= shooterBottomX) {
         shooterBaseSprite.reset(shooterBaseSprite.world.x, hillCoordinates[i][3] - 6);
         shooterAngleSprite.reset(shooterBaseSprite.world.x, hillCoordinates[i][3] - 6);
         break;
      }
   }

   // Fix z-order problems
   game.world.bringToTop(shooterBaseSprite);
   game.world.bringToTop(shooterAngleSprite);
   game.world.bringToTop(title);
   game.world.bringToTop(flagSprite);
   game.world.bringToTop(ballSprite);
   game.world.bringToTop(scanlines);
   game.world.bringToTop(tv);
}

function roundStart() {

   remainingBalls = MAX_BALLS;

   updateScore();

   drawHills(true);

   // Set up handlers for mouse events
   game.input.onDown.add(mouseDragStart, this);
}

function updateScore() {

   var tmp = '';

   for (var i = 1; i <= MAX_BALLS; i++) {
      if (remainingBalls >= i) {
         tmp += '.';
      } else {
         tmp += ' ';
      }
   }

   scoreText.text = tmp + ' ' + score;

}

function create () {

   // Enable Physics
   game.physics.startSystem(Phaser.Physics.BOX2D);
   game.physics.box2d.setBoundsToWorld();

   game.physics.box2d.density = 5;
   game.physics.box2d.friction = 100;
   game.physics.box2d.restitution = 0.25; // 0-1 (No bounce - max bounce)

   game.physics.box2d.gravity.y = 6000;


   var background = game.add.sprite(game.world.centerX, game.world.centerY, 'background');
   background.anchor.setTo(0.5, 0.5);

   scoreText = game.add.retroFont('scoreFont', 7, 6, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ,.', 10);
   scoreText.text = '';
   scoreImg = game.add.image(game.world.centerX, 50, scoreText);
   scoreImg.anchor.setTo(0.5, 0.5);
   scoreImg.scale.x = 10;
   scoreImg.scale.y = 10;
   scoreImg.alpha = 0.8;

   scanlines = game.add.tileSprite(0, 0, 800, 600, 'scanlines');
   scanlines.alpha = 0.06;

   tv = game.add.sprite(game.world.centerX, game.world.centerY, 'tv');
   tv.anchor.setTo(0.5, 0.5);

   // Setup planes using group
   planes = game.add.group();
   planes.enableBody = true;
   planes.physicsBodyType = Phaser.Physics.BOX2D;

   for (var i = 0; i < 5; i++) {

      var startX = 0;
      var startY = groundLevel - (80 * (i + 1));
      var velocityX = Math.random() * 100 + 50;
      var scaleX = 1;

      if (Math.round(Math.random())) {
         startX = game.width;
         velocityX *= -1;
         scaleX *= -1;
      }

      var p = planes.create(startX, startY, 'plane');

      // Custom variable to hold the plane's starting position to make it easier to reset
      p.startingY = startY;

      p.tint = Math.random() * 0xffffff;
      p.scale.x = scaleX;

      p.body.velocity.x = velocityX;

      p.body.gravityScale = 0;

      p.body.collideWorldBounds = false;

      p.body.setCollisionCategory(3);

      // p.body.setCategoryContactCallback(1, planeOnPlaneCallback, this);
   }

   // Increase default density before creating ball
   game.physics.box2d.density = 4;

   // Arrow sprite for aiming
   arrowSprite = game.add.sprite(100, groundLevel - 100, 'arrow');
   arrowSprite.anchor.set(0,0.5);
   arrowSprite.alpha = 0;

   // Create the flag sprite
   flagSprite = game.add.sprite(0, 0, 'flag');
   flagSprite.anchor.setTo(0.5, 1);
   flagSprite.scale.x = 2;
   flagSprite.scale.y = 2;
   flagSprite.kill();
   
   // Show the game's title screen
   title = game.add.sprite(game.world.centerX, game.world.centerY, 'title');
   title.anchor.setTo(0.5, 0.5);
   title.alpha = 0;

   // The ball
   ballSprite = game.add.sprite(100, groundLevel - 100, 'ball');
   game.physics.box2d.enable(ballSprite);
   ballSprite.body.gravityScale = 0;
   ballSprite.body.setCircle(4);
   ballSprite.body.collideWorldBounds = false;
   ballSprite.body.mass = 100;
   ballSprite.body.allowSleep = true;
   ballSprite.body.bullet = true;
   ballSprite.kill();

   // Collisions between bodies and groups have to use CategoryContact to work
   ballSprite.body.setCategoryContactCallback(3, ballOnPlaneCallback, this);
   // ballSprite.body.setCategoryContactCallback(1, ballOnGroundCallback, this);

   // Setup the hole sensor
   holeSensor = game.add.sprite(0, game.world.height, 'ball');
   holeSensor.anchor.setTo(0.5, 0.5);
   holeSensor.tint = 0x000000;
   game.physics.box2d.enable(holeSensor);
   holeSensor.body.static = true;
   holeSensor.collideWorldBounds = false;
   holeSensor.body.setBodyContactCallback(ballSprite, inHoleCallback, this);
   holeSensor.kill();

   // The shooter
   var SHOOTER_X = 66;
   shooterBaseSprite = game.add.sprite(SHOOTER_X, groundLevel - 100, 'shooter');
   shooterBaseSprite.anchor.set(0, 0.5);
   shooterAngleSprite = game.add.sprite(SHOOTER_X + 6, groundLevel - 100, 'shooter');
   shooterAngleSprite.pivot.x = 6;
   shooterAngleSprite.pivot.y = 6;
   shooterAngleSprite.angle = -75;

   // Init sounds
   for (var i = 0; i < soundNames.length; i++) {
      sounds[soundNames[i]] = game.add.audio(soundNames[i]);
   }

   gameStart();
}

function update() {

   if (gameState == GAME_STATE_CHANGE_HOLES) {

      gameState = GAME_STATE_BUSY;

      score += 1;

      roundStart();

      gameState = GAME_STATE_PLAYING;
   }

   // When the player is shooting, update the shooter
   if (shootingInput) {
      updateShooter();
   }

   // Do some housekeeping on the planes
   for (var i = 0, len = planes.children.length; i < len; i++) {
   
      var p = planes.children[i];
      
       // Wrap the planes if they hit the edge of the world
      if (p.body.velocity.x > 0 && p.world.x > game.world.width) {
         p.body.reset(0, p.world.y);
      } else if (p.body.velocity.x < 0 && p.world.x < 0) {
         p.body.reset(game.world.width, p.world.y);
      }

      // Reset planes that go off screen
      if (p.world.y < 0) {
         
         var startX = 0;
         var velocityX = Math.random() * 100 + 50;
         var scaleX = 1;

         if (Math.round(Math.random())) {
            startX = game.width;
            velocityX *= -1;
            scaleX *= -1;
         }

         // Flip the texture the correct way
         p.scale.x = Math.abs(p.scale.x) * scaleX;

         // Reset the position, angle, and velocities
         p.body.reset(startX, p.startingY);
         p.body.angle = 0;
         p.body.velocity.x = velocityX;
         p.body.velocity.y = 0;
         p.body.angularVelocity = 0;

         // Recolor the plane
         p.tint = Math.random() * 0xffffff;
      }
   }
}

function showTitle() {
   game.add.tween(title).to( { alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
}

function hideTitle() {
   game.add.tween(title).to( { alpha: 0 }, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
}

function mouseDragStart() {

   /*
   if (remainingBalls <= 0) {
      return;
   }
   */

   ballSprite.body.gravityScale = 0;
   ballSprite.reset(100, shooterBaseSprite.world.y - 10);
   ballSprite.visible = false;
   ballSprite.body.velocity.x = 0;
   ballSprite.body.velocity.y = 0;
   ballSprite.body.angularVelocity = 0;

   shootingInput = true;

   mouseDownPosition.x = game.input.activePointer.position.x;
   mouseDownPosition.y = game.input.activePointer.position.y;

   arrowSprite.reset(shooterBaseSprite.world.x, shooterBaseSprite.world.y);
   arrowSprite.alpha = 0.5;

   updateShooter();

   // Display the aiming indicator
   shooterAngleSprite.reset(shooterBaseSprite.world.x, shooterBaseSprite.world.y);
   shooterAngleSprite.alpha = 1;

   // game.input.addMoveCallback(mouseDragMove, this);
   game.input.onUp.add(mouseDragEnd, this);

   remainingBalls -= 1;
   updateScore();

}

function updateShooter() {

   if (!shootingInput) {
      return;
   }
   
   if ( mouseDownPosition == null ) {
      return;
   }
   
   var mouseNowPosition = game.input.activePointer.position;
   var dx = mouseNowPosition.x - mouseDownPosition.x;
   var dy = mouseNowPosition.y - mouseDownPosition.y;

   var length = Math.sqrt( dx * dx + dy * dy );
   
   arrowSprite.scale.set(length * 0.05, 0.5);
   arrowSprite.rotation = Math.atan2( -dy, -dx );

   // Move the shooter
   shooterAngleSprite.rotation = Math.atan2(-dy, -dx);
}

function mouseDragEnd() {

   game.input.onUp.removeAll();

   sounds.shoot.play();

   var mouseNowPosition = game.input.activePointer.position;
   var dx = mouseNowPosition.x - mouseDownPosition.x;
   var dy = mouseNowPosition.y - mouseDownPosition.y;
   
   ballSprite.body.gravityScale = 1;
   ballSprite.body.velocity.x = -dx * 10;
   ballSprite.body.velocity.y = -dy * 10;
   ballSprite.visible = true;

   arrowSprite.alpha = 0;

   mouseDownPosition = {};
   shootingInput = false;
}


// This function will be triggered when the ball begins or ends touching a plane
function planeOnPlaneCallback(body1, body2, fixture1, fixture2, begin) {

    // This callback is also called for EndContact events, which we are not interested in.
    if (!begin) {
        return;
    }

    sounds.planebounce.play();
}

// This function will be triggered when the ball begins or ends touching a plane
function ballOnPlaneCallback(body1, body2, fixture1, fixture2, begin) {

    // This callback is also called for EndContact events, which we are not interested in.
    if (!begin) {
        return;
    }

    sounds.planecollide.play();
}

function ballOnGroundCallback(body1, body2, fixture1, fixture2, begin) {

    // This callback is also called for EndContact events, which we are not interested in.
    if (!begin) {
        return;
    }

    sounds.ballbounce.play();
}



function inHoleCallback(body1, body2, fixture1, fixture2, begin) {

   if (!ballSprite.alive || !begin) {
      return;
   }

   // Do scorekeeping, etc.

   ballSprite.kill();
   holeSensor.kill();

   gameState = GAME_STATE_CHANGE_HOLES;

   sounds.inhole.play();
}

function render() {

   // This enables the box2D debugger view
   // game.debug.box2dWorld();

}

// Code based on http://www.emanueleferonato.com/2011/07/14/create-a-terrain-like-the-one-in-tiny-wings-with-flash-and-box2d/
function calcValleys(numberOfValleys, pixelStep) {

   // This is the array of arrays of vector points this method generates
   var ret = [];

   // This is a constant representing the starting Y value for the hills
   var hillStartY = 450;

   // TODO: Vary this based on level?
   var maxHillHeight = 80;

   var hillWidth = game.world.width / numberOfValleys;
   var hillSliceWidth = hillWidth / pixelStep;

   /*
   console.log('game.world.width: ' + game.world.width);
   console.log('numberOfValleys: ' + numberOfValleys);
   console.log('hillWidth: ' + hillWidth);
   console.log('hillSliceWidth: ' + hillSliceWidth);
   */

   var hillVector = new box2d.b2Vec2();

   var hillX = 0;

   for (var i = 0; i < numberOfValleys; i++) {

      // This was originally designed to generate hills, but for my golf game, valleys make more sense
      var randomHeight = - Math.random() * maxHillHeight;

      if(i != 0) {
         hillStartY -= randomHeight;
      }

      for (var j = 0; j < hillSliceWidth; j++) {

         // Rather than using math to derive the cumulative pixelStep (which led to weird issues), just keep a running value for X
         hillX += pixelStep;

         hillVector = [];
         hillVector.push(new box2d.b2Vec2(hillX, game.world.height));
         hillVector.push(new box2d.b2Vec2(hillX, (hillStartY+randomHeight * Math.cos(2 * Math.PI / hillSliceWidth * j))));
         hillVector.push(new box2d.b2Vec2(hillX + pixelStep, (hillStartY + randomHeight * Math.cos(2 * Math.PI / hillSliceWidth * (j + 1)))));
         hillVector.push(new box2d.b2Vec2(hillX + pixelStep, game.world.height));

         var poly = [];
         for (var hv = 0; hv < hillVector.length; hv++) {
            poly.push(hillVector[hv].x);
            poly.push(hillVector[hv].y);
         }

         // Prevent values past the end of the world from being added to the array
         if (j * pixelStep + hillWidth * i < game.world.width) {
            // Add the array of polygons to the collection being returned
            ret.push(poly);
         }

      }
      hillStartY = hillStartY + randomHeight;
   }

   // Return the coordinates we've created
   return ret;
}