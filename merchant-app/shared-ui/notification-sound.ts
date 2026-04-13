import config from './config'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from './support-runtime'
import {
  classifyNotificationEnvelopeKind,
  createUniNotificationAudioManager,
} from '../../shared/mobile-common/notification-audio.js'

const SETTINGS_STORAGE_KEY = 'merchantAppSettings'

function getSettings(): Record<string, any> {
  try {
    return (uni.getStorageSync(SETTINGS_STORAGE_KEY) || {}) as Record<string, any>
  } catch (_error) {
    return {}
  }
}

function resolveRelativeUrl(raw: string): string {
  const baseUrl = String(config.API_BASE_URL || '').replace(/\/+$/, '')
  return baseUrl ? `${baseUrl}${raw}` : raw
}

const soundManager = createUniNotificationAudioManager({
  defaultMessageSrc: '/static/audio/chat.mp3',
  defaultOrderSrc: '/static/audio/come.mp3',
  resolveRuntimeSettings: () => getCachedSupportRuntimeSettings(),
  resolveSettings: getSettings,
  resolveRelativeUrl,
  isEnabled: (_kind: string, settings: Record<string, any>) =>
    settings.notification !== false && settings.sound !== false,
  isVibrateEnabled: (_kind: string, settings: Record<string, any>) =>
    settings.notification !== false && settings.vibrate !== false,
})

let bridgeBound = false

export function bindNotificationSoundBridge(): void {
  if (bridgeBound) {
    return
  }
  bridgeBound = true
  soundManager.bindBridge({
    resolveKind: classifyNotificationEnvelopeKind,
  })
}

export function playMerchantMessageNotificationSound(extra: Record<string, any> = {}): boolean {
  return soundManager.playMessage(extra)
}

export function playMerchantOrderNotificationSound(extra: Record<string, any> = {}): boolean {
  return soundManager.playOrder(extra)
}

export function playMerchantNotificationSoundForEnvelope(
  envelope: Record<string, any>,
  extra: Record<string, any> = {}
): boolean {
  return soundManager.playForEnvelope(envelope, extra)
}

void loadSupportRuntimeSettings()
