// shopCreditCardEntityscript.js
//

var entityProperties = null;

(function() {
    
    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    DetectGrabbed = function() { 
         _this = this;
    };
    

    DetectGrabbed.prototype = {
        
        preload: function(entityID) {
            this.entityID = entityID;
            
        },
        
        // startNearGrab: function () {
            // entityProperties = Entities.getEntityProperties(this.entityID);
            // Vec3.print(entityProperties.position);
        // },

        releaseGrab: function () {
            Entities.deleteEntity(this.entityID);
        },

        
        unload: function (entityID) {
            Entities.deleteEntity(this.entityID);
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new DetectGrabbed();
})