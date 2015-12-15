//spawner

Entities.addEntity({
    type: "Model",
    name: "Item",
    position: {x : 0, y : 0, z : 0},
    dimensions: {x : 0.30, y : 0.12, z : 0.12},
    collisionsWillMove: false,
    ignoreForCollisions: true,
    modelURL: "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe4.fbx",
    shapeType: "box",
    originalTextures: "Kd.004:https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe_0.jpg",
    script: Script.resolvePath("shopItemEntityscript.js"),
    userData: JSON.stringify({
                        jsonKey: {
                            availability: 3
                        }
                    })
});