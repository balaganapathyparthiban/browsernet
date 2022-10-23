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
const CONNECTIONS: BrowsernetRTC[] = []
const TYPE_NEW_CONNECTION = 'NEW_CONNECTION'
const TYPE_NO_OFFER = 'NO_OFFER'
const TYPE_OFFER = 'OFFER'
const TYPE_ANWSER = 'ANWSER'
const TYPE_ICE_CANDIDATE = 'ICE_CANDIDATE'
const TYPE_SHARE_ICE_CANDIDATE = 'SHARE_ICE_CANDIDATE'
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
	private connectionID: string | undefined
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
			this.sseSession?.close()
		});

		this.peerConnection.addEventListener('connectionstatechange', event => {
			console.log(this.peerConnection.connectionState)
		});
	}

	/**
	 * 
	 */
	private initSSESession() {
		const data = JSON.stringify({
			type: TYPE_NEW_CONNECTION,
			payload: {
				id: ID,
				connections: CONNECTIONS.map(connection => connection?.connectionID)
			}
		})

		this.sseSession = new EventSource(`${OPTIONS.sseBaseURL}/browsernet/sse?data=${data}`)
		this.sseSession.addEventListener('message', (event: MessageEvent<any>) => this.sseMessageEvent(event))
	}

	/**
	 * 
	 * @param event 
	 * @returns 
	 */
	private sseMessageEvent(event: MessageEvent<any>) {
		if (event.data) {
			const data: Payload = JSON.parse(event?.data)
			if (!data?.type) return

			switch (data?.type) {
				case TYPE_NO_OFFER: {
					this.createOffer()
					break
				}
				case TYPE_OFFER: {
					this.createAnswer(data?.payload)
					break
				}
				case TYPE_ANWSER: {
					this.acceptAnswer(data?.payload)
					break
				}
				case TYPE_ICE_CANDIDATE: {
					this.acceptIceCandidate(data?.payload)
					break
				}
				default: {
					break
				}
			}
		}
	}

	/**
	 * 
	 */
	public createOffer() {
		this.peerConnection.createOffer()
			.then((offer) => {
				this.peerConnection.setLocalDescription(
					new RTCSessionDescription(offer)
				)
					.then(() => {
						this.syncWithSSESession(
							JSON.stringify({
								type: TYPE_OFFER,
								payload: {
									id: ID,
									offer,
								}
							})
						)
						this.generateIceCandidate()
					})
					.catch((error) => {
						console.log(error)
					})
			})
			.catch((error) => {
				console.log(error)
			})
	}

	/**
	 * 
	 */
	private createAnswer(payload: any) {
		if (!payload?.id || !payload?.offer) {
			return
		}

		payload.offer.sdp = (
			payload?.offer?.sdp
		)
			?.split('\n')
			?.map((each: string) => {
				each = each.trim()
				if (each.includes('a=ice-pwd:') || each.includes('a=ice-ufrag:')) {
					while (/\s/g.test(each)) {
						each = each.replace(/\s/g, '+')
					}
				}
				return each
			})
			?.join("\n")

		this.peerConnection.setRemoteDescription(
			new RTCSessionDescription(payload?.offer)
		)
			.then(() => {
				this.peerConnection.createAnswer()
					.then((answer) => {
						this.peerConnection.setLocalDescription(
							new RTCSessionDescription(answer)
						)
							.then(() => {
								this.connectionID = payload?.id
								this.syncWithSSESession(
									JSON.stringify({
										type: TYPE_ANWSER,
										payload: {
											id: ID,
											answer: answer,
										}
									})
								)
								this.generateIceCandidate()
							})
							.catch((error) => {
								console.log(error, 'Create Answer Set Local Description')
							})
					})
					.catch((error) => {
						console.log(error, 'Create Answer for the Offer')
					})
			})
			.catch((error) => {
				console.log(error, 'Create Answer Set Remote Description')
			})
	}

	/**
	 * 
	 * @param payload 
	 */
	private acceptAnswer(payload: any) {
		if (!payload?.id || !payload?.answer) {
			return
		}

		payload.answer.sdp = (
			payload?.answer?.sdp
		)
			?.split('\n')
			?.map((each: string) => {
				each = each.trim()
				if (each.includes('a=ice-pwd:') || each.includes('a=ice-ufrag:')) {
					while (/\s/g.test(each)) {
						each = each.replace(/\s/g, '+')
					}
				}
				return each
			})
			?.join("\n")

		this.peerConnection.setRemoteDescription(
			new RTCSessionDescription(payload?.answer)
		)
			.then(() => {
				this.connectionID = payload?.id
				this.syncWithSSESession(
					JSON.stringify({
						type: TYPE_SHARE_ICE_CANDIDATE,
						payload: {
							id: ID,
						}
					})
				)
			})
			.catch((error) => {
				console.log(error, 'Accept Answer Set Remote Description')
			})
	}

	/**
	 * 
	 */
	private generateIceCandidate() {
		this.peerConnection.addEventListener('icecandidate', event => {
			if (event?.candidate) {
				this.syncWithSSESession(
					JSON.stringify({
						type: TYPE_ICE_CANDIDATE,
						payload: {
							id: ID,
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
	 */
	private acceptIceCandidate(payload: any) {
		if (!payload?.id || !payload?.iceCandidate) {
			return
		}

		this.peerConnection.addIceCandidate(payload?.iceCandidate)
			.then(() => {
			})
			.catch((error) => {
				console.log(error)
			})
	}

	/**
	 * 
	 * @param payload 
	 * @returns 
	 */
	private syncWithSSESession(data: string) {
		return fetch(`${OPTIONS.sseBaseURL}/browsernet/session?data=${data}`)
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