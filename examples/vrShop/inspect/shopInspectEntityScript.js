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
    //we're at hifi\examples\vrShop\inspect\
    
    var HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";
    // Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/utils.js");
    // Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/overlayManager.js");
    //Script.include("C:\\Users\\Proprietario\\Desktop\\overlayManager.js");    //doesn't work
    //Script.include('../libraries/overlayManager.js'); //doesn't work
    //Script.include("http://s3.amazonaws.com/hifi-content/alessandro/dev/JS/libraries/overlayManager.js");
    var utilitiesScript = Script.resolvePath("../../libraries/utils.js");
    var overlayManagerScript = Script.resolvePath("../../libraries/overlayManager.js");
    Script.include(utilitiesScript);
    Script.include(overlayManagerScript);
    
    //var BROWN_ICON_URL = "http://cdn.highfidelity.com/alan/production/icons/ICO_rec-active.svg";
    var BROWN_ICON_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/UI_Brown.svg";
    var RED_ICON_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/UI_Red.svg";
    var BLACK_ICON_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/UI_Black.svg";
    
    var ICONS = [
        BROWN_ICON_URL,
        RED_ICON_URL,
        BLACK_ICON_URL
    ];
    
    var POINTER_ICON_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/Pointer.png";
    
    var MIN_DIMENSION_THRESHOLD = null;
    var IN_HAND_STATUS = "inHand";
    var IN_INSPECT_STATUS = "inInspect";
    
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
    var inspecting = false;
    var isUIWorking = false;
    var inspectingMyItem = false;
    var waitingForBumpReleased = false;
    var rightController = null;     //rightController and leftController are two objects
    var leftController = null;
    var zoneID = null;
    var inspectedEntityID = null;
    
    var newPosition = null;
    var newRotation = null;
    
    var mainPanel = null;
    var buttons = [];

    
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
            this.bumper = Controller.Standard.RB;
        } else {
            this.getHandPosition = MyAvatar.getLeftPalmPosition;
            this.getHandRotation = MyAvatar.getLeftPalmRotation;
            this.bumper = Controller.Standard.LB;
        }
        
        this.pickRay = null;        // ray object
        this.overlayLine = null;    // id of line overlay
        this.waitingForBumpReleased = false;
        
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
        
        this.updateRay = function() {
            //update the ray object
            this.pickRay = {
               origin: this.getHandPosition(),
               direction: Quat.getUp(this.getHandRotation())
            };
            //update the ray overlay and the pointer
            var intersection = OverlayManager.renderPointer(this.pickRay);
            var farPoint = intersection == null ? Vec3.sum(this.pickRay.origin, Vec3.multiply(this.pickRay.direction, LINE_LENGTH)) : intersection;
            this.overlayLineOn(this.pickRay.origin, farPoint, COLOR);
            
        },
        //the update of each hand has to update the ray belonging to that hand and handle the bumper event
        this.updateHand = function() {
            
            this.updateRay();
            
            //detect the bumper event
            //manage event on UI
            var bumperPressed = Controller.getValue(this.bumper);
            if (bumperPressed && !this.waitingForBumpReleased) {
                this.waitingForBumpReleased = true;
                var triggeredButton = OverlayManager.findOnRay(this.pickRay);
                if (triggeredButton != null) {
                    //search the index of the UI element triggered
                    for (var i = 0; i < buttons.length; i++) {
                        if (buttons[i] == triggeredButton) {
                            var dataJSON = {
                                index: i
                            };
                            var dataArray = [JSON.stringify(dataJSON)];
                            
                            //Entities.callEntityMethod(inspectedEntityID, 'changeModel', dataArray);
                            print("ChangeColor by ID: " + i);
                        }
                    }
                }
            } else if (!bumperPressed && this.waitingForBumpReleased) {
                this.waitingForBumpReleased = false;
            }
        },
        
        this.clean = function() {
            this.pickRay = null;
            this.overlayLine.destroy();
        }
    };
    
    function update(deltaTime) {
        //the if condition should depend from other stuff
        if (inspecting) {
            //update the rays from both hands
            leftController.updateHand();
            rightController.updateHand();
            
            //check the item status for consistency
            var entityStatus = getEntityCustomData('statusKey', inspectedEntityID, null).status;
            if (entityStatus == IN_HAND_STATUS) {
                //the inspection is over
                inspecting = false;
                inspectedEntityID = null;
            }
        } else if (isUIWorking) {
            //clean all the UI stuff
            // Destroy rays
            leftController.clean();
            rightController.clean();
            // Destroy overlay
            mainPanel.destroy();
            isUIWorking = false;
        }
        
        _this.positionRotationUpdate();
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
            //print("------- The owner of the item is: " + ((itemOwnerObj == null) ? itemOwnerObj : itemOwnerObj.ownerID));
            //print("item ID: " + data.id);
            
            var inspectOwnerObj = getEntityCustomData('ownerKey', this.entityID, null);
            //print("------- The owner of the inspectZone is: " + ((inspectOwnerObj == null) ? inspectOwnerObj : inspectOwnerObj.ownerID));
            //print("zone ID: " + this.entityID);
            
            if (inspectOwnerObj == null) {
                //print("The inspectZone doesn't have a owner.");
                Entities.deleteEntity(data.id);
            }
            
            if (itemOwnerObj.ownerID === inspectOwnerObj.ownerID) {
                //setup the things for inspecting the item
                inspecting = true;
                inspectedEntityID = data.id;        //store the ID of the inspected entity
                setEntityCustomData('statusKey', data.id, {
                    status: IN_INSPECT_STATUS
                });
                //print("Set status!");
                
                _this.createInspectUI();
                
                Entities.editEntity(_this.entityID, { visible: false });
                
            } else {
                //print("Not your inspect zone!");
                Entities.deleteEntity(data.id);
            }
        },
        
        positionRotationUpdate: function() {
            //position
            newPosition = Vec3.sum(Camera.position, Vec3.multiply(Quat.getFront(Camera.getOrientation()), inspectRadius)); 
            Entities.editEntity(_this.entityID, { position: newPosition });
            
            newRotation = Camera.getOrientation(); 
            Entities.editEntity(_this.entityID, { rotation: newRotation });
        },
        
        createInspectUI : function() {
            //print ("Creating UI");
            
            //set the main panel to follow the inspect entity
            mainPanel = new OverlayPanel({
                anchorPositionBinding: { entity: _this.entityID },
                isFacingAvatar: true
            });
            
            var offsetPositionY = 0.2;
            var offsetPositionX = -0.4;
            
            for (var i = 0; i < ICONS.length; i++) {
                //print("creating button " + ICONS[i]);
                buttons[i] = new Image3DOverlay({
                    url: ICONS[i],
                    dimensions: {
                        x: 0.15,
                        y: 0.15
                    },
                    isFacingAvatar: false,
                    alpha: 1,
                    ignoreRayIntersection: false,
                    offsetPosition: {
                        x: offsetPositionX,
                        y: offsetPositionY - (i * offsetPositionY),
                        z: 0
                    },
                });
                
                mainPanel.addChild(buttons[i]);
            }
            
            OverlayManager.setPointer(new Image3DOverlay({
                url: POINTER_ICON_URL,
                dimensions: {
                    x: 0.015,
                    y: 0.015
                },
                alpha: 1,
            }));
            
            isUIWorking = true;
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
                //print("------- The entity in the inspect zone is: " + ((itemObj == null) ? itemObj : itemObj.itemID));
                
                if (itemObj != null) {
                    if (itemObj.itemID == otherID) {
                        // change overlay color
                        //print("Going to call the change color to red");
                        Entities.callEntityMethod(otherID, 'changeOverlayColor', null);
                    }
                }
            } else if (penetrationValue < PENETRATION_THRESHOLD && zoneID !== null) {
                zoneID = null;
                //print("Zone: " + zoneID);
                //print("Going to call the change color to green");
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