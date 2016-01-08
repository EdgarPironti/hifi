//cartzone

//
//  recordingEntityScript.js
//  examples/entityScripts
//
//  Created by Alessandro Signa on 11/12/15.
//  Copyright 2015 High Fidelity, Inc.
//

//  All the avatars in the area when the master presses the button will start/stop recording.
//  

//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {
    var SHOP_GRAB_SCRIPT_URL = Script.resolvePath("../item/shopItemGrab.js");
    var SHOP_GRAB_CHANNEL = "Hifi-vrShop-Grab";
    var _this;


    function SwapGrabZone() {
        _this = this;
        return;
    };
    
    function isScriptRunning(script) {
        script = script.toLowerCase().trim();
        var runningScripts = ScriptDiscoveryService.getRunning();
        for (i in runningScripts) {
            if (runningScripts[i].url.toLowerCase().trim() == script) {
                return true;
            }
        }
        return false;
    };



    SwapGrabZone.prototype = {


        enterEntity: function (entityID) {
            print("entering in the shop area");
            
            if (!isScriptRunning(SHOP_GRAB_SCRIPT_URL)) {
                Script.load(SHOP_GRAB_SCRIPT_URL);
            }
            
        },

        leaveEntity: function (entityID) {
            print("leaving the shop area");
            Messages.sendMessage(SHOP_GRAB_CHANNEL, null);      //signal to shopItemGrab that it has to kill itself
        },

    }

    return new SwapGrabZone();
});