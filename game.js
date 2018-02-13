
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-game', { preload: preload, create: create, update: update, render: render });

var soundNames = ['shoot', 'inhole', 'planecollide', 'ballbounce', 'planebounce'];
var sounds = [];

function preload () {

   // Needed to combat content caching
   var imgFolder = 'img3/';

   var imgNames = ['background', 'title', 'plane', 'ball', 'arrow', 'flag', 'shooter', 'tv-overlay'];
   for (var i = 0; i < imgNames.length; i++) {
      game.load.image(imgNames[i], imgFolder + imgNames[i] + '.png');
   }

   if (game.device.desktop) {
      game.load.spritesheet('gameover', imgFolder + 'game-over.png', 734, 46);
   } else {
      game.load.spritesheet('gameover', imgFolder + 'game-over-mobile.png', 627, 46);
   }
   game.load.spritesheet('explosion', imgFolder + 'explosion.png', 64, 32);

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

var groundLevel = 600 - 128; 

 var planes;

var hillGraphics = [];
var hillBody = null;

var tv;

// Some game variables
var MAX_BALLS = 5;
var score;
var remainingBalls = 0;

var GAME_STATE_BUSY = 0;
var GAME_STATE_TITLE = 1;
var GAME_STATE_PLAYING = 2;
var GAME_STATE_CHANGE_HOLES = 8;
var GAME_STATE_END_GAME = 15;
var GAME_STATE_GAME_OVER = 16;

var lastGameState = null;
var gameState = GAME_STATE_TITLE;

var shootingInput = null;

var score;
var scoreText;
var scoreImg;

var ballRestingData = null;

function gameStart() {

   drawHills(false);

   showTitle();
}

function clickStart() {

   score = 0;

   gameState = GAME_STATE_PLAYING;

   // Remove the click event that starts the game
   game.input.onDown.removeAll();

   // Hide the title
   game.add.tween(title).to( { alpha: 0 }, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);

   // Hide the game over sprite
   gameoverSprite.visible = false;

   roundStart();
}

function gameOver() {

   showTitle();

}

function showTitle() {

   gameoverSprite.visible = true;

   game.add.tween(title).to( { alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);

   // Start the game when the mouse is clicked
   gameState = GAME_STATE_TITLE;
   game.input.onDown.add(clickStart, this);
}

function drawHills(showHole) {

   if (showHole == null) {
      showHole = false;
   }

   // Kill the previous hill objects
   while (hillGraphics.length > 0) {
      hillGraphics.pop().destroy();
   }

   if (hillBody != null) { hillBody.destroy(); }
   
   flagSprite.kill();
   holeSensor.kill();
   ballSprite.kill();

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


   // Make the shooter touch the ground
   var shooterBottomX = shooterBaseSprite.world.x + (shooterBaseSprite.width * 0.5);
   var shooterY;
   for (var i = 0; i < hillCoordinates.length; i++) {
      // Find the first hillCoordinates under the center of the shooter base
      if (hillCoordinates[i][0] >= shooterBottomX) {
         shooterY = hillCoordinates[i][3] - 6;
         shooterBaseSprite.reset(shooterBaseSprite.world.x, shooterY);
         shooterAngleSprite.reset(shooterBaseSprite.world.x, shooterY);
         break;
      }
   }

   var tallestHill = game.world.height;

   // 
   hillBody = new Phaser.Physics.Box2D.Body(game, null, 0, 0);
   hillBody.static = true;

   for (var i = 0; i < hillCoordinates.length; i++)
   {
      // Clone the hillCoordinates of this point so I can alter them to make them look blocky without affecting the physics
      var graphicPoints = hillCoordinates[i].slice(0);
      graphicPoints[3] = graphicPoints[5];

      // I have to turn this dumb thing into a sprite I guess. 
      poly = new Phaser.Polygon(graphicPoints);
      graphics = game.add.graphics(0,0);
      graphics.beginFill(0x008800);
      
      /*
      // Paints every 10th hill slice gray for debugging
      if (i % 10 == 0) { graphics.beginFill(0x888888); }
      */

      graphics.drawPolygon(poly.points);
      graphics.endFill();

      // Store the graphics
      hillGraphics.push(graphics);

      // Add the polygon to the hillBody object
      //
      // The area under the shooter is a flat plane to avoid issues with the ball getting stuck at launch
      if (hillCoordinates[i][4] <= shooterBottomX) {
         var shooterBaseCoordinates = hillCoordinates[i].slice(0);
         shooterBaseCoordinates[3] = shooterY;
         shooterBaseCoordinates[5] = shooterY;
         hillBody.addPolygon(shooterBaseCoordinates, 0, 4);         

      } else {
         hillBody.addPolygon(hillCoordinates[i], 0, 4);
      }

      // Find the highest peak's Y coordinate
      if (hillCoordinates[i][3] < tallestHill) {
         tallestHill = hillCoordinates[i][3];
      }
   }

   // Make sure none of the planes are trapped in the landscape after a redraw
   for (var i = 0, len = planes.children.length; i < len; i++) {
      var p = planes.children[i];
      if (p.world.y >= tallestHill) {
         resetPlane(p);
      }
   }

   // Fix z-order problems
   game.world.bringToTop(shooterBaseSprite);
   game.world.bringToTop(shooterAngleSprite);
   game.world.bringToTop(title);
   game.world.bringToTop(flagSprite);
   game.world.bringToTop(ballSprite);
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

   scoreText.text = tmp + ('   ' + score).slice(-4);
}

function create () {

      // Enable Physics
   game.physics.startSystem(Phaser.Physics.BOX2D);
   game.physics.box2d.setBoundsToWorld();

   game.physics.box2d.density = 5;
   game.physics.box2d.friction = 100;
   game.physics.box2d.gravity.y = 6000;
   game.physics.box2d.density = 4;

   var background = game.add.sprite(game.world.centerX, game.world.centerY, 'background');
   background.anchor.setTo(0.5, 0.5);

   scoreText = game.add.retroFont('scoreFont', 7, 6, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ,.', 10);
   scoreText.text = '';
   scoreImg = game.add.image(game.world.centerX, 70, scoreText);
   scoreImg.anchor.setTo(0.5, 0.5);
   scoreImg.scale.x = 10;
   scoreImg.scale.y = 10;
   scoreImg.alpha = 0.8;

   tv = game.add.sprite(game.world.centerX, game.world.centerY, 'tv-overlay');
   tv.anchor.setTo(0.5, 0.5);

   gameoverSprite = game.add.sprite(game.world.centerX, game.world.centerY + 20, 'gameover');
   gameoverSprite.animations.add('gameover');
   gameoverSprite.animations.play('gameover', 0.5, true);
   gameoverSprite.anchor.setTo(0.5, 0.5);
   gameoverSprite.alpha = 0.75;

   // Setup planes using group
   planes = game.add.group();
   planes.enableBody = true;
   planes.physicsBodyType = Phaser.Physics.BOX2D;

   for (var i = 0; i < 5; i++) {
      var p = planes.create(0, 0, 'plane');
      p.body.gravityScale = 0;
      p.body.collideWorldBounds = false;
      p.body.setCollisionCategory(3);

      // Custom variable to hold the plane's starting position to make it easier to reset
      p.startingY = groundLevel - (80 * (i + 1));

      resetPlane(p);

      // p.body.setCategoryContactCallback(1, planeOnPlaneCallback, this);
   }

   //  An explosion pool
   explosions = game.add.group();
   explosions.createMultiple(planes.children.length, 'explosion');
   explosions.forEach(setupExplosion, this);

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
   ballSprite.body.restitution = 0.25;
   ballSprite.kill();

   ballSprite.body.bodyDef.linearDamping = 1;
   ballSprite.body.bodyDef.angularDamping = 1;

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

   shooterBaseSprite.tint = shooterAngleSprite.tint = 0x0000ff;

   // Init sounds
   for (var i = 0; i < soundNames.length; i++) {
      sounds[soundNames[i]] = game.add.audio(soundNames[i]);
   }

   gameStart();
}

function update() {

   // Only execute 
   if (gameState != lastGameState) {

      if (gameState == GAME_STATE_CHANGE_HOLES) {

         gameState = GAME_STATE_BUSY;

         score += 1;

         roundStart();

         gameState = GAME_STATE_PLAYING;
      } 
      else if (gameState == GAME_STATE_END_GAME) {

         gameOver();

      }
   }
   lastGameState = gameState;

   // When the player is shooting, update the shooter
   if (shootingInput) {
      updateShooter();
   }

   // Do some housekeeping on the planes
   for (var i = 0, len = planes.children.length; i < len; i++) {

      var p = planes.children[i];

      if (p.doReset) {
         resetPlane(p);
      }
      
       // Wrap the planes if they hit the edge of the world
      if (p.body.velocity.x > 0 && p.world.x > game.world.width) {
         p.body.reset(0, p.world.y);
      } else if (p.body.velocity.x < 0 && p.world.x < 0) {
         p.body.reset(game.world.width, p.world.y);
      }


      // Reset planes that go off screen or that get stuck on something
      if (p.world.y < 0) {
         resetPlane(p);
      }
   }

   // Kill the ballSprite if it goes out of bounds
   if (ballSprite.world.x > game.world.width || ballSprite.world.x < 0) {
      ballSprite.kill();
   }

   // Homebrew at rest
   var POSITION_THRESHOLD = 2;
   var POSITION_TIMEOUT = 2000;
   if (ballSprite.alive && Math.abs(ballSprite.deltaX) < POSITION_THRESHOLD && Math.abs(ballSprite.deltaY) < POSITION_THRESHOLD) {
      if (ballRestingStart == null) {
         ballRestingStart = game.time.time;
      } else if (game.time.elapsedSince(ballRestingStart) > POSITION_TIMEOUT) {
         // Thresholds for time and position have been exceeded - put the ball to sleep
         ballSprite.body.gravityScale = 0;
         ballSprite.body.velocity.x = 0;
         ballSprite.body.velocity.y = 0;
         ballSprite.body.angularVelocity = 0;
         ballSprite.kill();
         ballSprite.visible = true;
         ballRestingStart = null;
      }
   } else {
      ballRestingStart = null;
   }

   // If the ballSprite is disabled and the player doesn't have any more balls, end the game
   if (!ballSprite.alive && remainingBalls == 0) {
      gameState = GAME_STATE_END_GAME;
   }
}

function explosionLooped(sprite, animation) {
   if (animation.loopCount >= 5) {
      animation.loop = false;
   } else {
      colors = [0xff8800, 0xffff00, 0xff0000, 0xffcc00, 0xff8800];
      sprite.tint = colors[animation.loopCount % colors.length];
   }
}

function setupExplosion(explosion) {
   explosion.anchor.x = 0.5;
   explosion.anchor.y = 0.5;
   explosion.tint = 0xff8800;

   anim = explosion.animations.add('explosion');

   anim.onLoop.add(explosionLooped, this);
}

function resetPlane(p) {

   p.doReset = false;

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

   // Reset the plane's health
   p.health = randInt(2,3);

   // Reset the position, angle, and velocities
   p.body.reset(startX, p.startingY);
   p.body.angle = 0;
   p.body.velocity.x = velocityX;
   p.body.velocity.y = 0;
   p.body.angularVelocity = 0;

   // Recolor the plane
   p.tint = Math.random() * 0xffffff;
}

function mouseDragStart() {

   if (remainingBalls <= 0) {
      return;
   }

   shootingInput = true;

   ballSprite.body.gravityScale = 0;
   ballSprite.reset(shooterBaseSprite.world.x + 4, shooterBaseSprite.world.y);
   ballSprite.body.velocity.x = 0;
   ballSprite.body.velocity.y = 0;
   ballSprite.body.angularVelocity = 0;
   ballSprite.visible = false;

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
   
   arrowSprite.scale.set(length * 0.033, 0.5);
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
    if (!begin || !ballSprite.alive) {
        return;
    }

    sounds.planecollide.play();

    body2.sprite.health -= 1;

    if (body2.sprite.health <= 0) {
      
      var explosion = explosions.getFirstExists(false);
      explosion.reset(body2.x, body2.y);
      explosion.play('explosion', 30, true, true);

      body2.sprite.doReset = true;
    }
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

   /*
   // This enables the box2D debugger view
   game.debug.box2dWorld();

   // Show the plane positions (not really necessary since fixing the hill spawning, but whatever)
   for (var i = 0, len = planes.children.length; i < len; i++) {
      var p = planes.children[i];
       game.debug.text(i + ': ' + Math.round(p.world.x) + ', ' + Math.round(p.world.y), 10, 50 + i * 12);
   }
   */
   
   /*
   // ballSprite values for testing my code to put the ball to sleep manually
   game.debug.text('Alive: ' + ballSprite.alive + ' ' + ('    ' +  Math.round(ballSprite.body.velocity.x)).slice(-4) + ',' + ('    ' + Math.round(ballSprite.body.velocity.y)).slice(-4), 100, 100);
   game.debug.text(('    ' +  Math.round(ballSprite.world.x)).slice(-4) + ',' + ('    ' + Math.round(ballSprite.world.y)).slice(-4), 100, 120);
   game.debug.text(('    ' +  Math.round(ballSprite.deltaX)).slice(-4) + ',' + ('    ' + Math.round(ballSprite.deltaY)).slice(-4), 100, 140);
   */
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
      var randomHeight = -rand(10, maxHillHeight);

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
         if (hillX < game.world.width) {
            // Add the array of polygons to the collection being returned
            ret.push(poly);
         } else {
            break;
         }

      }
      hillStartY = hillStartY + randomHeight;
   }

   // Return the coordinates we've created
   return ret;
}

function rand(min, max) {
   return min + (Math.random() * (max - min));
}

function randInt(min, max) {
   return Math.round(rand(min, max));
}
