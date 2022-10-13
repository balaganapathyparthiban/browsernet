import { v4 as uuidv4 } from 'uuid'

const ID = uuidv4()

export const browsernet = () => {
    new BrowsernetRTC()
}

class BrowsernetRTC {
    private configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            { urls: 'stun:stun.rixtelecom.se' },
            { urls: 'stun:stun.schlund.de' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            { urls: 'stun:stun.voxgratia.org' },
            { urls: "stun:openrelay.metered.ca:80" },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ]
    }
    private peerConnection: RTCPeerConnection
    private dataChannel: RTCDataChannel
    private offer: RTCSessionDescriptionInit | undefined
    private iceCandidate: RTCIceCandidate[] = []

    constructor(iceServers: RTCIceServer[] = []) {
        console.log(ID)
        this.configuration.iceServers = [...this.configuration.iceServers!, ...iceServers]

        this.peerConnection = new RTCPeerConnection(this.configuration)
        this.dataChannel = this.peerConnection.createDataChannel(new Date().getTime().toString())

        this.createOffer()
    }

    private createOffer() {
        this.peerConnection.createOffer()!
            .then(offer => {
                this.offer = offer
                this.peerConnection.setLocalDescription(this.offer)
                this.getIceCandidate()
            })
    }

    private getIceCandidate() {
        this.peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                this.iceCandidate.push(event.candidate)
            }
        });
        this.createSSE()
    }

    private createSSE() {
        setTimeout(() => {
            const payload = JSON.stringify({
                id: ID,
                offer: this.offer,
                iceCandidate: this.iceCandidate,
                deps: []
            })
            const sse = new EventSource(`http://localhost:5000/browsernet/sse?payload=${payload}`)
            sse.addEventListener('message', this.sseMessageListener)
        }, 10000)
    }
    
    private sseMessageListener(event: MessageEvent<any>) {
        console.log(event?.data)
        if (event.data) {
            /* @TODO logic */
        }

    }
}