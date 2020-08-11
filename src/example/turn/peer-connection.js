import {Interop} from '@jitsi/sdp-interop';
import {Browser} from './../../browser';

const browser = new Browser();
const preferH264 = true;

const peerConnectionConfig = {
    'iceServers': [
        // Add your turnserver here!!
        // {'urls': 'turns:..'},
    ],
    'bundlePolicy': 'max-bundle',
    'sdpSemantics': 'unified-plan'
};

export class PeerConnection {

    constructor(
        serverConnection,
        gotRemoteStream,
        errorHandler,
        uuid,
        localStream,
        isCaller,
    ) {
        this.isCaller = isCaller;
        const peerConnection = new RTCPeerConnection(peerConnectionConfig);
        peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
        peerConnection.ontrack = gotRemoteStream;
        peerConnection.onnegotiationneeded = this.createOfferAnswer.bind(this);

        this.peerConnection = peerConnection;
        this.serverConnection = serverConnection;
        this.errorHandler = errorHandler;
        this.uuid = uuid;
        this.interop = new Interop();

        localStream.getTracks().forEach((track) => {
            this.peerConnection.addTrack(track, localStream);
        });
    }

    createOfferAnswer() {
        if (this.isCaller) {
            this.peerConnection.createOffer().then(this.createdDescription.bind(this)).catch(this.errorHandler);
        }
    }

    createdDescription(description) {
        console.log('got description',);
        const serverConnection = this.serverConnection;
        const uuid = this.uuid;
        this.peerConnection.setLocalDescription(description).then(() => {
            let localDescription = this.peerConnection.localDescription;
            serverConnection.send(JSON.stringify({'sdp': localDescription, 'uuid': uuid}));
        }).catch(this.errorHandler);
    }

    gotIceCandidate(event) {
        const serverConnection = this.serverConnection;
        const uuid = this.uuid;

        if (event.candidate != null) {
            serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
        }
    }

    gotSignal(signal) {
        const self = this;

        if (signal.sdp) {
            let remoteDescription = signal.sdp;
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDescription)).then(() => {
                // Only create answers in response to offers
                if (signal.sdp.type === 'offer') {
                    self.peerConnection.createAnswer().then(self.createdDescription.bind(self)).catch(self.errorHandler);
                }
            }).catch(this.errorHandler);
        } else if (signal.ice) {
            self.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(this.errorHandler);
        }
    }

    close() {
        this.peerConnection.close();
    }
}

