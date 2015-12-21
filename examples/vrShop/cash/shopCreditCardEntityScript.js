// shopCreditCardEntityscript.js
//

var _this;
var entityProperties = null;
var myCard = false;

var CARD_ANGULAR_VELOCITY = {x: 0, y: 2, z: 0};

(function() {
    
    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    DetectGrabbed = function() { 
         _this = this;
    };
    
    function update(deltaTime) {
        if (myCard) {
            Entities.editEntity(_this.entityID, { velocity: {x: 0, y: 0, z: 0},
                                                  angularVelocity: CARD_ANGULAR_VELOCITY,
                                                  angularDamping: 0,
                                                  position: entityProperties.position
                                                });
            print("Edited!");
        }
    };
    
    DetectGrabbed.prototype = {
        
        preload: function(entityID) {
            this.entityID = entityID;
            var ownerObj = getEntityCustomData('ownerKey', this.entityID, null);
            if (ownerObj.ownerID === MyAvatar.sessionUUID) {
                myCard = true;
                entityProperties = Entities.getEntityProperties(this.entityID);
                Script.update.connect(update);
            }
        },
        
        unload: function (entityID) {
            if (myCard) {
                Script.update.disconnect(update);
            }
            Entities.deleteEntity(this.entityID);
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new DetectGrabbed();
})