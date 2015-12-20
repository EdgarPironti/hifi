// shopCreditCardEntityscript.js
//

var entityProperties = null;
// var released = false;
// var myCard = false;

// var CARD_ANGULAR_VELOCITY = {x: 0, y: 2, z: 0};

(function() {
    
    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    DetectGrabbed = function() { 
         _this = this;
    };
    
    // function update(deltaTime) {
        // if (myCard && released) {
            // Entities.editEntity(_this.entityID, { velocity: {x: 0, y: 0, z: 0} });
            // Entities.editEntity(_this.entityID, { angularVelocity: CARD_ANGULAR_VELOCITY });
            // Entities.editEntity(_this.entityID, { angularDamping: 0 });
            // Entities.editEntity(_this.entityID, { position: entityProperties.position });
            // released = false;
            // print("Edited!");
        // }
    // };
    
    DetectGrabbed.prototype = {
        
        preload: function(entityID) {
            this.entityID = entityID;
            // var ownerObj = getEntityCustomData('ownerKey', this.entityID, null);
            // if (ownerObj.ownerID === MyAvatar.sessionUUID) {
                // myCard = true;
                // Script.update.connect(update);
            // }
        },
        
        // startNearGrab: function () {
            // entityProperties = Entities.getEntityProperties(this.entityID);
            // Vec3.print(entityProperties.position);
        // },

        releaseGrab: function () {
            //released = true;
            Entities.deleteEntity(this.entityID);
        },

        
        unload: function (entityID) {
            // if (myCard) {
                // Script.update.disconnect(update);
            // }
            Entities.deleteEntity(this.entityID);
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new DetectGrabbed();
})