// shopCreditCardEntityscript.js
//

(function() {
    
    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    DetectGrabbed = function() { 
         _this = this;
    };
    
    // function update(deltaTime) {
        // if(inspecting){
            // _this.orientationPositionUpdate();
        // }
    // };
    

    DetectGrabbed.prototype = {
        
        preload: function(entityID) {
            this.entityID = entityID;
        },

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