//cart 

(function() {
    HIFI_PUBLIC_BUCKET = "http://s3.amazonaws.com/hifi-public/";
    Script.include(HIFI_PUBLIC_BUCKET + "scripts/libraries/utils.js");
    COMFORT_ARM_LENGTH = 0.5;

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
                var radius = (Entities.getEntityProperties(_this.entityID).dimensions.x) / 2 + COMFORT_ARM_LENGTH;
                //Vec3.length(Entities.getEntityProperties(_this.entityID).dimensions) / 2.0; //old radius
                var properY = MyAvatar.position.y + ((MyAvatar.getHeadPosition().y - MyAvatar.position.y) / 2);
                var targetPositionPrecomputing = {x: MyAvatar.position.x, y: properY, z: MyAvatar.position.z};
                cartTargetPosition = Vec3.sum(targetPositionPrecomputing, Vec3.multiply(Quat.getRight(MyAvatar.orientation), radius));
                }
            
            var cartPosition = Entities.getEntityProperties(_this.entityID).position;
            var positionDifference = Vec3.subtract(cartTargetPosition, cartPosition);
            if (Vec3.length(positionDifference) > 0.01) {
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
        },
        
        resetCart: function (entityID) {
            
            print("RESET CART - USER DATA: " + Entities.getEntityProperties(_this.entityID).userData);
            
            print("itemsQuantity before: " + itemsID.length);
            if (itemsID.length != 0) {
                // Delete all the items (entities)
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
                print("itemsQuantity after: " + itemsID.length);
                
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
                var itemsQuantity = itemsID.length;
                
                itemsID[itemsQuantity] = data.id;
                
                var oldDimension = Entities.getEntityProperties(data.id).dimensions;
                Entities.editEntity(data.id, { dimensions: Vec3.multiply(oldDimension, scaleFactor) });
                print("Item resized!");
                
                Entities.editEntity(data.id, { velocity: MyAvatar.getVelocity() }); // MyAvatar.getVelocity() should be zero at this time
                var oldPosition = Entities.getEntityProperties(data.id).position;
                var cartPosition = Entities.getEntityProperties(this.entityID).position;
                relativeItemsPosition[itemsQuantity] = Vec3.subtract(oldPosition, cartPosition);
                
                
                // debug prints
                //Vec3.print("Relative position saved: ", relativeItemsPosition[(itemsQuantity === 1) ? itemsQuantity : itemsQuantity.num]);      
                itemsQuantity = itemsID.length;
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
                Entities.deleteEntity(_this.entityID);
            }
        }
    };

    // entity scripts always need to return a newly constructed object of our type
    return new ShopCart();
})