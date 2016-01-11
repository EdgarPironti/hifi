//reviewzone

(function () {
    var utilitiesScript = Script.resolvePath("../../libraries/utils.js");
    Script.include(utilitiesScript);
    
    var _this;
    var itemToReview = null;
    var dataBaseID = null;
    
    function ReviewZone() {
        _this = this;
        return;
    };
    
    function findItemToReview(entityID) {
        // Find items in the zone
        var entitiesInZone = Entities.findEntities(Entities.getEntityProperties(entityID).position, (Entities.getEntityProperties(entityID).dimensions.x)/2); 
        for (var i = 0; i < entitiesInZone.length && itemToReview == null; i++) {
            print(Entities.getEntityProperties(entitiesInZone[i]).name);
            print(Entities.getEntityProperties(entitiesInZone[i]).userData);
            
            var ownerObj = getEntityCustomData('ownerKey', Entities.getEntityProperties(entitiesInZone[i]).id, null);
            
            if (ownerObj == null) {
                print("No items to review.");
            } else {
                print("Not sure if review. Check " + MyAvatar.sessionUUID);
                if (ownerObj.ownerID === MyAvatar.sessionUUID) {
                    // store item name
                    itemToReview = Entities.getEntityProperties(entitiesInZone[i]).name;
                    print("Found an item to review: " + itemToReview);
                    
                    // delete the item
                    Entities.deleteEntity(itemToReview);
                    print("Item to review deleted");
                    
                }
            }
        }
    };
    
    function findItemDataBase(entityID) {
        // find the database entity
        var databaseEntityName = itemToReview + "DB";
        print("Database relative to the item: " + databaseEntityName);
        var entitiesInZone = Entities.findEntities(Entities.getEntityProperties(entityID).position, (Entities.getEntityProperties(entityID).dimensions.x)*10); 
        
        for (var i = 0; i < entitiesInZone.length && dataBaseID == null; i++) {
            if (Entities.getEntityProperties(entitiesInZone[i]).name == databaseEntityName) {
                dataBaseID = entitiesInZone[i];
                print("Database found! " + entitiesInZone[i]);
            } else {
                print("No database for this item.");
            }
        }
        
        // Or get the database entity ID if we manage to store it in the userData of the item.
        // var DBObj = getEntityCustomData('DBKey', Entities.getEntityProperties(e).id, null);
        // if (DBObj != null) { dataBaseID = DBObj.DBID }
    };


    ReviewZone.prototype = {

        preload: function (entityID) {
        },
        
        enterEntity: function (entityID) {
            print("entering in the review area");
            
            findItemToReview(entityID);
            
            if (itemToReview != null) {
                findItemDataBase(entityID);
                
                
                
                // userData: JSON.stringify({
                // infoKey: {
                        // dbKey: [
                            // //{name: default, score: 0, clip_url: atp:example}
                        // ]
                    // }
                // })
                
                // Feed the database
                
                // var dbObj = getEntityCustomData('infoKey', dataBaseID, null);
                // var reviewsNumber = 0;
                // if(dbObj != null) {
                    // reviewsNumber = dbObj.dbKey.length;
                    // dbObj.dbKey[reviewsNumber] = {name: MyAvatar.Name, score: score, clip_url: url};
                    // setEntityCustomData('infoKey', dataBaseID, dbObj.dbKey);
                // }
            }
        },

        leaveEntity: function (entityID) {
            print("leaving the review area");
            itemToReview = null;
            dataBaseID = null;
        },

        unload: function (entityID) {
        }
    }

    return new ReviewZone();
});