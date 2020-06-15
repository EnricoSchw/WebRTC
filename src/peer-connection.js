import {Interop} from '@jitsi/sdp-interop';
import transform from 'sdp-transform';
import SDPUtil from './util/SDPUtil'
import {Browser} from './browser';

const browser = new Browser();
const preferH264 = true;

export default class PeerConnection {

    constructor(
        serverConnection,
        gotRemoteStream,
        errorHandler,
        uuid,
        peerConnectionConfig,
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

    negoetion() {

    }

    createdDescription(description) {
        console.log('got description',);
        const serverConnection = this.serverConnection;
        const uuid = this.uuid;
        console.log(description, 'localDescription::');
        const parsedSdp = transform.parse(description.sdp);
        const videoMLine = parsedSdp.media.find(m => m.type === 'video');
        if(preferH264){
            SDPUtil.preferVideoCodec(videoMLine, 'h264');
        } else {
            SDPUtil.stripVideoCodec(videoMLine, 'h264');
        }

        description.sdp = transform.write(parsedSdp);

        if (!browser.isChrome()) {
            description = this.interop.toUnifiedPlan(description);
            console.log(description, 'localDescription::UnifiedPlan');
        }


        this.peerConnection.setLocalDescription(description).then(() => {
            let localDescription = this.peerConnection.localDescription;
            if (!browser.isChrome()) {
                localDescription = this.interop.toPlanB(this.peerConnection.localDescription);
                console.log(localDescription, 'localDescription::toPlanB');
            }
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
            if (!browser.isChrome()) {
                remoteDescription = this.interop.toUnifiedPlan(signal.sdp);
                console.log(signal.sdp, 'remoteDescription::toUnifiedPlan');
            }
            if(browser.isChrome()){
                if (preferH264) {
                    const parsedSdp = transform.parse(remoteDescription.sdp);
                    const videoMLine = parsedSdp.media.find(m => m.type === 'video');

                    SDPUtil.preferVideoCodec(videoMLine, 'h264');
                    remoteDescription.sdp = transform.write(parsedSdp)

                }
            }
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

