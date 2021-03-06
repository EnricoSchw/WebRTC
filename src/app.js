import { PeerConnection as DefaultPeerConnection }  from './peer-connection';
import { PeerConnection as NegotiationPeerConnection }   from './example/negotiation/peer-connection';
import { PeerConnection as TurnPeerConnection }   from './example/turn/peer-connection';
import { Browser } from './browser';

const browser = new Browser();

let localVideo;
let localStream;
let remoteVideo;
let peerConnection;
let PeerConnection;
let uuid;
let serverConnection;

window.pageReady = (modul) => {
    uuid = createUUID();

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    serverConnection = new WebSocket('wss://' + window.location.hostname + ':9443');
    serverConnection.onmessage = gotMessageFromServer;

    const constraints = {
        video: true,
        audio: true,
    };

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    } else {
        alert('Your browser does not support getUserMedia API');
    }

    if(modul === 'turn') {
        PeerConnection = TurnPeerConnection;
    } else if (modul === 'negotiation') {
        PeerConnection = NegotiationPeerConnection;
    } else {
        PeerConnection = DefaultPeerConnection;
    }
};

window.start = (isCaller) => {
    peerConnection = new PeerConnection(
        serverConnection,
        gotRemoteStream,
        errorHandler,
        uuid,
        localStream,
        isCaller
    );

};

window.stop = (isCaller) => {
    peerConnection.close();
};

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function gotMessageFromServer(message) {
    if (!peerConnection) window.start(false);

    const signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if (signal.uuid === uuid) return;

    peerConnection.gotSignal(signal);
}

function gotRemoteStream({track, streams}) {
    // once media for a remote track arrives, show it in the remote video element
    track.onunmute = () => {
        console.log(streams, track)
        // don't set srcObject again if it is already set.
        if (remoteVideo.srcObject) return;
        remoteVideo.srcObject = streams[0];
    };
}

function errorHandler(error) {
    console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
