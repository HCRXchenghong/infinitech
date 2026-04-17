import config from './config'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from './support-runtime.js'
import { createUniNotificationAudioManager } from '../../packages/client-sdk/src/notification-audio.js'

const SETTINGS_STORAGE_KEY = 'appSettings'

function getSettings() {
  try {
    return uni.getStorageSync(SETTINGS_STORAGE_KEY) || {}
  } catch (_error) {
    return {}
  }
}

function resolveRelativeUrl(raw) {
  const baseUrl = String(config.API_BASE_URL || '').replace(/\/+$/, '')
  return baseUrl ? `${baseUrl}${raw}` : raw
}

const soundManager = createUniNotificationAudioManager({
  defaultMessageSrc: '/static/audio/chat.mp3',
  defaultOrderSrc: '/static/audio/come.mp3',
  resolveRuntimeSettings: () => getCachedSupportRuntimeSettings(),
  resolveSettings: getSettings,
  resolveRelativeUrl,
  isEnabled: (_kind, settings) => settings.notification !== false && settings.sound !== false,
  isVibrateEnabled: (_kind, settings) => settings.notification !== false && settings.vibrate !== false,
})

let bridgeBound = false

export function bindNotificationSoundBridge() {
  if (bridgeBound) {
    return
  }
  bridgeBound = true
  soundManager.bindBridge({
    resolveKind: () => 'message',
  })
}

export function playMessageNotificationSound(extra = {}) {
  return soundManager.playMessage(extra)
}

export function playOrderNotificationSound(extra = {}) {
  return soundManager.playOrder(extra)
}

void loadSupportRuntimeSettings()
