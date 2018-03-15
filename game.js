
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

   game.load.atlas('demo-pointer', imgFolder + 'demo-pointer.png', imgFolder + 'demo-pointer.json');

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

var DEMO_MODE = false;
var demoLevel = [[10,600,10,417.32022229988326,20,418.9196844672269,20,600],[20,600,20,418.9196844672269,30,423.5615044682101,30,600],[30,600,30,423.5615044682101,40,430.7913086196749,40,600],[40,600,40,430.7913086196749,50,439.9013933182685,50,600],[50,600,50,439.9013933182685,60,450,60,600],[60,600,60,450,70,460.0986066817315,70,600],[70,600,70,460.0986066817315,80,469.20869138032504,80,600],[80,600,80,469.20869138032504,90,476.4384955317899,90,600],[90,600,90,476.4384955317899,100,481.0803155327731,100,600],[100,600,100,481.0803155327731,110,482.67977770011674,110,600],[110,600,110,482.67977770011674,120,481.0803155327731,120,600],[120,600,120,481.0803155327731,130,476.4384955317899,130,600],[130,600,130,476.4384955317899,140,469.2086913803251,140,600],[140,600,140,469.2086913803251,150,460.0986066817315,150,600],[150,600,150,460.0986066817315,160,450,160,600],[160,600,160,450,170,439.9013933182685,170,600],[170,600,170,439.9013933182685,180,430.79130861967496,180,600],[180,600,180,430.79130861967496,190,423.5615044682101,190,600],[190,600,190,423.5615044682101,200,418.9196844672269,200,600],[200,600,200,418.9196844672269,210,417.32022229988326,210,600],[210,600,210,417.32022229988326,220,419.1643088575518,220,600],[220,600,220,419.1643088575518,230,424.5160564897864,230,600],[230,600,230,424.5160564897864,240,432.85159885052553,240,600],[240,600,240,432.85159885052553,250,443.3549949763614,250,600],[250,600,250,443.3549949763614,260,454.99809927303323,260,600],[260,600,260,454.99809927303323,270,466.64120356970506,270,600],[270,600,270,466.64120356970506,280,477.14459969554093,280,600],[280,600,280,477.14459969554093,290,485.48014205628004,290,600],[290,600,290,485.48014205628004,300,490.83188968851465,300,600],[300,600,300,490.83188968851465,310,492.6759762461832,310,600],[310,600,310,492.6759762461832,320,490.83188968851465,320,600],[320,600,320,490.83188968851465,330,485.48014205628004,330,600],[330,600,330,485.48014205628004,340,477.14459969554093,340,600],[340,600,340,477.14459969554093,350,466.6412035697051,350,600],[350,600,350,466.6412035697051,360,454.99809927303323,360,600],[360,600,360,454.99809927303323,370,443.3549949763614,370,600],[370,600,370,443.3549949763614,380,432.85159885052553,380,600],[380,600,380,432.85159885052553,390,424.5160564897864,390,600],[390,600,390,424.5160564897864,400,419.1643088575518,400,600],[400,600,400,419.1643088575518,410,417.32022229988326,410,600],[410,600,410,417.32022229988326,420,419.9961365728891,420,600],[420,600,420,419.9961365728891,430,427.7619422586737,430,600],[430,600,430,427.7619422586737,440,439.85746818916266,440,600],[440,600,440,439.85746818916266,450,455.09872001179514,450,600],[450,600,450,455.09872001179514,460,471.9937778061262,460,600],[460,600,460,471.9937778061262,470,488.88883560045724,470,600],[470,600,470,488.88883560045724,480,504.1300874230898,480,600],[480,600,480,504.1300874230898,490,516.2256133535788,490,600],[490,600,490,516.2256133535788,500,523.9914190393633,500,600],[500,600,500,523.9914190393633,510,526.6673333123692,510,600],[510,600,510,526.6673333123692,520,523.9914190393633,520,600],[520,600,520,523.9914190393633,530,516.2256133535788,530,600],[530,600,530,516.2256133535788,540,504.1300874230898,540,600],[540,600,540,504.1300874230898,550,488.8888356004573,550,600],[550,600,550,488.8888356004573,560,471.9937778061262,560,600],[560,600,560,471.9937778061262,570,455.0987200117952,570,600],[570,600,570,455.0987200117952,580,439.85746818916266,580,600],[580,600,580,439.85746818916266,590,427.7619422586737,590,600],[590,600,590,427.7619422586737,600,419.9961365728891,600,600],[600,600,600,419.9961365728891,610,417.32022229988326,610,600],[610,600,610,417.3202222998832,620,418.46432306890813,620,600],[620,600,620,418.46432306890813,630,421.7846328212918,630,600],[630,600,630,421.7846328212918,640,426.95613650451264,640,600],[640,600,640,426.95613650451264,650,433.47261130607205,650,600],[650,600,650,433.47261130607205,660,440.69617926944375,660,600],[660,600,660,440.69617926944375,670,447.91974723281544,670,600],[670,600,670,447.91974723281544,680,454.43622203437485,680,600],[680,600,680,454.43622203437485,690,459.6077257175957,690,600],[690,600,690,459.6077257175957,700,462.92803546997936,700,600],[700,600,700,462.92803546997936,710,464.0721362390043,710,600],[710,600,710,464.0721362390043,720,462.92803546997936,720,600],[720,600,720,462.92803546997936,730,459.6077257175957,730,600],[730,600,730,459.6077257175957,740,454.43622203437485,740,600],[740,600,740,454.43622203437485,750,447.91974723281544,750,600],[750,600,750,447.91974723281544,760,440.69617926944375,760,600],[760,600,760,440.69617926944375,770,433.47261130607205,770,600],[770,600,770,433.47261130607205,780,426.95613650451264,780,600],[780,600,780,426.95613650451264,790,421.7846328212918,790,600],[790,600,790,421.7846328212918,800,418.46432306890813,800,600]];
var demoPointerSprite = null;

