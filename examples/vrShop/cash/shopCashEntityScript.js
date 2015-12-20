//cashzone

(function () {
    var _this;
    
    var AGENT_PLAYBACK_CHANNEL = "playbackChannel";
    var PLAY_MESSAGE = "Play";
    var REGISTER_NAME = "EdgarRegister"; // FIXME: Change this with the actual name
    var CARD_ANGULAR_VELOCITY = {x:0, y:2, z:0};
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
            // var entitiesInZone = Entities.findEntitiesInBox(Entities.getEntityProperties(entityID).position, Entities.getEntityProperties(entityID).dimensions); 
            // Vec3.print("Dimension: ", Entities.getEntityProperties(entityID).dimensions);
            // Vec3.print("Position: ", Entities.getEntityProperties(entityID).position);
            // Vec3.print("AvPos: ", MyAvatar.position);
            
            var entitiesInZone = Entities.findEntities(Entities.getEntityProperties(entityID).position, (Entities.getEntityProperties(entityID).dimensions.x)/2); 
            entitiesInZone.forEach( function(e) { 
                print("Found entity " + Entities.getEntityProperties(e).name);
                if (Entities.getEntityProperties(e).name == REGISTER_NAME) {
                    cashRegisterID = Entities.getEntityProperties(e).id;
                    print(cashRegisterID);
                }
            });
             
            // create card on register position
            
            var cardPosition = Vec3.sum(Entities.getEntityProperties(cashRegisterID).position, {x : 0, y : 0.2, z : 0});
            
            cardID = Entities.addEntity({
                type: "Box",
                name: "CreditCard",
                position: cardPosition,
                dimensions: {x : 0.30, y : 0.12, z : 0.12},
                collisionsWillMove: false,
                ignoreForCollisions: false,
                angularVelocity: CARD_ANGULAR_VELOCITY,
                angularDamping: 0,
                script: Script.resolvePath(SCRIPT_URL),
                userData: JSON.stringify({
                    ownerKey: {
                        ownerID: MyAvatar.sessionUUID
                    }
                })
                // modelURL: "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe4.fbx",
                // shapeType: "box"
                // We have to put the ownerID in the card, and check that when grabbing the card. Otherwise it cannot be grabbed
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