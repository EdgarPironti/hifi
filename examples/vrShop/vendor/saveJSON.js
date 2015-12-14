var oneSave = true;

// All the information we are saving have to be retreived from a windows.form and saved in strings.

saveJSON = function() { // This has to be moved in a script for the vendor
    
    var initialQuantity = 5;
    var myUrl = null;
    
    var itemInfo =  {
        "modelURLs": [
           "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe3.fbx",
           "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe4.fbx",
           "https://dl.dropboxusercontent.com/u/14127429/FBX/VRshop/shoe5.fbx"
        ],
        "itemDescription": "This item comes in three colors. \n Price: 99$ \n Shipping information: free, about two days."
    };

    var data = JSON.stringify(itemInfo);

    // upload
    Assets.uploadData(data, "txt", function (url) {
        myUrl = url;
        print("data uploaded to:" + myUrl);
        // create model here with the url in the userData of the JSON
        // setEntityCustomData('jsonKey', this.entityID, {
            // jsonURL: myUrl
            // availability: initialQuantity
        // });
    });
    
    // Just for try
    
}


function update(deltaTime) {
    if (oneSave) {
        saveJSON();
        oneSave = false;
    }
    
}

Script.update.connect(update);