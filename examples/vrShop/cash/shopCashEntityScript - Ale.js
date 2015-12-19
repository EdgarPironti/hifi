//cashzone

(function () {
    var CASH_REGISTER_NAME = "Cash Register";
    var _this;
    var cashRegisterID = null;

    function CashZone() {
        _this = this;
        return;
    };

    CashZone.prototype = {

        preload: function (entityID) {
            this.entityID = entityID;
            var ids = Entities.findEntities(Entities.getEntityProperties(this.entityID).position, 5);
            ids.forEach(function(id) {
                var properties = Entities.getEntityProperties(id);
                if (properties.name == CASH_REGISTER_NAME) {
                    cashRegisterID = id;
                    print("Cash register found by cash zone");
                }
            });
        },

        enterEntity: function (entityID) {
            print("entering in the cash area");
            if (cashRegisterID != null) {
                Entities.callEntityMethod(cashRegisterID, 'cashRegisterOn', null);
            }
        },

        leaveEntity: function (entityID) {
            print("leaving cash area");
            if (cashRegisterID != null) {
                Entities.callEntityMethod(cashRegisterID, 'cashRegisterOff', null);
            }
        },

        unload: function (entityID) {
           
        }
    }

    return new CashZone();
});