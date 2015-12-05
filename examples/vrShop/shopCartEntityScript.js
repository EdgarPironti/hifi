//cart 

(function() {
    HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";
    Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/utils.js");

    var _this;
    var cartIsMine = false;
    var originalY = 0;
    var itemsID = [];
    var relativeItemsPosition = [];
    var scaleFactor = 0.7; //The scale factor will dipend on the number of items in the cart. We would resize even the items already present.                
    var cartTargetPosition;
    var cartTargetRotation;

    // this is the "constructor" for the entity as a JS object we don't do much here, but we do want to remember
    // our this object, so we can access it in cases where we're called without a this (like in the case of various global signals)
    ShopCart = function() { 
         _this = this;
    };
    
    function update(deltaTime) {
        _this.followAvatar();
        _this.carryItems();
        
        if (Controller.getValue(Controller.Standard.RightPrimaryThumb)) {
            _this.resetCart();
        }
    };
    

    ShopCart.prototype = {

        // preload() will be called when the entity has become visible (or known) to the interface
        // it gives us a chance to set our local JavaScript object up. In this case it means:
        //   * remembering our entityID, so we can access it in cases where we're called without an entityID
        //   * connecting to the update signal so we can check our grabbed state
        preload: function(entityID) {
            this.entityID = entityID;
            //get the owner ID from user data and compare to the mine
            //the update will be connected just for the owner
            var ownerObj = getEntityCustomData('ownerKey', this.entityID, null);
            if (ownerObj.ownerID === MyAvatar.sessionUUID) {
                cartIsMine = true;
                originalY = Entities.getEntityProperties(_this.entityID).position.y;
                cartTargetPosition = Entities.getEntityProperties(_this.entityID).position; //useful if the entity script is assigned manually
                Script.update.connect(update);
                print("PRELOAD USER DATA: " + Entities.getEntityProperties(_this.entityID).userData);
            }
        },
        
        carryItems: function() {
            for (var i=0; i < itemsID.length; i++) {
                var newPosition = Vec3.sum(Entities.getEntityProperties(_this.entityID).position, relativeItemsPosition[i]);
                Entities.editEntity(itemsID[i], { position: newPosition });
            }
        },
        
        followAvatar: function() {
            if (Vec3.length(MyAvatar.getVelocity()) > 0.1) {
                //update cart target position and orientation
                var radius = Vec3.length(Entities.getEntityProperties(_this.entityID).dimensions) ;
                var targetPositionPrecomputing = {x: MyAvatar.position.x, y: originalY, z: MyAvatar.position.z};
                cartTargetPosition = Vec3.sum(targetPositionPrecomputing, Vec3.multiply(Quat.getRight(MyAvatar.orientation), radius));
                
                cartTargetRotation = MyAvatar.orientation;
                Entities.editEntity(_this.entityID, { rotation: cartTargetRotation }); //remove this if the smooth rotation works
            }
            
            var cartPosition = Entities.getEntityProperties(_this.entityID).position;
            var positionDifference = Vec3.subtract(cartTargetPosition, cartPosition);
            if (Vec3.length(positionDifference) > 0.1) {
                //give to the cart the proper velocity
                //print("fixing position - difference is: " + Vec3.length(positionDifference));
                Entities.editEntity(_this.entityID, { velocity: positionDifference });
                Entities.editEntity(_this.entityID, { ignoreForCollisions: true });
            } else if (Vec3.length(positionDifference) > 0) {
                //set the position
                //print("setting position - difference is: " + Vec3.length(positionDifference));
                Entities.editEntity(_this.entityID, { position: cartTargetPosition });
                positionDifference = Vec3.subtract(cartTargetPosition, cartPosition);
                Entities.editEntity(_this.entityID, { velocity: positionDifference });
                Entities.editEntity(_this.entityID, { ignoreForCollisions: false });
            }
            
            //FIX ME: smooth rotation doesn't work properly
            // var cartRotation = Entities.getEntityProperties(_this.entityID).rotation;
            // var orientationDifference = Vec3.subtract(Quat.safeEulerAngles(cartTargetRotation), Quat.safeEulerAngles(cartRotation));
            // if (orientationDifference.y > 0.02) {
                // print("fixing orientation - difference is: " + orientationDifference.y);
                // //give to the cart the proper angular velocity
                // var newAngularVelocity = orientationDifference;
                // newAngularVelocity.x = newAngularVelocity.z = 0.0;
                // newAngularVelocity.y = orientationDifference.y / 10;
                // Entities.editEntity(_this.entityID, { angularVelocity : newAngularVelocity });
            // }  else if (orientationDifference.y != 0.0) {
                // //set the orientation
                // print("setting orientation - difference is: " + orientationDifference.y);
                // Entities.editEntity(_this.entityID, { rotation: cartTargetRotation });
            // }
            
        },
        
        resetCart: function (entityID) {
            
            print("RESET CART - USER DATA: " + Entities.getEntityProperties(_this.entityID).userData);
            print("itemsQuantity before: " + itemsQuantity);
            if (itemsID.length != 0) {
                // Delete all the item (entity)
                for (var i=0; i < itemsID.length; i++) {
                    Entities.deleteEntity(itemsID[i]);
                }
                print("Entities removed");
                
                // Delete the userData fields for the items
                // set userData in a destructive way
                Entities.editEntity(this.entityID, { userData: ""}); // in which format do we write the owner of the cart at the beginning?
                
                setEntityCustomData('ownerKey', this.entityID, {
                    ownerID: MyAvatar.sessionUUID
                });
                
                setEntityCustomData('grabbableKey', this.entityID, {
                    grabbable: false
                });
                
                print("userData clean");
                itemsID = [];
                itemsQuantity = itemsID.length;
                print("itemsQuantity after: " + itemsQuantity);
                
                // Clean the relativePostion array
                relativeItemsPosition = [];
                print("relative position array " + relativeItemsPosition.length);
            }
        },
        
        refreshCartContent: function (entityID, dataArray) {
            var data = JSON.parse(dataArray[0]);
            var itemOwnerObj = getEntityCustomData('ownerKey', data.id, null);
            
            if (((itemOwnerObj == null) ? itemOwnerObj : itemOwnerObj.ownerID) === MyAvatar.sessionUUID) {
                print("The owner of the item is you");
            } else {
                print("NOT YOUR ITEM, NOT YOUR CART!");
            }
            
            print("item ID: " + data.id);
            
            for (var i=0; i < itemsID.length; i++) {
                if(itemsID[i] == data.id) {
                    itemsID.splice(i, 1);
                    relativeItemsPosition.splice(i,1);
                }
            }
            
            print("Number of items in cart: " + itemsID.length);
            itemsID.forEach( function(p) { print(p) });
        },
        
        doSomething: function (entityID, dataArray) {
            var data = JSON.parse(dataArray[0]);
            var itemOwnerObj = getEntityCustomData('ownerKey', data.id, null);
            print("------- The owner of the item is: " + ((itemOwnerObj == null) ? itemOwnerObj : itemOwnerObj.ownerID));
            print("item ID: " + data.id);
            
            var cartOwnerObj = getEntityCustomData('ownerKey', this.entityID, null);
            print("------- The owner of the cart is: " + ((cartOwnerObj == null) ? cartOwnerObj : cartOwnerObj.ownerID));
            print("cart ID: " + this.entityID);
            
            if (cartOwnerObj == null) {
                print("The cart doesn't have a owner.");
                Entities.deleteEntity(data.id);
            }
            
            if (itemOwnerObj.ownerID === cartOwnerObj.ownerID) {
                // if itemsQuantity == fullCart resize all the items present in the cart and change the scaleFactor for this and next insert

                print("Going to put item in the cart!");
                itemsQuantity = itemsID.length;
                
                itemsID[itemsQuantity] = data.id;
                
                var oldDimension = Entities.getEntityProperties(data.id).dimensions;
                Entities.editEntity(data.id, { dimensions: Vec3.multiply(oldDimension, scaleFactor) });
                print("Item resized!");
                
                Entities.editEntity(data.id, { velocity: MyAvatar.getVelocity() });
                var oldPosition = Entities.getEntityProperties(data.id).position;
                var cartPosition = Entities.getEntityProperties(this.entityID).position;
                relativeItemsPosition[itemsQuantity] = Vec3.subtract(oldPosition, cartPosition);
                
                
                // debug prints
                //Vec3.print("Relative position saved: ", relativeItemsPosition[(itemsQuantity === 1) ? itemsQuantity : itemsQuantity.num]);      
                itemsQuantity ++;
                print("Item " + itemsQuantity + itemsID[itemsQuantity-1] + " inserted! New quantity: " + itemsQuantity);
                relativeItemsPosition.forEach( function(p) { Vec3.print("", p) });
                
                setEntityCustomData('statusKey', data.id, {
                    status: "inCart"
                });
                
                print("Set status!");
            }else {
                print("Not your cart!");
                Entities.deleteEntity(data.id);
            }            
        },
        
        unload: function (entityID) {
            print("UNLOAD CART");
            if(cartIsMine){
                Script.update.disconnect(update);
                _this.resetCart();  //useful if the script is reloaded manually
            }
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new ShopCart();
})