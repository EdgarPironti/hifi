//
//  toyball.js
//  examples
//
//  Created by Brad Hefta-Gaub on 1/20/14.
//  Copyright 2014 High Fidelity, Inc.
//
//  This is an example script that turns the hydra controllers into a toy ball catch and throw game.
//  It reads the controller, watches for button presses and trigger pulls, and launches entities.
//
//  The entities it creates have a script that when they collide with Voxels, the
//  entity will change it's color to match the voxel it hits.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";

// maybe we should make these constants...
var LEFT_PALM = 0;
var LEFT_TIP = 1;
var LEFT_BUTTON_FWD = 5;
var LEFT_BUTTON_3 = 3;

var RIGHT_PALM = 2;
var RIGHT_TIP = 3;
var RIGHT_BUTTON_FWD = 11;
var RIGHT_BUTTON_3 = 9;

var BALL_RADIUS = 0.08;
var GRAVITY_STRENGTH = 3.0;

var HELD_COLOR = { red: 240, green: 0, blue: 0 };
var THROWN_COLOR = { red: 128, green: 0, blue: 0 };

var averageLinearVelocity = [ { x: 0, y: 0, z : 0 }, { x: 0, y: 0, z : 0 } ];

var LIFETIME_SECONDS = 600;

var BALL_MODEL_URL = "https://hifi-public.s3.amazonaws.com/ryan/baseball4.fbx";

var leftBallAlreadyInHand = false;
var rightBallAlreadyInHand = false;
var leftHandEntity = false;
var rightHandEntity = false;

var newSound = SoundCache.getSound("https://dl.dropboxusercontent.com/u/1864924/hifi-sounds/throw.raw");
var catchSound = SoundCache.getSound("https://dl.dropboxusercontent.com/u/1864924/hifi-sounds/catch.raw");
var throwSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Switches%20and%20sliders/slider%20-%20whoosh1.raw");
var targetRadius = 0.25;


var wantDebugging = false;
function debugPrint(message) {
    if (wantDebugging) {
        print(message);
    }
}

function getBallHoldPosition(whichSide) { 
    if (whichSide == LEFT_PALM) {
        position = MyAvatar.getLeftPalmPosition();
    } else {
        position = MyAvatar.getRightPalmPosition();
    }
    
    return position;
}

