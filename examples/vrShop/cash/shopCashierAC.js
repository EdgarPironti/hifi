// Set the following variables to the values needed
var clip_url = "atp:4147173bdb79d0f48d8fdec2ad3a27926177e8f67e8c1078a841e389145a52d3.hfr"; // This url is working in VRshop


var PLAYBACK_CHANNEL = "playbackChannel";
var playFromCurrentLocation = false;
var useDisplayName = true;
var useAttachments = true;
var useAvatarModel = true;

var totalTime = 0;
var subscribed = false;
var WAIT_FOR_AUDIO_MIXER = 1;

var PLAY = "Play";

function getAction(channel, message, senderID) {    
    if(subscribed) {
        print("I'm the agent and I received this: " + message);
        
        switch(message) {
            case PLAY:
                print("Play");
                if (!Recording.isPlaying()) {
                    Recording.setPlayerTime(0.0);
                    Recording.startPlaying();
                }
                break;
                
            default:
                print("Unknown action: " + action);
                break;
        }
    }
}


function update(deltaTime) {

    totalTime += deltaTime;

    if (totalTime > WAIT_FOR_AUDIO_MIXER) {
        if (!subscribed) {            
            Messages.subscribe(PLAYBACK_CHANNEL);
            subscribed = true;
            Recording.loadRecording(clip_url);
            Recording.setPlayFromCurrentLocation(playFromCurrentLocation);
            Recording.setPlayerUseDisplayName(useDisplayName);
            Recording.setPlayerUseAttachments(useAttachments);
            Recording.setPlayerUseHeadModel(false);
            Recording.setPlayerUseSkeletonModel(useAvatarModel);
            Agent.isAvatar = true;
            print("------------------        I'm the agent and I am ready to receive!");
        }
    }

}

Messages.messageReceived.connect(function (channel, message, senderID) {
    if (channel == PLAYBACK_CHANNEL) {
        getAction(channel, message, senderID);
    }
});

Script.update.connect(update);