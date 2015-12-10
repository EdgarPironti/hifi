//cartzone

//
//  recordingEntityScript.js
//  examples/entityScripts
//
//  Created by Alessandro Signa on 11/12/15.
//  Copyright 2015 High Fidelity, Inc.
//

//  All the avatars in the area when the master presses the button will start/stop recording.
//  

//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {
    var CART_MASTER_NAME = "ShopCartZero";
    var SCRIPT_URL = "https://hifi-content.s3.amazonaws.com/alessandro/dev/JS/shopCartEntityScript.js";
    var _this;
    var isOwningACart = false;
    var cartMasterID = null;
    var myCartID = null;


    function SpawnCartZone() {
        _this = this;
        return;
    };



    SpawnCartZone.prototype = {

        preload: function (entityID) {
            this.entityID = entityID;
            var ids = Entities.findEntities(Entities.getEntityProperties(this.entityID).position, 50);
            ids.forEach(function(id) {
                var properties = Entities.getEntityProperties(id);
                if (properties.name == CART_MASTER_NAME) {
                    cartMasterID = id;
                    print("Cart master found");
                }
            });
        },

        enterEntity: function (entityID) {
            print("entering in the spawn cart area");
            if (isOwningACart == false) {
                var entityProperties = Entities.getEntityProperties(cartMasterID);
                
                myCartID = Entities.addEntity({
                    type: entityProperties.type,
                    name: "Shopping cart",
                    ignoreForCollisions: false,
                    collisionsWillMove: false,
                    dimensions: entityProperties.dimensions,
                    modelURL: entityProperties.modelURL,
                    shapeType: entityProperties.shapeType,
                    originalTextures: entityProperties.originalTextures,
                    script: SCRIPT_URL,
                    userData: JSON.stringify({
                        ownerKey: {
                            ownerID: MyAvatar.sessionUUID
                        },
                        grabbableKey: {
                            grabbable: false
                        }
                    })
                });
                isOwningACart = true;
            } else {
                Entities.callEntityMethod(myCartID, "resetCart");
                Entities.deleteEntity (myCartID);
                isOwningACart = false;
            }
            
        },

        leaveEntity: function (entityID) {
            print("leaving the spawn cart area");
        },

        unload: function (entityID) {
           
        }
    }

    return new SpawnCartZone();
});