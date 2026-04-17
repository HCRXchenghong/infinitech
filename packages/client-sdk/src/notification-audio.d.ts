export function classifyNotificationEnvelopeKind(envelope?: Record<string, any>): "message" | "order"

export function createUniNotificationAudioManager(options?: {
  defaultMessageSrc?: string
  defaultOrderSrc?: string
  cooldownMs?: number
  resolveSettings?: () => Record<string, any>
  resolveRuntimeSettings?: () => Record<string, any>
  resolveRelativeUrl?: (url: string) => string
  isEnabled?: (kind: string, settings: Record<string, any>) => boolean
  isVibrateEnabled?: (kind: string, settings: Record<string, any>) => boolean
}): {
  bindBridge: (options?: Record<string, any>) => void
  play: (kind?: "message" | "order", extra?: Record<string, any>) => boolean
  playMessage: (extra?: Record<string, any>) => boolean
  playOrder: (extra?: Record<string, any>) => boolean
  playForEnvelope: (envelope?: Record<string, any>, extra?: Record<string, any>) => boolean
  classifyEnvelopeKind: typeof classifyNotificationEnvelopeKind
}