function checkControllerSide(whichSide) {
    var BUTTON_FWD;
    var BUTTON_3;
    var TRIGGER;
    var palmPosition;
    var palmRotation;
    var ballAlreadyInHand;
    var handMessage;
    var linearVelocity;
    var angularVelocity; 
    var AVERAGE_FACTOR = 0.33;
    
    if (whichSide == LEFT_PALM) {
        BUTTON_FWD = LEFT_BUTTON_FWD;
        BUTTON_3 = LEFT_BUTTON_3;
        TRIGGER = 0;
        palmPosition = Controller.getSpatialControlPosition(LEFT_PALM);
        palmRotation = Quat.multiply(MyAvatar.orientation, Controller.getSpatialControlRawRotation(LEFT_PALM));
        ballAlreadyInHand = leftBallAlreadyInHand;
        handMessage = "LEFT";
        averageLinearVelocity[0] = Vec3.sum(Vec3.multiply(AVERAGE_FACTOR, Controller.getSpatialControlVelocity(LEFT_TIP)), 
                                            Vec3.multiply(1.0 - AVERAGE_FACTOR, averageLinearVelocity[0]));
        linearVelocity = averageLinearVelocity[0];
        angularVelocity = Vec3.multiplyQbyV(MyAvatar.orientation, Controller.getSpatialControlRawAngularVelocity(LEFT_TIP));
    } else {
        BUTTON_FWD = RIGHT_BUTTON_FWD;
        BUTTON_3 = RIGHT_BUTTON_3;
        TRIGGER = 1;
        palmPosition = Controller.getSpatialControlPosition(RIGHT_PALM);
        palmRotation = Quat.multiply(MyAvatar.orientation, Controller.getSpatialControlRawRotation(RIGHT_PALM));
        ballAlreadyInHand = rightBallAlreadyInHand;
        averageLinearVelocity[1] = Vec3.sum(Vec3.multiply(AVERAGE_FACTOR, Controller.getSpatialControlVelocity(RIGHT_TIP)), 
                                            Vec3.multiply(1.0 - AVERAGE_FACTOR, averageLinearVelocity[1]));
        linearVelocity = averageLinearVelocity[1];
        angularVelocity = Vec3.multiplyQbyV(MyAvatar.orientation, Controller.getSpatialControlRawAngularVelocity(RIGHT_TIP));
        handMessage = "RIGHT";
    }

    var grabButtonPressed = (Controller.isButtonPressed(BUTTON_FWD) || Controller.isButtonPressed(BUTTON_3) || (Controller.getTriggerValue(TRIGGER) > 0.5));

    // If I don't currently have a ball in my hand, then try to catch closest one
    if (!ballAlreadyInHand && grabButtonPressed) {
        var closestEntity = Entities.findClosestEntity(palmPosition, targetRadius);

        if (closestEntity) {
            var foundProperties = Entities.getEntityProperties(closestEntity);
            if (Vec3.length(foundProperties.velocity) > 0.0) {

                debugPrint(handMessage + " - Catching a moving object!");

                if (whichSide == LEFT_PALM) {
                    leftBallAlreadyInHand = true;
                    leftHandEntity = closestEntity;
                } else {
                    rightBallAlreadyInHand = true;
                    rightHandEntity = closestEntity;
                }
                var ballPosition = getBallHoldPosition(whichSide);
                var properties = { position: { x: ballPosition.x, 
                                               y: ballPosition.y, 
                                               z: ballPosition.z },
                                    rotation: palmRotation,
                                    color: HELD_COLOR, 
                                    velocity : { x: 0, y: 0, z: 0}, 
                                    gravity: { x: 0, y: 0, z: 0}
                                    };
                Entities.editEntity(closestEntity, properties);
                
    			Audio.playSound(catchSound, { position: ballPosition });
                
                return; // exit early
            }
        }
    }

    // change ball color logic...
    //
    //if (wasButtonJustPressed()) {
    //    rotateColor();
    //}

    //  If '3' is pressed, and not holding a ball, make a new one
    if (grabButtonPressed && !ballAlreadyInHand) {
        var ballPosition = getBallHoldPosition(whichSide);
        var properties = { 
                type: "Model",
                modelURL: BALL_MODEL_URL,
                position: { x: ballPosition.x, 
                            y: ballPosition.y, 
                            z: ballPosition.z },
                rotation: palmRotation, 
                velocity: { x: 0, y: 0, z: 0}, 
                gravity: { x: 0, y: 0, z: 0}, 
                dimensions: { x: BALL_RADIUS * 2, y: BALL_RADIUS * 2, z: BALL_RADIUS * 2 },
                damping: 0.00001,
                shapeType: "sphere",
                collisionsWillMove: false,
                color: HELD_COLOR,
                lifetime: LIFETIME_SECONDS
            };

        newEntity = Entities.addEntity(properties);
        if (whichSide == LEFT_PALM) {
            leftBallAlreadyInHand = true;
            leftHandEntity = newEntity;
        } else {
            rightBallAlreadyInHand = true;
            rightHandEntity = newEntity;
        }

        // Play a new ball sound
        Audio.playSound(newSound, { position: ballPosition});
        
        return; // exit early
    }

    if (ballAlreadyInHand) {
        if (whichSide == LEFT_PALM) {
            handEntity = leftHandEntity;
            whichTip = LEFT_TIP;
        } else {
            handEntity = rightHandEntity;
            whichTip = RIGHT_TIP;
        }

        //  If holding the ball keep it in the palm
        if (grabButtonPressed) {
            debugPrint(">>>>> " + handMessage + "-BALL IN HAND, grabbing, hold and move");
            var ballPosition = getBallHoldPosition(whichSide);
            var properties = { position: { x: ballPosition.x, 
                                           y: ballPosition.y, 
                                           z: ballPosition.z }, 
                                rotation: palmRotation,
                                velocity: { x: 0, y: 0, z: 0}, 
                                gravity: { x: 0, y: 0, z: 0}, 
                };
            Entities.editEntity(handEntity, properties);
        } else {
            debugPrint(">>>>> " + handMessage + "-BALL IN HAND, not grabbing, THROW!!!");
            //  If toy ball just released, add velocity to it!
            var properties = { 
                    velocity: linearVelocity,
                    rotation: palmRotation,
                    angularVelocity: angularVelocity,
                    collisionsWillMove: true,
                    color: THROWN_COLOR,
                    gravity: { x: 0, y: -GRAVITY_STRENGTH, z: 0}, 
                };

            Entities.editEntity(handEntity, properties);

            if (whichSide == LEFT_PALM) {
                leftBallAlreadyInHand = false;
                leftHandEntity = false;
            } else {
                rightBallAlreadyInHand = false;
                rightHandEntity = false;
            }

            Audio.playSound(throwSound, { position: ballPosition });
        }
    }
}


function checkController(deltaTime) {
    var numberOfButtons = Controller.getNumberOfButtons();
    var numberOfTriggers = Controller.getNumberOfTriggers();
    var numberOfSpatialControls = Controller.getNumberOfSpatialControls();
    var controllersPerTrigger = numberOfSpatialControls / numberOfTriggers;

    // this is expected for hydras
    if (!(numberOfButtons==12 && numberOfTriggers == 2 && controllersPerTrigger == 2)) {
        debugPrint("total buttons = " + numberOfButtons + ", Triggers = " + numberOfTriggers + ", controllers/trigger = " + controllersPerTrigger); 
        return; // bail if no hydra
    }

    checkControllerSide(LEFT_PALM);
    checkControllerSide(RIGHT_PALM);
}


// register the call back so it fires before each data send
Script.update.connect(checkController);
