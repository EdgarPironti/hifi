//cashRegister

(function () {
    var overlayManagerScript = Script.resolvePath("../../libraries/overlayManager.js");
    Script.include(overlayManagerScript);
    
    var SHOPPING_CART_NAME = "Shopping cart";
    var CART_REGISTER_CHANNEL = "Hifi-vrShop-Register";
    var CREDIT_CARD_NAME = "CreditCard";
    
    var _this;
    var cartID = null;
    var registerPanel = null;
    var priceText = null;
    var payingAvatarID = null;
    var totalPrice = 0;

    function CashRegister() {
        _this = this;
        return;
    };
    
    function receivingMessage(channel, message, senderID) {

        if (senderID === MyAvatar.sessionUUID && channel == CART_REGISTER_CHANNEL) {
            var messageObj = JSON.parse(message);
            if (messageObj.senderEntity != _this.entityID) {
                print("Register received message");
                //create or update the Overlay
                var price = messageObj.totalPrice.toFixed(2);
                _this.cashRegisterOverlayOn("" + price + " $");
                totalPrice = messageObj.totalPrice;
            }
        }
    };

    CashRegister.prototype = {

        preload: function (entityID) {
            this.entityID = entityID;
            Messages.messageReceived.connect(receivingMessage);
        },
        
        //This method is called by the cashZone when an avatar comes in it
        //It has to find the cart belonging to that avatar and ask it the total price of the items
        cashRegisterOn: function() {
            print("cashRegisterOn called");
            Messages.subscribe(CART_REGISTER_CHANNEL);
            // Entities.findEntities (center: vec3, radius: number): EntityItemID[]
            var cashRegisterPosition = Entities.getEntityProperties(_this.entityID).position;
            var foundEntities = Entities.findEntities(cashRegisterPosition, 50);
            foundEntities.forEach( function (foundEntityID) {
                var entityName = Entities.getEntityProperties(foundEntityID).name;
                if (entityName == SHOPPING_CART_NAME) {
                    var cartOwnerID = getEntityCustomData('ownerKey', foundEntityID, null).ownerID;
                    if (cartOwnerID == MyAvatar.sessionUUID) {
                        cartID = foundEntityID;
                        
                    }
                }
            });
            if (cartID != null) {
                print("Cart found! Its ID is: " + cartID);
                payingAvatarID = MyAvatar.sessionUUID;
                print("register sent message");
                Messages.sendMessage(CART_REGISTER_CHANNEL, JSON.stringify({senderEntity: _this.entityID}));    //with this message the cart know that it has to compute and send back the total price of the items
                Entities.callEntityMethod(cartID, 'singlePriceOn', null);
            } else {
                print("Cart NOT found!");
                payingAvatarID = null;
                // Show anyway the pverlay with the price 0$
                _this.cashRegisterOverlayOn("0 $");
            }
        },
        
        cashRegisterOff: function() {
            Messages.unsubscribe(CART_REGISTER_CHANNEL);
            priceText.visible = false;
            if (cartID != null) {
                Entities.callEntityMethod(cartID, 'singlePriceOff', null);
            }
        },
        
        cashRegisterOverlayOn: function (string) {
            var stringOffset = string.length * 0.018;
            if (priceText == null) {
                print("register create string: " + string);
                
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
                print("register change string in: " + string);
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