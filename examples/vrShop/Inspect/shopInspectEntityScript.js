//
//  detectGrabExample.js
//  examples/entityScripts
//
//  Created by Brad Hefta-Gaub on 9/3/15.
//  Copyright 2015 High Fidelity, Inc.
//
//  This is an example of an entity script which when assigned to an entity, will detect when the entity is being grabbed by the hydraGrab script
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function() {
    var HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";
    Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/utils.js");
    
    var MIN_DIMENSION_THRESHOLD = null;
    
    var RIGHT_HAND = 1;
    var LEFT_HAND = 0;
    
    var LINE_LENGTH = 100;
    var COLOR = {
        red: 10,
        green: 10,
        blue: 255
    };
    
    var COMFORT_ARM_LENGTH = 0.5;
    
    var PENETRATION_THRESHOLD = 0.2;

    var _this;
    var startInspecting = false;
    var handsCastRays = false;
    var inspectingMyItem = false;
    var waitingForBumpReleased = false;
    var rightController = null;     //rightController and leftController are two objects
    var leftController = null;
    var zoneID = null;
    
    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    InspectEntity = function() {
         _this = this;
    };
    

    function MyController(hand) {
        print("created hand: " + hand);
        this.hand = hand;
        if (this.hand === RIGHT_HAND) {
            this.getHandPosition = MyAvatar.getRightPalmPosition;
            this.getHandRotation = MyAvatar.getRightPalmRotation;
        } else {
            this.getHandPosition = MyAvatar.getLeftPalmPosition;
            this.getHandRotation = MyAvatar.getLeftPalmRotation;
        }
        
        this.pickRay = null;        // ray object
        this.overlayLine = null;    // id of line overlay
        
        this.overlayLineOn = function(closePoint, farPoint, color) {
            if (this.overlayLine == null) {
                var lineProperties = {
                    lineWidth: 5,
                    start: closePoint,
                    end: farPoint,
                    color: color,
                    ignoreRayIntersection: true, // ??
                    visible: true,
                    alpha: 1
                };
                this.overlayLine = new Line3DOverlay(lineProperties);
            } else {
               this.overlayLine.start = closePoint;
               this.overlayLine.end = farPoint;
           }
        },
        
        //the update of each hand has to update the ray belonging to that hand
        this.updateHand = function() {
            this.pickRay = {
               origin: this.getHandPosition(),
               direction: Quat.getUp(this.getHandRotation())
            };
            this.overlayLineOn(this.pickRay.origin, Vec3.sum(this.pickRay.origin, Vec3.multiply(this.pickRay.direction, LINE_LENGTH)), COLOR);
        },
        
        this.clean = function() {
            this.pickRay = null;
            //Overlays.deleteOverlay(this.overlayLine);
            this.overlayLine.destroy();
        }
    };
    
    function update(deltaTime) {
        
        //the if condition should depend from other stuff
        if (startInspecting) {
            //update the rays from both hands
            leftController.updateHand();
            rightController.updateHand();
            
            if (!handsCastRays) {
                handsCastRays = true;
            }

            //manage event on UI
            var bumperPressed = Controller.getValue(Controller.Standard.RB);
            if (bumperPressed && !waitingForBumpReleased) {
                print("BUMPER PRESSED");
                waitingForBumpReleased = true;
            } else if (!bumperPressed && waitingForBumpReleased) {
                print("BUMPER RELEASED");
                waitingForBumpReleased = false;
            }
        } else if (handsCastRays) {
            leftController.clean();
            rightController.clean();
            handsCastRays = false;
        }
        
        _this.positionUpdate();
    };

    InspectEntity.prototype = {
        
        preload: function(entityID) {
            this.entityID = entityID;
            print("PRELOAD INSPECT ENTITY");
            //get the owner ID from user data and compare to the mine
            //the update will be connected just for the owner
            var ownerObj = getEntityCustomData('ownerKey', this.entityID, null);
            if (ownerObj.ownerID === MyAvatar.sessionUUID) {
                rightController = new MyController(RIGHT_HAND);     //rightController and leftController are two objects
                leftController = new MyController(LEFT_HAND);
                inspectingMyItem = true;
                inspectRadius = (Entities.getEntityProperties(_this.entityID).dimensions.x) / 2 + COMFORT_ARM_LENGTH;
                Script.update.connect(update);
            }
        },
        
        doSomething: function (entityID, dataArray) {
            var data = JSON.parse(dataArray[0]);
            var itemOwnerObj = getEntityCustomData('ownerKey', data.id, null);
            print("------- The owner of the item is: " + ((itemOwnerObj == null) ? itemOwnerObj : itemOwnerObj.ownerID));
            print("item ID: " + data.id);
            
            var inspectOwnerObj = getEntityCustomData('ownerKey', this.entityID, null);
            print("------- The owner of the inspectZone is: " + ((inspectOwnerObj == null) ? inspectOwnerObj : inspectOwnerObj.ownerID));
            print("zone ID: " + this.entityID);
            
            if (inspectOwnerObj == null) {
                print("The inspectZone doesn't have a owner.");
                Entities.deleteEntity(data.id);
            }
            
            if (itemOwnerObj.ownerID === inspectOwnerObj.ownerID) {
                startInspecting = true;
                
                setEntityCustomData('statusKey', data.id, {
                    status: "inspect"
                });
                
                print("Set status!");
                
                Entities.editEntity(_this.entityID, { visible: false });
                
            } else {
                print("Not your inspect zone!");
                Entities.deleteEntity(data.id);
            }
        },
        
        positionUpdate: function() {
            //position
            newPosition = Vec3.sum(Camera.position, Vec3.multiply(Quat.getFront(Camera.getOrientation()), inspectRadius)); 
                    
            Entities.editEntity(_this.entityID, { position: newPosition });
        },
        
        collisionWithEntity: function(myID, otherID, collisionInfo) {
            //print("SHOE COLLISION: " + collisionInfo.penetration.x + " - " + collisionInfo.penetration.y + " - " + collisionInfo.penetration.z);
            //var penetrationValue = collisionInfo.penetration.x + collisionInfo.penetration.y + collisionInfo.penetration.z;
            var penetrationValue = Vec3.length(collisionInfo.penetration);
            //print("Value: " +  penetrationValue);
            if (penetrationValue > PENETRATION_THRESHOLD && zoneID === null) {
                zoneID = otherID;
                print("Zone: " + zoneID);
                
                var itemObj = getEntityCustomData('itemKey', this.entityID, null);
                print("------- The entity in the inspect zone is: " + ((itemObj == null) ? itemObj : itemObj.itemID));
                
                if (itemObj != null) {
                    if (itemObj.itemID == otherID) {
                        // change overlay color
                        print("Going to call the change color to red");
                        Entities.callEntityMethod(otherID, 'changeOverlayColor', null);
                    }
                }
            } else if (penetrationValue < PENETRATION_THRESHOLD && zoneID !== null) {
                zoneID = null;
                print("Zone: " + zoneID);
                print("Going to call the change color to green");
                Entities.callEntityMethod(otherID, 'changeOverlayColor', null);
            }
        },
        
        unload: function (entityID) {
            if(inspectingMyItem){
                print("UNLOAD INSPECT ENTITY");
                Script.update.disconnect(update);
                
                // clean UI
                Entities.deleteEntity(_this.entityID);
            }
        }
    };
    return new InspectEntity();
})