function gameStart() {

   drawHills(false);

   showTitle();
}

function clickStart() {

   score = 0;

   gameState = GAME_STATE_PLAYING;

   // Kickoff the zero-round demo to help players understand the mechanics
   doDemo();

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

   var hillCoordinates, holeFinderIdx = null;

   if (DEMO_MODE) {
      hillCoordinates = demoLevel;
      holeFinderIdx = 40;
   } else {
      hillCoordinates = calcValleys(NUM_VALLEYS, NUM_VALLEY_SLICES);
      holeFinderIdx = Math.round((hillCoordinates.length * 0.5) * Math.random() + (hillCoordinates.length * 0.25));
   }

   // console.log('hillCoordinates: ' + hillCoordinates.length + ' -- max: ' + hillCoordinates[hillCoordinates.length - 1][4]);

   if (showHole) {

      // Randomly place the hole somewhere on the right side of the screen
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
   game.world.bringToTop(demoPointerSprite);
}

function roundStart() {

   remainingBalls = MAX_BALLS;

   updateScore();

   drawHills(true);

   // Set up handlers for mouse events
   if (!DEMO_MODE) {
      game.input.onDown.add(mouseDragStart, this);
   }
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

   // Demo pointer
   demoPointerSprite = game.add.sprite(0, 0, 'demo-pointer', 'default');
   demoPointerSprite.anchor.setTo(0.3, 0.177);
   demoPointerSprite.visible = false;
   demoPointerSprite.alpha = 0.85;
   demoPointerSprite.angle = -35;

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

         if (!DEMO_MODE) {
            score += 1;
         }

         // Demo mode is always only activated until the ball is sunk for the first time
         DEMO_MODE = false;

         gameState = GAME_STATE_BUSY;

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
   if (ballSprite.visible && ballSprite.alive && Math.abs(ballSprite.deltaX) < POSITION_THRESHOLD && Math.abs(ballSprite.deltaY) < POSITION_THRESHOLD) {
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

function getMousePosition() {

   var ret = {};

   if (DEMO_MODE) {
      ret.x = demoPointerSprite.position.x;
      ret.y = demoPointerSprite.position.y;
   } else {
      ret.x = game.input.activePointer.position.x;
      ret.y = game.input.activePointer.position.y;
   }

   return ret;
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

   mouseDownPosition = getMousePosition();

   arrowSprite.reset(shooterBaseSprite.world.x, shooterBaseSprite.world.y);
   arrowSprite.alpha = 0.5;

   updateShooter();

   // Display the aiming indicator
   shooterAngleSprite.reset(shooterBaseSprite.world.x, shooterBaseSprite.world.y);
   shooterAngleSprite.alpha = 1;

   if (!DEMO_MODE) {
      game.input.onUp.add(mouseDragEnd, this);
   }

   remainingBalls -= 1;
   updateScore();
}

function updateShooter() {

   if (!shootingInput) {
      return;
   }
   
   if ( mouseDownPosition == null && !DEMO_MODE)  {
      return;
   }
   
   var mouseNowPosition = getMousePosition();
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

   var mouseNowPosition = getMousePosition();
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

   // Capture the output so we can do things like create demo landscape
   // console.log(JSON.stringify(ret));

   // Return the coordinates we've created
   return ret;
}

function rand(min, max) {
   return min + (Math.random() * (max - min));
}

function randInt(min, max) {
   return Math.round(rand(min, max));
}


var demoMoveIdx = 0;
var demoMoves = [
   [600, 200, false],[600,600, true],[600,400, true],[400, 300, true],[500,450,true],[500,450,false],[800,600,false],[600,200,false],[500,350,true],[500,350,false]
]

function doDemo() {

   DEMO_MODE = true;

   demoMoveIdx = 0;

   // Reset the demo pointer sprite
   demoPointerSprite.frameName = 'default';
   demoPointerSprite.reset(800, 600);
   demoPointerSprite.visible = true;

   doNextDemoMove();
}

function doNextDemoMove() {

   if (demoMoveIdx < demoMoves.length) {

      var move = demoMoves[demoMoveIdx];

      if (move[2]) {
         if (demoPointerSprite.frameName != 'drag') {
            demoPointerSprite.frameName = 'drag';
            mouseDragStart();
         } else {

         }
      } else {
         if (demoPointerSprite.frameName != 'default') {
            demoPointerSprite.frameName = 'default';
            mouseDragEnd();
         }
      }

      demoMove = game.add.tween(demoPointerSprite);
      demoMove.to({x: move[0] , y: move[1]}, 500);
      demoMove.onComplete.add(doNextDemoMove, this);
      demoMove.start();

      demoMoveIdx++;

   // Out of moves - hide the demo pointer.
   } else {

      demoPointerSprite.visible = false;

      // Demo mode is automatically exited when the ball goes in the hole
   }
}
