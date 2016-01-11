//promptExample

var TITLE = "Add Item Form";
var DEFAULT_ITEM_NAME = "New Item";
//var DEFAULT_ROOT_URL = "none";
//var DEFAULT_MODEL_URL = "none";
//var DEFAULT_PREVIEW_URL = "none";
var DEFAULT_ROOT_DIRECTORY_URL = "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/";
var DEFAULT_MODEL_1_RELATIVE_PATH = "sportShoe1model.fbx";          // those paths are relative to the root directory url
var DEFAULT_PREVIEW_1_RELATIVE_PATH = "sportShoe1preview.png";
var DEFAULT_MODEL_2_RELATIVE_PATH = "sportShoe2model.fbx";
var DEFAULT_PREVIEW_2_RELATIVE_PATH = "sportShoe2preview.png";
var DEFAULT_MODEL_3_RELATIVE_PATH = "sportShoe3model.fbx";
var DEFAULT_PREVIEW_3_RELATIVE_PATH = "sportShoe3preview.png";
var DEFAULT_QUANTITY = 1;
var DEFAULT_PRICE = 1.00;
var DEFAULT_DESCRIPTION = "Description empty";


var scriptURL = Script.resolvePath("../item/shopItemEntityScript.js");
var rotation = Quat.safeEulerAngles(Camera.getOrientation());
rotation = Quat.fromPitchYawRollDegrees(0, rotation.y, 0);
var position = Vec3.sum(MyAvatar.position, Vec3.multiply(1.5, Quat.getFront(rotation)));

var form = [
    {"label": "Item Name", "value": DEFAULT_ITEM_NAME},
    
    {"label": "Root directory URL", "value": DEFAULT_ROOT_DIRECTORY_URL},
    {"label": "Model 1 relative path", "value": DEFAULT_MODEL_1_RELATIVE_PATH},
    {"label": "Preview 1 relative path", "value": DEFAULT_PREVIEW_1_RELATIVE_PATH},
    {"label": "Model 2 relative path", "value": DEFAULT_MODEL_2_RELATIVE_PATH},
    {"label": "Preview 2 relative path", "value": DEFAULT_PREVIEW_2_RELATIVE_PATH},
    {"label": "Model 3 relative path", "value": DEFAULT_MODEL_3_RELATIVE_PATH},
    {"label": "Preview 3 relative path", "value": DEFAULT_PREVIEW_3_RELATIVE_PATH},
    
    {"label": "Quantity", "value": DEFAULT_QUANTITY},
    {"label": "Price", "value": DEFAULT_PRICE},
    {"label": "Description", "value": DEFAULT_DESCRIPTION},
    
];

var accepted = Window.form(TITLE, form);

if (accepted) {
    var modelURL = "" + form[1].value + form[2].value;
    var myEntity = Entities.addEntity({
        type: "Model",
        name: form[0].value,
        position: position,
        script: scriptURL,
        rotation: rotation,
        collisionsWillMove: false,
        ignoreForCollisions: true,
        shapeType: "box",
        modelURL: modelURL,
        userData: JSON.stringify({
                                infoKey: {
                                    rootURL: form[1].value,
                                    modelURLs: [
                                       form[2].value,
                                       form[4].value,
                                       form[6].value
                                    ],
                                    previewURLs: [
                                        form[3].value,
                                        form[5].value,
                                        form[7].value
                                    ],
                                    availability: form[8].value,
                                    price: form[9].value,
                                    description: form[10].value
                                    }
                                })
    });
}