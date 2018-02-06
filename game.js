
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-game', { preload: preload, create: create, update: update, render: render });

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
}

var title;

var ballSprite;
var arrowSprite;
var flagSprite;

var shooterBaseSprite;
var shooterAngleSprite;

var mouseDownPosition = {};

var groundLevel = 600 - 64; // platform is 128 high, centered at bottom of screen

 var planes;

var hillGraphics = [];
var hillBodies = [];

var tv;
var scanlines;

// Some game variables
var score;
var remainingBalls = 0;

var GAME_STATE_TITLE = 0;
var GAME_STATE_PLAYING = 1;

var gameState = GAME_STATE_TITLE;


function gameStart() {

   console.log('gameStart');

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
   if (flagSprite != null) {
      flagSprite.destroy();
      flagSprite = null;
   }

   // Generate hills
   var NUM_VALLEYS = 2 + (Math.random() * 3);
   var NUM_VALLEY_SLICES = 10;

   var hillCoordinates = calcValleys(NUM_VALLEYS, NUM_VALLEY_SLICES);

   if (showHole) {

      // Randomly place the hole somewhere on the right side of the screen
      var holeFinderIdx = Math.round((hillCoordinates.length * 0.66) * Math.random() + (hillCoordinates.length / 3));
      var wentDown = false;
      for (var holeIdx = holeFinderIdx; holeIdx < hillCoordinates.length; holeIdx++) {

         // If we hit the edge of the screen, re-roll the starting index (this is highly irregular, but it works, so #YOLO)
         if (holeIdx + 1 == hillCoordinates.length) {
            holeIdx = Math.round((hillCoordinates.length * 0.66) * Math.random() + (hillCoordinates.length / 3));
         }

         // We want to make sure we're at the bottom of a hole, hence the 'went down' flag
         if (wentDown && hillCoordinates[holeIdx][5] > hillCoordinates[holeIdx + 1][5]) {

            // Store the point where the flag should be placed
            var flagPoint = new Phaser.Point((hillCoordinates[holeIdx][2] + hillCoordinates[holeIdx + 1][2]) * 0.5 , hillCoordinates[holeIdx][3]);

            hillCoordinates[holeIdx][3] = game.world.height - 5;
            hillCoordinates[holeIdx][5] = game.world.height - 5; // Hard code the hole depth
            holeFinderIdx = holeIdx;
            break;
         }
         else if (hillCoordinates[holeIdx][5] < hillCoordinates[holeIdx + 1][5]) {
            wentDown = true;
         }
      }

      // Place the flag
      flagSprite = game.add.sprite(flagPoint.x, flagPoint.y, 'flag');
      flagSprite.anchor.setTo(0.5, 1);
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

      var body = new Phaser.Physics.Box2D.Body(game, null, 0, 0, 0);
      body.setChain(hillCoordinates[i]);
      body.static = true;

      // Store the graphics and body objects so they can be destroyed next redraw
      hillGraphics.push(graphics);
      hillBodies.push(body);
   }

   // Fix z-order problems
   game.world.bringToTop(title);
   game.world.bringToTop(ballSprite);
   game.world.bringToTop(scanlines);
   game.world.bringToTop(tv);
}

function roundStart() {

   remainingBalls = 3;

   drawHills(true);

   // Set up handlers for mouse events
   game.input.onDown.add(mouseDragStart, this);
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

   scanlines = game.add.tileSprite(0, 0, 800, 600, 'scanlines');
   scanlines.alpha = 0.06;

   tv = game.add.sprite(game.world.centerX, game.world.centerY, 'tv');
   tv.anchor.setTo(0.5, 0.5);

   // Setup planes using group
   planes = game.add.physicsGroup(Phaser.Physics.BOX2D);

   for (var i = 0; i < 5; i++) {

      var startX = 0;
      var velocityX = Math.random() * 100 + 50;
      var scaleX = 2;

      if (Math.round(Math.random())) {
         startX = game.width;
         velocityX *= -1;
         scaleX *= -1;
      }

      var p = planes.create(startX, groundLevel - (100 * (i + 1)), 'plane');
      p.anchor.set(0.5);
      p.tint = Math.random() * 0xffffff;
      p.scale.x = scaleX;
      p.scale.y = 2;

      p.body.velocity.x = velocityX;

      p.body.gravityScale = 0;

      p.body.collideWorldBounds = false;
   }


   // Increase default density before creating ball
   game.physics.box2d.density = 4;

   // Arrow sprite for aiming
   arrowSprite = game.add.sprite(100, groundLevel - 100, 'arrow');
   arrowSprite.anchor.set(0,0.5);
   arrowSprite.alpha = 0;
   
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

   ballSprite.scaleX = ballSprite.scaleY = 2;
   ballSprite.body.bullet = true;

   // ballSprite.body.setBodyContactCallback(planes, planeCallback, this);

   // The shooter
   shooterBaseSprite = game.add.sprite(100, groundLevel - 100, 'shooter');

   shooterAngleSprite = game.add.sprite(100, groundLevel - 100, 'shooter');
   shooterAngleSprite.pivot.x = 6;
   shooterAngleSprite.pivot.y = 6;



   gameStart();
}

