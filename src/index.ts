import { v4 as uuidv4 } from 'uuid'

/**
 * INTERFACES
 */
interface BrowserNetOptions {
    sseBaseURL: string
}

interface BrowserNetReturn {
    close: () => void
}

interface Payload {
    type: string,
    payload: {
        [key: string]: any
    }
}

/**
 * VARIABLES
 */
const ID = uuidv4()
const CONNECTED_ID: string[] = []
const CONNECTIONS: BrowsernetRTC[] = []
const TYPE_NEW_CONNECTION = 'NEW_CONNECTION'
const TYPE_NO_OFFER = 'NO_OFFER'
const TYPE_OFFER = 'OFFER'
const TYPE_ANWSER = 'ANWSER'
const TYPE_ICE_CANDIDATE = 'ICE_CANDIDATE'
let OPTIONS: BrowserNetOptions = {
    sseBaseURL: ''
}

/**
 * 
 * @param options 
 * @returns 
 */
const browsernet = (options: BrowserNetOptions = OPTIONS): BrowserNetReturn => {
    OPTIONS = { ...options }

    CONNECTIONS.push(new BrowsernetRTC())

    return {
        close: () => {
            CONNECTIONS.forEach(connection => {
                connection.close()
            })
        }
    }
}

/**
 * BROWSERNET RTC IMPLEMENTATION 
 */
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
    private connectedTo: string | undefined
    private sseSession: EventSource | undefined

    /**
     * 
     * @param iceServers 
     */
    constructor(iceServers: RTCIceServer[] = []) {
        console.log(ID)
        this.configuration.iceServers = [...this.configuration.iceServers!, ...iceServers]

        this.peerConnection = new RTCPeerConnection(this.configuration)
        this.dataChannel = this.peerConnection.createDataChannel(new Date().getTime().toString())

        this.initSSESession()

        /**
         * Events
         */
        this.dataChannel.addEventListener('open', event => {
            console.log('data channel open')
        });

        this.peerConnection.addEventListener('connectionstatechange', event => {
            console.log(this.peerConnection.connectionState)
        });
    }

    /**
     * 
     */
    private initSSESession() {
        const payloadString = JSON.stringify({
            type: TYPE_NEW_CONNECTION,
            payload: {
                id: ID,
                connectedIDS: CONNECTED_ID
            }
        })

        this.sseSession = new EventSource(`${OPTIONS.sseBaseURL}/browsernet/sse?payload=${payloadString}`)
        this.sseSession.addEventListener('message', (event: MessageEvent<any>) => this.sseMessageEvent(event))
    }

    /**
     * 
     * @param event 
     * @returns 
     */
    private sseMessageEvent(event: MessageEvent<any>) {
        if (event.data) {
            const payloadParsed: Payload = JSON.parse(event?.data)
            if (!payloadParsed?.type) return

            switch (payloadParsed.type) {
                case TYPE_NO_OFFER: {
                    alert('NO OFFER')
                    break
                }
                case TYPE_OFFER: {
                    break
                }
                case TYPE_ANWSER: {
                    break
                }
                case TYPE_ICE_CANDIDATE: {
                    break
                }
                default: {
                    break
                }
            }
            // await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payloadParsed?.offer))
            // await this.peerConnection.addIceCandidate(payloadParsed?.iceCandidate[0])

            // CONNECTED_ID.push(payloadParsed?.id)
        }
    }

    /**
     * 
     */
    private generateIceCandidate() {
        this.peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                this.iceCandidate.push(event.candidate)
                this.syncWithSSESession(
                    JSON.stringify({
                        type: TYPE_ICE_CANDIDATE,
                        payload: {
                            id: ID,
                            connectedTo: this.connectedTo,
                            iceCandidate: event.candidate,
                        }
                    })
                )
            }
        });
    }

    /**
     * 
     * @param payload 
     * @returns 
     */
    private syncWithSSESession(payload: string) {
        return fetch(`${OPTIONS.sseBaseURL}/browsernet/session?payload=${payload}`)
            .then((response) => response.json())
    }

    /**
     * 
     */
    public close() {
        this.sseSession?.close()
    }
}

/**
 * EXPORT DEFAULT BROWSERNET
 */
export default browsernet