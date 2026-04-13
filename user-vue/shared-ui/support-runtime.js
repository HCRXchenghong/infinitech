import { fetchPublicRuntimeSettings } from './api.js'

const DEFAULT_SUPPORT_RUNTIME_SETTINGS = {
  title: '平台客服',
  welcomeMessage: '您好！我是平台客服，有什么可以帮助您的吗？',
  merchantWelcomeMessage: '欢迎光临，有什么可以帮您的？',
  riderWelcomeMessage: '您好，您的骑手正在配送中。',
  messageSoundUrl: '',
  orderSoundUrl: ''
}

let cachedSupportRuntimeSettings = { ...DEFAULT_SUPPORT_RUNTIME_SETTINGS }
let hasLoadedSupportRuntimeSettings = false
let supportRuntimePromise = null

function normalizeSupportRuntimeSettings(payload = {}) {
  const title = String(payload.support_chat_title || '').trim() || DEFAULT_SUPPORT_RUNTIME_SETTINGS.title
  const welcomeMessage =
    String(payload.support_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.welcomeMessage
  const merchantWelcomeMessage =
    String(payload.merchant_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.merchantWelcomeMessage
  const riderWelcomeMessage =
    String(payload.rider_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.riderWelcomeMessage
  const messageSoundUrl =
    String(payload.message_notification_sound_url || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.messageSoundUrl
  const orderSoundUrl =
    String(payload.order_notification_sound_url || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.orderSoundUrl

  return {
    title,
    welcomeMessage,
    merchantWelcomeMessage,
    riderWelcomeMessage,
    messageSoundUrl,
    orderSoundUrl
  }
}

export function getCachedSupportRuntimeSettings() {
  return { ...cachedSupportRuntimeSettings }
}

export async function loadSupportRuntimeSettings(force = false) {
  if (hasLoadedSupportRuntimeSettings && !force) {
    return getCachedSupportRuntimeSettings()
  }
  if (supportRuntimePromise && !force) {
    return supportRuntimePromise
  }

  supportRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload) => {
      cachedSupportRuntimeSettings = normalizeSupportRuntimeSettings(payload)
      hasLoadedSupportRuntimeSettings = true
      return getCachedSupportRuntimeSettings()
    })
    .catch(() => getCachedSupportRuntimeSettings())
    .finally(() => {
      supportRuntimePromise = null
    })

  return supportRuntimePromise
}

export { DEFAULT_SUPPORT_RUNTIME_SETTINGS }
