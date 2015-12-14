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
    Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/overlayManager.js");
    //Script.include("C:\\Users\\Proprietario\\Desktop\\overlayManager.js");
    //Script.include('../libraries/overlayManager.js'); //doesn't work
    //Script.include("http://s3.amazonaws.com/hifi-content/alessandro/dev/JS/libraries/overlayManager.js");
    //Script.include("http://s3.amazonaws.com/hifi-public/scripts/libraries/overlayManager.js");
    
    
    
    var TOOL_ICON_URL = HIFI_PUBLIC_BUCKET + "images/tools/";
    var RED_IMAGE_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/inspRED.png";
    var GREEN_IMAGE_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/inspGREEN.png";
    var MIN_DIMENSION_THRESHOLD = null;
    var MAX_DIMENSION_THRESHOLD = null;
    var PENETRATION_THRESHOLD = 0.2;
    var MAPPING_NAME = "controllerMapping_Inspection";

    var _this;
    var hand;
    var onShelf = true;
    var inspecting = false;
    var inCart = false;
    var overlayInspectRed = true;
    var zoneID = null;
    var newPosition;
    var originalDimensions = null;
    var deltaLX = 0;
    var deltaLY = 0;
    var deltaRX = 0;
    var deltaRY = 0;
    var availabilityNumber = 0; // FIXME we won't need this anymore
    var radius;
    var inspectingEntity = null;
    var inspectPanel = null;
    var background = null;
    var modelURLsArray = [];

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
    
            MIN_DIMENSION_THRESHOLD = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions)/2;
            MAX_DIMENSION_THRESHOLD = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions)*2;
            radius = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions) / 2.0;
            //inspectRadius = Vec3.length(Entities.getEntityProperties(this.entityID).dimensions) / 2.0; //??
            
        },
        
        setRightHand: function () {
            //print("I am being held in a right hand... entity:" + this.entityID);
            hand = MyAvatar.rightHandPose;
        },
        
        setLeftHand: function () {
            //print("I am being held in a left hand... entity:" + this.entityID);
            hand = MyAvatar.leftHandPose;
        },
        
        createInspectOverlay: function (entityBindID) {
            //print ("Creating overlay");
            inspectPanel = new OverlayPanel({
                anchorPositionBinding: { entity: entityBindID },
                //anchorRotationBinding: { entity: entityBindID },
                //offsetPosition: { x: 0, y: 0, z: 0 },
                isFacingAvatar: true
            });
            
            background = new Image3DOverlay({
                url: RED_IMAGE_URL,
                dimensions: {
                    x: 0.6,
                    y: 0.6,
                },
                isFacingAvatar: false,
                alpha: 1,
                ignoreRayIntersection: false,
                offsetPosition: {
                    x: 0,
                    y: 0,
                    z: 0
                },
            });
            
            inspectPanel.addChild(background);
            
            //print ("Overlay created"); 
            
            // backgroundGREEN = new Image3DOverlay({
                // url: GREEN_IMAGE_URL,
                // dimensions: {
                    // x: 0.5,
                    // y: 0.5,
                // },
                // isFacingAvatar: false,
                // alpha: 0.8,
                // ignoreRayIntersection: false,
                // offsetPosition: {
                    // x: 0,
                    // y: 0,
                    // z: -0.001
                // },
                // visible: false
            // });
            
            // inspectPanel.addChild(backgroundGREEN);
        },
        
        changeOverlayColor: function () {
            if (overlayInspectRed) {
                //print ("Change color of overlay to green");
                overlayInspectRed = false;
                //background.dimensions = Vec3.sum(background.dimension, { x: 1, y: 1, z: 1 });
                // backgroundRED.visible = overlayInspectRed;
                // backgroundGREEN.visible = !overlayInspectRed;
                background.url = GREEN_IMAGE_URL;
            } else {
                //print ("Change color of overlay to red");
                overlayInspectRed = true;
                //background.dimensions = Vec3.sum(background.dimension, { x: 1, y: 1, z: 1 });
                // backgroundRED.visible = overlayInspectRed;
                // backgroundGREEN.visible = !overlayInspectRed;
                background.url = RED_IMAGE_URL;
            }
        },
        
        startNearGrab: function () {
            
            print("I was just grabbed... entity:" + this.entityID);
            Entities.editEntity(this.entityID, { ignoreForCollisions: false });
            Entities.editEntity(this.entityID, { dimensions: originalDimensions });
            
            // Everytime we grab, we create the inspectEntity and the inspectAreaOverlay in front of the avatar
            
        
            if(!inspecting) {
                var entityProperties = Entities.getEntityProperties(this.entityID);
                
                inspectingEntity = Entities.addEntity({
                    type: "Box",
                    name: "inspectionEntity",
                    //position: Vec3.sum(Camera.position, Vec3.multiply(Quat.getFront(Camera.getOrientation()), inspectRadius * 3.0)), // maybe we can avoid to set this here
                    dimensions: {x: 0.5, y: 0.5, z: 0.5}, //??
                    //rotation: entityProperties.rotation,
                    collisionsWillMove: false,
                    ignoreForCollisions: false,
                    visible: false,
                    script: "C://Users//microtel//Desktop//shopInspectEntityScript.js", // I don't know, ask desktop
                    userData: JSON.stringify({
                        ownerKey: {
                            ownerID: MyAvatar.sessionUUID
                        },
                        itemKey: {
                            itemID: this.entityID
                        },
                        grabbableKey: {
                            grabbable: false
                        }
                    })
                });
            }
            
             _this.createInspectOverlay(inspectingEntity);
            //print("Got after the creation!");
            
            if (inspecting === true) {
                inspecting = false;
                //deletentityforinspecting
                Controller.disableMapping(MAPPING_NAME);
                setEntityCustomData('statusKey', this.entityID, {
                    status: "inHand"
                });
            } else if (onShelf === true) {
                //create a copy of this entity if it is the first grab
                var entityProperties = Entities.getEntityProperties(this.entityID);
                
                var entityOnShelf = Entities.addEntity({
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
                
                var i = 0;
                
                //Retrieve the url from the userData
                //var url = getEntityCustomData('jsonKey', this.entityID, null);
                // FIXME: delete this
                var url = "atp://72b465bed68ad9d82dc99aba9d8c2f66e451ee90ed60ac89cef49cfad3efc7a9.txt";
                
                
                // For now we have to paste statically the availabilityNumber in the userData, with this: {"jsonKey":{"availability":4}}
                var availabilityNumberObj = getEntityCustomData('jsonKey', this.entityID, null);
                availabilityNumber = availabilityNumberObj.availability;
                
                //This should happen in the saveJSON.js and refreshed for the item on the shelf
                // FIXME: delete this
                setEntityCustomData('jsonKey', this.entityID, {
                    availability: availabilityNumber - 1
                });
                // FIXME: delete this
                setEntityCustomData('jsonKey', entityOnShelf, {
                    availability: availabilityNumber - 1
                });
                
                Assets.downloadData(url, function (data) {
                    print("data downloaded from:" + url);
                    //printPerformanceJSON(JSON.parse(data));
                    var obj = JSON.parse(data);
                    var modelURLs = obj.modelURLs;
                    
                    var dataJSON = {
                                description: obj.itemDescription
                    };
                            
                    var dataArray = [JSON.stringify(dataJSON)];
                    
                    // provide this info to shopInspectEntityScript
                    Entities.callEntityMethod(inspectingEntity, 'setInspectInfo', dataArray);
                
                    modelURLs.forEach(function(param) {
                        modelURLsArray[i] = param;
                        print("url obtained: " + modelURLsArray[i]);
                        i++;
                    });
                });
            } else if (inCart === true) {
                print("GOT IN inCart BRANCH");
                inCart = false;
                setEntityCustomData('statusKey', this.entityID, {
                    status: "inHand"
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
            
            // Destroy overlay
            inspectPanel.destroy();
            
            if (zoneID !== null) {
                
                print("Got here. Entity ID is: " + this.entityID);
                //Entities.callEntityMethod(zoneID, 'doSomething', this.entityID);
                var dataJSON = {
                    id: this.entityID
                };
                var dataArray = [JSON.stringify(dataJSON)];
                Entities.callEntityMethod(zoneID, 'doSomething', dataArray);
                
                var statusObj = getEntityCustomData('statusKey', this.entityID, null);
                
                //print("ZONE ID NOT NULL AND STATUS IS: " + statusObj.status);
                
                if (statusObj.status == "inInspect") { // if I'm releasing in the inspectZone
                    inspecting = true;
                    print("released inside the inspection area");
                    
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
                } else if (statusObj.status == "inCart") { // in cart
                    Entities.deleteEntity(inspectingEntity);
                    print("inCart is TRUE");
                    inCart = true;
                } else { // any other zone
                    Entities.deleteEntity(inspectingEntity);
                }
                
            } else { // ZoneID is null, released somewhere that is not a zone
                Entities.deleteEntity(inspectingEntity);
                Entities.deleteEntity(this.entityID);
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
        
        changeModel: function(entityID, dataArray) {
            // Change model of the entity
            //print("Attempting to change model by: " + dataArray[0]);
            var data = JSON.parse(dataArray[0]);
            var index = data.index;
            var entityProperties = Entities.getEntityProperties(this.entityID);
            //print("-------------  Changing the model from " + entityProperties.modelURL + " to: " + modelURLsArray[index]);
            Entities.editEntity(this.entityID, { modelURL: modelURLsArray[index] }); // ????????
        },
        
        
        unload: function (entityID) {
            Script.update.disconnect(update);
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new DetectGrabbed();
})