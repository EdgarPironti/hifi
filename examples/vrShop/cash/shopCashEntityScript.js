//cashzone

(function () {
    var _this;
    
    var AGENT_PLAYBACK_CHANNEL = "playbackChannel";
    var PLAY_MESSAGE = "Play";
    var REGISTER_NAME = "CashRegister";
    var CARD_ANGULAR_VELOCITY = {x: 0, y: 2, z: 0};
    var CARD_POSITION_OFFSET = {x: 0, y: 0.5, z: 0};
    var CARD_INITIAL_ORIENTATION = {x: 0, y: 0, z: 40};
    var CARD_DIMENSIONS = {x: 0.02, y: 0.09, z: 0.15};
    var SCRIPT_URL = Script.resolvePath("shopCreditCardEntityScript.js");
    
    var cashRegisterID = null;
    var cardID = null;
    

    function CashZone() {
        _this = this;
        return;
    };

    CashZone.prototype = {

        preload: function (entityID) {
        },

        enterEntity: function (entityID) {
            print("entering in the cash area");
            Messages.sendMessage(AGENT_PLAYBACK_CHANNEL, PLAY_MESSAGE);
            print("Play sent.");
            
            // find register
            var entitiesInZone = Entities.findEntities(Entities.getEntityProperties(entityID).position, (Entities.getEntityProperties(entityID).dimensions.x)/2); 
            entitiesInZone.forEach( function(e) {
                if (Entities.getEntityProperties(e).name == REGISTER_NAME) {
                    cashRegisterID = Entities.getEntityProperties(e).id;
                    print(cashRegisterID);
                }
            });
             
            // create card above register position
            
            var cardPosition = Vec3.sum(Entities.getEntityProperties(cashRegisterID).position, CARD_POSITION_OFFSET);
            var cardOrientationQuat = Quat.fromVec3Degrees(CARD_INITIAL_ORIENTATION);
            
            cardID = Entities.addEntity({
                type: "Model",
                name: "CreditCard",
                position: cardPosition,
                rotation: cardOrientationQuat,
                dimensions: CARD_DIMENSIONS,
                collisionsWillMove: false,
                ignoreForCollisions: false,
                angularVelocity: CARD_ANGULAR_VELOCITY,
                angularDamping: 0,
                script: Script.resolvePath(SCRIPT_URL),
                // We have to put the ownerID in the card, and check that when grabbing the card. Otherwise it cannot be grabbed
                userData: JSON.stringify({
                    ownerKey: {
                        ownerID: MyAvatar.sessionUUID
                    }
                }),
                modelURL: "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/CreditCard.fbx",
                shapeType: "box"
            });
            
            Entities.callEntityMethod(cashRegisterID, 'cashRegisterOn', null);
        },

        leaveEntity: function (entityID) {
            // destroy card
            Entities.deleteEntity(cardID);
            cardID = null;
            
            Entities.callEntityMethod(cashRegisterID, 'cashRegisterOff', null);
        },

        unload: function (entityID) {
        }
    }

    return new CashZone();
});