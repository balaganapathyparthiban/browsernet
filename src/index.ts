
const configuration: RTCConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
}
const peerConnection = new RTCPeerConnection(configuration)
