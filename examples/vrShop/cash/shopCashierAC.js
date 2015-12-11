
// Set the following variables to the values needed
var clip_url = "atp:4417bd30c34b970db276ee500a16ff3677ff766a45df0cc0549f3281517190b7.hfr"; // This url is working in VRshop
// atp:4147173bdb79d0f48d8fdec2ad3a27926177e8f67e8c1078a841e389145a52d3.hfr
var PLAYBACK_CHANNEL = "playbackChannel";
var playFromCurrentLocation = true;
var useDisplayName = true;
var useAttachments = true;
var useAvatarModel = true;

// Set position/orientation/scale here if playFromCurrentLocation is true
Avatar.position = { x:0, y: 0, z: 0 };
Avatar.orientation = Quat.fromPitchYawRollDegrees(0, 0, 0);
Avatar.scale = 1.0;

var totalTime = 0;
var subscribed = false;
var WAIT_FOR_AUDIO_MIXER = 1;

// Script. DO NOT MODIFY BEYOND THIS LINE.
var PLAY = "Play";
var PAUSE = "Pause";

Recording.setPlayFromCurrentLocation(playFromCurrentLocation);
Recording.setPlayerUseDisplayName(useDisplayName);
Recording.setPlayerUseAttachments(useAttachments);
Recording.setPlayerUseHeadModel(false);
Recording.setPlayerUseSkeletonModel(useAvatarModel);

function getAction(channel, message, senderID) {    
    if(subscribed) {
        print("I'm the agent and I received this: " + message);
        
        switch(message) {
            case PLAY:
                print("Play");
                if (!Agent.isAvatar) {
                    Agent.isAvatar = true;
                }
                if (!Recording.isPlaying()) {
                    Recording.startPlaying();
                }
                Recording.setPlayerLoop(true);
                break;
                
            case PAUSE:
                print("Pause");
                if (Recording.isPlaying()) {
                    Recording.stopPlaying();
                }
                //Agent.isAvatar = false;
                break;
                
            default:
                print("Unknown action: " + action);
                break;
        }

        if (Recording.isPlaying()) {
            Recording.play();
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
            print("I'm the agent and I am ready to receive!");
        }
    }

}

Messages.messageReceived.connect(function (channel, message, senderID) {
    if (channel == PLAYBACK_CHANNEL) {
        getAction(channel, message, senderID);
    }
});

Script.update.connect(update);