function update() {

    // Wrap the planes if they hit the edge of the world
    for (var i = 0, len = planes.children.length; i < len; i++) {
      var p = planes.children[i];
      
      if (p.body.velocity.x > 0 && p.world.x > game.world.width) {
         p.body.reset(0, p.world.y);
      } else if (p.body.velocity.x < 0 && p.world.x < 0)
      {
         p.body.reset(game.world.width, p.world.y);
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
   
   ballSprite.body.gravityScale = 0;
   ballSprite.body.x = 100;
   ballSprite.body.y = groundLevel - 100;
   ballSprite.body.velocity.x = 0;
   ballSprite.body.velocity.y = 0;
   ballSprite.body.angularVelocity = 0;
   
   mouseDownPosition.x = game.input.mousePointer.position.x;
   mouseDownPosition.y = game.input.mousePointer.position.y;
   arrowSprite.alpha = 0.5;
   mouseDragMove();

   // Display the aiming indicator
   shooterAngleSprite.alpha = 1;

   game.input.addMoveCallback(mouseDragMove, this);
   game.input.onUp.add(mouseDragEnd, this);
}

function mouseDragMove() {
   
   if ( mouseDownPosition == null )
      return;
   
   var mouseNowPosition = game.input.mousePointer.position;
   var dx = mouseNowPosition.x - mouseDownPosition.x;
   var dy = mouseNowPosition.y - mouseDownPosition.y;
   var length = Math.sqrt( dx*dx + dy*dy );
   
   arrowSprite.scale.set(length * 0.05, 0.5);
   arrowSprite.rotation = Math.atan2( -dy, -dx );

   // Move the shooter
   shooterAngleSprite.rotation = Math.atan2(-dy, -dx);
}

function mouseDragEnd() {

   game.input.onUp.removeAll();
   game.input.deleteMoveCallback(mouseDragMove, this);

   var mouseNowPosition = game.input.mousePointer.position;
   var dx = mouseNowPosition.x - mouseDownPosition.x;
   var dy = mouseNowPosition.y - mouseDownPosition.y;
   
   ballSprite.body.gravityScale = 1;
   ballSprite.body.velocity.x = -dx * 10;
   ballSprite.body.velocity.y = -dy * 10;

   arrowSprite.alpha = 0;

   // Reset this to a generic angle
   arrowSprite.rotation = 0;

   mouseDownPosition = {};
}


// This function will be triggered when the ball begins or ends touching a plane
function planeCallback(body1, body2, fixture1, fixture2, begin) {

    // This callback is also called for EndContact events, which we are not interested in.
    if (!begin)
    {
        return;
    }

    console.log('ho');
    
    // body1 is the ball because it's the body that owns the callback
    // body2 is the body it impacted with, in this case the plane
    // fixture1 is the fixture of body1 that was touched
    // fixture2 is the fixture of body2 that was touched

    game.add.tween(body2).to({ y: groundLevel }, 1000, Phaser.Easing.Exponential.None);

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

   var hillVector = new box2d.b2Vec2();

   for (var i = 0; i < numberOfValleys; i++) {

      // This was originally designed to generate hills, but for my golf game, valleys make more sense
      var randomHeight = - Math.random() * maxHillHeight;

      if(i != 0) {
         hillStartY -= randomHeight;
      }

      for (var j = 0; j < hillSliceWidth; j++) {

         hillVector = [];
         hillVector.push(new box2d.b2Vec2((j * pixelStep + hillWidth * i), game.world.height));
         hillVector.push(new box2d.b2Vec2((j * pixelStep + hillWidth * i),(hillStartY+randomHeight * Math.cos(2 * Math.PI / hillSliceWidth * j))));
         hillVector.push(new box2d.b2Vec2(((j + 1) * pixelStep + hillWidth * i),(hillStartY + randomHeight * Math.cos(2 * Math.PI / hillSliceWidth * (j + 1)))));
         hillVector.push(new box2d.b2Vec2(((j + 1) * pixelStep + hillWidth * i), game.world.height));

         var poly = [];
         for (var hv = 0; hv < hillVector.length; hv++) {
            poly.push(hillVector[hv].x);
            poly.push(hillVector[hv].y);
         }

         // Add the array of polygons to the collection being returned
         ret.push(poly);

      }
      hillStartY = hillStartY + randomHeight;
   }

   // Return the coordinates we've created
   return ret;
}