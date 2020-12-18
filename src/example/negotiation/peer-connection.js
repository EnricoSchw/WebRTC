import {Interop} from '@jitsi/sdp-interop';
import {Browser} from './../../browser';

const browser = new Browser();
const preferH264 = true;

const peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.stunprotocol.org:3478'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ],
    'bundlePolicy': 'max-bundle',
    'sdpSemantics': 'unified-plan'
};

export class PeerConnection {

    constructor(
        signaling,
        onRemoteStream,
        errorHandler,
        uuid,
        localStream,
        isCaller,
    ) {
        this.makingOffer = false;
        this.ignoreOffer = false;
        this.isSettingRemoteAnswerPending = false;

        this.isCaller = isCaller;
        this.polite = isCaller;
        const peerConnection = new RTCPeerConnection(peerConnectionConfig);
        peerConnection.onicecandidate = this.onIceCandidate.bind(this);
        peerConnection.ontrack = onRemoteStream;
        peerConnection.onnegotiationneeded = this.onNegotiationNeeded.bind(this);

        this.peerConnection = peerConnection;
        this.signaling = signaling;
        this.errorHandler = errorHandler;
        this.uuid = uuid;
        this.interop = new Interop();

        localStream.getTracks().forEach((track) => {
            this.peerConnection.addTrack(track, localStream);
        });
    }

    // - The perfect negotiation logic, separated from the rest of the application ---

    // let the "negotiationneeded" event trigger offer generation
    async onNegotiationNeeded() {
        const uuid = this.uuid;
        try {
            this.makingOffer = true;
            await this.peerConnection.setLocalDescription();
            this.signaling.send(JSON.stringify({'sdp': this.peerConnection.localDescription, 'uuid': uuid}));
        } catch (err) {
            console.error(err);
        } finally {
            this.makingOffer = false;
        }
    };



    onIceCandidate(event) {
        const signaling = this.signaling;
        const uuid = this.uuid;

        if (event.candidate != null ) {
            console.log('Local ICE Candidate', event.candidate);
            signaling.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
        } else {
            return;
        }
    }

    async gotSignal(signal) {
        const self = this;
        const signaling = this.signaling;
        const peerConnection = this.peerConnection;
        const uuid = this.uuid;

        try {
            if (signal.sdp) {
                const description = signal.sdp;
                // An offer may come in while we are busy processing SRD(answer).
                // In this case, we will be in "stable" by the time the offer is processed
                // so it is safe to chain it on our Operations Chain now.
                const readyForOffer =
                    !this.makingOffer &&
                    (this.peerConnection.signalingState == "stable" || this.isSettingRemoteAnswerPending);
                const offerCollision = description == "offer" && !this.readyForOffer;

                this.ignoreOffer = !this.polite && offerCollision;
                if (this.ignoreOffer) {
                    return;
                }
                this.isSettingRemoteAnswerPending = description.type == "answer";
                await this.peerConnection.setRemoteDescription(description); // SRD rolls back as needed
                this.isSettingRemoteAnswerPending = false;
                if (description.type == "offer") {
                    await this.peerConnection.setLocalDescription();

                    this.signaling.send(JSON.stringify({'sdp': this.peerConnection.localDescription, 'uuid': uuid}));
                }
            } else if (signal.ice) {
                try {
                    await this.peerConnection.addIceCandidate(signal.ice);
                } catch (err) {
                    if (!this.ignoreOffer) throw err; // Suppress ignored offer's candidates
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    close() {
        this.peerConnection.close();
    }
}

