export interface RTCSessionDescriptionPayload {
  type: string
  sdp: string
}

export interface RTCIceCandidatePayload {
  candidate: string
  sdpMid: string
  sdpMLineIndex: number
  usernameFragment?: string
}

export function canUseRTCMedia(options?: {
  runtimeTarget?: any
}): boolean

export function createRTCMediaSession(options?: {
  runtimeTarget?: any
  iceServers?: Array<Record<string, any>>
  onIceCandidate?: (candidate: RTCIceCandidatePayload | null) => void
  onTrack?: (stream?: any, event?: any) => void
  onConnectionStateChange?: (state: string) => void
}): {
  canUseRTCMedia: typeof canUseRTCMedia
  ensureLocalAudio: () => Promise<any>
  createOffer: () => Promise<RTCSessionDescriptionPayload | null>
  applyOffer: (offer?: RTCSessionDescriptionPayload | Record<string, any>) => Promise<RTCSessionDescriptionPayload | null>
  applyAnswer: (answer?: RTCSessionDescriptionPayload | Record<string, any>) => Promise<void>
  addIceCandidate: (candidate?: RTCIceCandidatePayload | Record<string, any>) => Promise<void>
  stop: () => void
  getConnectionState: () => string
  getLocalStream: () => any
  getRemoteStream: () => any
}
