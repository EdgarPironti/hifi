//
//
(function(){ 
    this.entityID = null;

    this.preload = function(entityID) {
        this.entityID = entityID;
        Entities.editEntity(entityID, {parentID: MyAvatar.sessionUUID});
        Entities.editEntity(entityID, {parentJointIndex: MyAvatar.getJointIndex("Head")});
        Entities.editEntity(entityID, {localPosition: {x: 0, y: 0.04, z: 0.04}});
    }


})
