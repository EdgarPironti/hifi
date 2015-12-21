//cashRegister

(function () {
    var overlayManagerScript = Script.resolvePath("../../libraries/overlayManager.js");
    
    var SHOPPING_CART_NAME = "Shopping cart";
    var CART_REGISTER_CHANNEL = "Hifi-vrShop::";      //the ID of the cart which has to pay will be appended to this channel name
    var CREDIT_CARD_NAME = "CreditCard";
    
    var _this;
    var cartID = null;
    var actualCartRegisterChannel = null;
    var registerPanel;
    var priceText;
    var payingAvatarID = null;
    var totalPrice = 0;

    function CashRegister() {
        _this = this;
        return;
    };
    
    function receivingMessage(channel, message, senderID) {     //The senderID is the ID of the Avatar who runs the interface, not the ID on the entity which calls sendMessage()
        var messageObj = JSON.parse(message);
        if (messageObj.senderEntity != _this.entityID && channel == actualCartRegisterChannel) {
            print("Register received message");
            print("The price is: " + messageObj.totalPrice);
            //create or update the Overlay
            var price = messageObj.totalPrice.toFixed(2);
            _this.cashRegisterOverlayOn("" + price + " $");
            totalPrice = messageObj.totalPrice;
        }
    };

    CashRegister.prototype = {

        preload: function (entityID) {
            this.entityID = entityID;
            Messages.messageReceived.connect(receivingMessage);
        },
        
        //This method is called by the cashZone when an avatar comes in it
        //It has to find the cart belonging to that avatar and compute the total price of the items
        cashRegisterOn: function() {
            print("cashRegisterOn called");
            // Entities.findEntities (center: vec3, radius: number): EntityItemID[]
            var cashRegisterPosition = Entities.getEntityProperties(_this.entityID).position;
            var foundEntities = Entities.findEntities(cashRegisterPosition, 50);
            //itemsID.forEach( function(p) { print(p) });
            foundEntities.forEach( function (foundEntityID) {
                var entityName = Entities.getEntityProperties(foundEntityID).name;
                if (entityName == SHOPPING_CART_NAME) {
                    var cartOwnerID = getEntityCustomData('ownerKey', foundEntityID, null).ownerID;
                    if (cartOwnerID == MyAvatar.sessionUUID) {
                        cartID = foundEntityID;
                        actualCartRegisterChannel = CART_REGISTER_CHANNEL + cartID;
                        Messages.subscribe(actualCartRegisterChannel);      //subsribing to a channel to communicate with the cart
                        Messages.sendMessage(actualCartRegisterChannel, JSON.stringify({senderEntity: _this.entityID}));    //sending a json object with the ID of this entity
                    }
                }
            });
            if (cartID != null) {
                print("Cart found! Its ID is: " + cartID);
                payingAvatarID = MyAvatar.sessionUUID;
            } else {
                print("Cart NOT found!");
                payingAvatarID = null;
                // Show anyway the pverlay with the price 0$
                _this.cashRegisterOverlayOn("0 $");
            }
        },
        
        cashRegisterOff: function() {
            priceText.visible = false;
        },
        
        cashRegisterOverlayOn: function (string) {
            var stringOffset = string.length * 0.018;
            print("string Offset: " + stringOffset);
            if (priceText == null) {
                
                registerPanel = new OverlayPanel({
                    anchorPositionBinding: { entity: _this.entityID },
                    //anchorRotationBinding: { entity: _this.entityID },
                    offsetPosition: { x: 0, y: 0.21, z: -0.14 },
                    isFacingAvatar: false,
                    
                });
                
                priceText = new Text3DOverlay({
                        text: string,
                        isFacingAvatar: false,
                        ignoreRayIntersection: true,
                        dimensions: { x: 0, y: 0 },
                        offsetPosition: {
                            x: -stringOffset,
                            y: 0,
                            z: 0
                        },
                        backgroundColor: { red: 255, green: 255, blue: 255 },
                        color: { red: 0, green: 255, blue: 0 },
                        topMargin: 0.00625,
                        leftMargin: 0.00625,
                        bottomMargin: 0.1,
                        rightMargin: 0.00625,
                        lineHeight: 0.06,
                        alpha: 1,
                        backgroundAlpha: 0.3,
                        visible: true
                    });
                
                registerPanel.addChild(priceText);
            } else {
                priceText.text = string;
                priceText.visible = true;
                priceText.offsetPosition = {
                            x: -stringOffset,
                            y: 0,
                            z: 0
                        };
            }
        },
        
        collisionWithEntity: function (myID, otherID, collisionInfo) {
            var entityName = Entities.getEntityProperties(otherID).name;
            print("RegisterCollision with: " + entityName);
            var entityOwnerID = getEntityCustomData('ownerKey', otherID, null).ownerID;
            if (entityName == CREDIT_CARD_NAME && entityOwnerID == payingAvatarID) {
                //The register collided with the right credit card - CHECKOUT
                print("CHECKOUT: total price is " + totalPrice + "$");
                Entities.deleteEntity(otherID);
                Entities.callEntityMethod(cartID, 'resetCart', null);
                _this.cashRegisterOverlayOn("THANK YOU!");
                _this.clean();
            }
        },
        
        //clean all the variable related to the cart
        clean: function () {
            if (actualCartRegisterChannel != null) {
                Messages.unsubscribe(actualCartRegisterChannel);
            }
            actualCartRegisterChannel = null;
            cartID = null;
            payingAvatarID = null;
            totalPrice = 0;
        },

        unload: function (entityID) {
            _this.clean();
            Messages.messageReceived.disconnect(receivingMessage);      //this doesn't go in the clean() because it not depends from the cart but from the Avatar
            registerPanel.destroy();
            registerPanel = priceText = null;
        }
    }

    return new CashRegister();
});