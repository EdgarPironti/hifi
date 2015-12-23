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
    var CART_SCRIPT_URL = Script.resolvePath("shopCartEntityScript.js");
    var SHOP_GRAB_SCRIPT_URL = Script.resolvePath("../item/shopItemGrab.js");
    var SHOP_GRAB_CHANNEL = "Hifi-vrShop-Grab";
    var _this;
    var isOwningACart = false;
    var cartMasterID = null;
    var myCartID = null;


    function SpawnCartZone() {
        _this = this;
        return;
    };
    
    function isScriptRunning(script) {
        script = script.toLowerCase().trim();
        var runningScripts = ScriptDiscoveryService.getRunning();
        for (i in runningScripts) {
            if (runningScripts[i].url.toLowerCase().trim() == script) {
                return true;
            }
        }
        return false;
    };



    SpawnCartZone.prototype = {

        preload: function (entityID) {
            this.entityID = entityID;
            var ids = Entities.findEntities(Entities.getEntityProperties(this.entityID).position, 50);
            ids.forEach(function(id) {
                var properties = Entities.getEntityProperties(id);
                if (properties.name == CART_MASTER_NAME) {
                    cartMasterID = id;
                    print("Master Cart found");
                    return;
                }
            });
        },

        enterEntity: function (entityID) {
            print("entering in the spawn cart area");
            
            if (!isScriptRunning(SHOP_GRAB_SCRIPT_URL)) {
                print("Loading grab script");
                Script.load(SHOP_GRAB_SCRIPT_URL);
            }
            
            var entityProperties = Entities.getEntityProperties(cartMasterID);
            myCartID = Entities.addEntity({
                type: entityProperties.type,
                name: "Shopping cart",
                ignoreForCollisions: false,
                collisionsWillMove: false,
                position: entityProperties.position,
                dimensions: entityProperties.dimensions,
                modelURL: entityProperties.modelURL,
                shapeType: entityProperties.shapeType,
                originalTextures: entityProperties.originalTextures,
                script: CART_SCRIPT_URL,
                userData: JSON.stringify({
                    ownerKey: {
                        ownerID: MyAvatar.sessionUUID
                    },
                    grabbableKey: {
                        grabbable: false
                    }
                })
            });
        },

        leaveEntity: function (entityID) {
            print("leaving the spawn cart area");
            Entities.callEntityMethod(myCartID, "resetCart");
            Entities.deleteEntity (myCartID);
            Messages.sendMessage(SHOP_GRAB_CHANNEL, null);      //signal to shopItemGrab that it has to kill itself
        },

        unload: function (entityID) {
           
        }
    }

    return new SpawnCartZone();
});