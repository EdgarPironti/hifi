//cashzone

(function () {
    var _this;
    
    var AGENT_PLAYBACK_CHANNEL = "playbackChannel";
    var isPlaying = false;
    

    function CashZone() {
        _this = this;
        return;
    };

    CashZone.prototype = {

        preload: function (entityID) {
        },

        enterEntity: function (entityID) {
            print("entering in the cash area");
            if(!isPlaying) {
                Messages.sendMessage(AGENT_PLAYBACK_CHANNEL, "Play");
                print("Play sent.");
                isPlaying = true;
            }             
        },

        leaveEntity: function (entityID) {
            print("leaving cash area");
            if(isPlaying) {
                Messages.sendMessage(AGENT_PLAYBACK_CHANNEL, "Pause");
                print("Pause sent.");
                isPlaying = false;
            }
            
        },

        unload: function (entityID) {
           
        }
    }

    return new CashZone();
});