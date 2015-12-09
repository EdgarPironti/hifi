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
    HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";
    Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/utils.js");

    var _this;
    var hand;
    var onShelf = true;
    var inspecting = false;
    var inCart = false;
    var zoneID = null;
    var newPosition;
    var originalDimensions = null;
    var deltaLX = 0;
    var deltaLY = 0;
    var deltaRX = 0;
    var deltaRY = 0;
    var radius;
    var inspectingEntity = null;
    
    var MIN_DIMENSION_THRESHOLD = null;
    var MAX_DIMENSION_THRESHOLD = null;
    var PENETRATION_THRESHOLD = 0.2;
    var MAPPING_NAME = "controllerMapping_Inspection";

    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    DetectGrabbed = function() { 
         _this = this;
    };
    
    function update(deltaTime) {
        if(inspecting){
            _this.orientationPositionUpdate();
        }
    };
    

    DetectGrabbed.prototype = {

        // preload() will be called when the entity has become visible (or known) to the interface
        // it gives us a chance to set our local JavaScript object up. In this case it means:
        //   * remembering our entityID, so we can access it in cases where we're called without an entityID
        //   * connecting to the update signal so we can check our grabbed state
        preload: function(entityID) {
            this.entityID = entityID;
            Script.update.connect(update);
        },
        
        setRightHand: function () {
            //print("I am being held in a right hand... entity:" + this.entityID);
            hand = MyAvatar.rightHandPose;
        },
        
        setLeftHand: function () {
            //print("I am being held in a left hand... entity:" + this.entityID);
            hand = MyAvatar.leftHandPose;
        },
        
        startNearGrab: function () {
            
            print("I was just grabbed... entity:" + this.entityID);
            Entities.editEntity(this.entityID, { ignoreForCollisions: false });
            Entities.editEntity(this.entityID, { dimensions: originalDimensions });
            if (inspecting) {
                inspecting = false;
                //deletentityforinspecting
                Entities.deleteEntity(inspectingEntity);
                Controller.disableMapping(MAPPING_NAME);
            } else if (onShelf === true) {
                //create a copy of this entity if it is the first grab
                var entityProperties = Entities.getEntityProperties(this.entityID);
                
                Entities.addEntity({
                    type: entityProperties.type,
                    name: entityProperties.name,
                    position: entityProperties.position,
                    dimensions: entityProperties.dimensions,
                    rotation: entityProperties.rotation,
                    collisionsWillMove: false,
                    ignoreForCollisions: true,
                    modelURL: entityProperties.modelURL,
                    shapeType: entityProperties.shapeType,
                    originalTextures: entityProperties.originalTextures,
                    script: entityProperties.script,
                });
                
                onShelf = false;
                setEntityCustomData('ownerKey', this.entityID, {
                    ownerID: MyAvatar.sessionUUID
                });
                originalDimensions = entityProperties.dimensions;
            } else if (inCart === true) {
                print("GOT IN inCart BRANCH");
                inCart = false;
                setEntityCustomData('statusKey', this.entityID, {
                    status: "null"
                });
                var dataJSON = {
                    id: this.entityID
                };
                var dataArray = [JSON.stringify(dataJSON)];
                print("Going to refresh!");
                Entities.callEntityMethod(zoneID, 'refreshCartContent', dataArray);
            }
        },
        
        continueNearGrab: function () {
            //print("I am still being grabbed... entity:" + this.entityID);
        },

        releaseGrab: function () {
            
            print("I was released... entity:" + this.entityID);
            Entities.editEntity(this.entityID, { ignoreForCollisions: true });
            print("zoneID is " + zoneID);
            
            if (zoneID !== null) {
                print("Got here. Entity ID is: " + this.entityID);
                //Entities.callEntityMethod(zoneID, 'doSomething', this.entityID);
                var dataJSON = {
                    id: this.entityID
                };
                var dataArray = [JSON.stringify(dataJSON)];
                Entities.callEntityMethod(zoneID, 'doSomething', dataArray);
                
                var statusObj = getEntityCustomData('statusKey', this.entityID, null);
                
                if (statusObj.status == "inCart") {
                    print("inCart is TRUE");
                    inCart = true;
                }
            } else {
                var itemY = Entities.getEntityProperties(this.entityID).position.y;
                var inspectionAreaThreshold = MyAvatar.position.y + ((MyAvatar.getHeadPosition().y - MyAvatar.position.y) / 2);
                
                if (itemY >= inspectionAreaThreshold) {
                    inspecting = true;
                    print("released inside the inspection area");
                    
                    MIN_DIMENSION_THRESHOLD = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions)/2;
                    MAX_DIMENSION_THRESHOLD = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions)*2;
                    radius = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions) / 2.0;
                    // newPosition = Vec3.sum(Camera.position, Vec3.multiply(Quat.getFront(Camera.getOrientation()), radius * 3.0)); // we need to tune this because we don't want it in the center but on the left
                    
                    
                    var mapping = Controller.newMapping(MAPPING_NAME);
                    mapping.from(Controller.Standard.LX).to(function (value) {
                        deltaLX = value;
                    });
                    mapping.from(Controller.Standard.LY).to(function (value) {
                        deltaLY = value;
                    });
                    mapping.from(Controller.Standard.RX).to(function (value) {
                        deltaRX = value;
                    });
                    mapping.from(Controller.Standard.RY).to(function (value) {
                        deltaRY = value;
                    });
                    Controller.enableMapping(MAPPING_NAME);
                    
                    var entityProperties = Entities.getEntityProperties(this.entityID);
                
                    inspectingEntity = Entities.addEntity({
                        type: "Box",
                        name: "inspectionEntity",
                        position: entityProperties.position,
                        dimensions: entityProperties.dimensions,
                        rotation: entityProperties.rotation,
                        collisionsWillMove: false,
                        ignoreForCollisions: true,
                        visible: false,
                        script: "C:\\Users\\Proprietario\\Desktop\\shopInspectionEntityScript.js", // I don't know, ask desktop
                        userData: JSON.stringify({
                            ownerKey: {
                                ownerID: MyAvatar.sessionUUID
                            },
                            itemKey: {
                                itemID: this.entityID
                            }
                        })
                    });
                    
                } else {
                    Entities.deleteEntity(this.entityID);
                }
            }
        
        },

        collisionWithEntity: function(myID, otherID, collisionInfo) {
            //print("SHOE COLLISION: " + collisionInfo.penetration.x + " - " + collisionInfo.penetration.y + " - " + collisionInfo.penetration.z);
            //var penetrationValue = collisionInfo.penetration.x + collisionInfo.penetration.y + collisionInfo.penetration.z;
            var penetrationValue = Vec3.length(collisionInfo.penetration);
            //print("Value: " +  penetrationValue);
            if (penetrationValue > PENETRATION_THRESHOLD && zoneID === null) {
                zoneID = otherID;
                print("Zone: " + zoneID);
            } else if (penetrationValue < PENETRATION_THRESHOLD && zoneID !== null) {
                zoneID = null;
                print("Zone: " + zoneID);
            }
        },
        
        orientationPositionUpdate: function() {
            //position
            //var radius = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions) / 2.0;
            //newPosition = Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiply(Quat.getFront(MyAvatar.orientation), radius * 3.0)); // we need to tune this because we don't want it in the center but on the left
            newPosition = Vec3.sum(Camera.position, Vec3.multiply(Quat.getFront(Camera.getOrientation()), radius * 3.0)); // we need to tune this because we don't want it in the center but on the left
                    
            Entities.editEntity(_this.entityID, { position: newPosition });
            //orientation
            var newRotation = Quat.multiply(Entities.getEntityProperties(_this.entityID).rotation, Quat.fromPitchYawRollDegrees(deltaLY*10, deltaLX*10, 0))
            Entities.editEntity(_this.entityID, { rotation: newRotation });
            //zoom
            var oldDimension = Entities.getEntityProperties(_this.entityID).dimensions;
            var scaleFactor = (deltaRY * 0.1) + 1;
            if (!((Vec3.length(oldDimension) < MIN_DIMENSION_THRESHOLD && scaleFactor < 1) || (Vec3.length(oldDimension) > MAX_DIMENSION_THRESHOLD && scaleFactor > 1))) {
                var newDimension = Vec3.multiply(oldDimension, scaleFactor);
                Entities.editEntity(_this.entityID, { dimensions: newDimension });
            }
        },
        
        unload: function (entityID) {
            Script.update.disconnect(update);
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new DetectGrabbed();
})