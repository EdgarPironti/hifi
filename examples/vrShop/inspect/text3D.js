
var overlayManagerScript = Script.resolvePath("../../libraries/overlayManager.js");
Script.include(overlayManagerScript);

var mirrorPanel = new OverlayPanel({
    anchorPositionBinding: { avatar: "MyAvatar" },
    anchorRotationBinding: { avatar: "MyAvatar" },
        offsetPosition: {
        x: 0.5,
        y: 0.95,
        z: 0
    },
    
    offsetRotation: Quat.fromVec3Degrees({x: 0, y: 180, z: 0}),
    
    isFacingAvatar: false
});
print("got here 1");
var mirrorText = new Text3DOverlay({
    text: "Press any key to go back in inspection.",
    isFacingAvatar: false,
    ignoreRayIntersection: true,

    
    dimensions: { x: 0, y: 0 },
    backgroundColor: { red: 255, green: 255, blue: 255 },
    color: { red: 200, green: 0, blue: 0 },
    topMargin: 0.00625,
    leftMargin: 0.00625,
    bottomMargin: 0.1,
    rightMargin: 0.00625,
    lineHeight: 0.06,
    alpha: 1,
    backgroundAlpha: 0.3,
    visible: true
});
mirrorPanel.addChild(mirrorText);

print("got here 2");


function onScriptEnd() {
    mirrorPanel.destroy();
}

Script.scriptEnding.connect(onScriptEnd);