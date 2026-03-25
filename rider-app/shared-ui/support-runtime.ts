import { fetchPublicRuntimeSettings } from './api'

export interface SupportRuntimeSettings {
  title: string
  welcomeMessage: string
  merchantWelcomeMessage: string
  riderWelcomeMessage: string
  aboutSummary: string
}

export const DEFAULT_SUPPORT_RUNTIME_SETTINGS: SupportRuntimeSettings = {
  title: '平台客服',
  welcomeMessage: '您好！我是平台客服，有什么可以帮助您的吗？',
  merchantWelcomeMessage: '欢迎光临，有什么可以帮您的？',
  riderWelcomeMessage: '您好，您的骑手正在配送中。',
  aboutSummary: '骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。'
}

let cachedSupportRuntimeSettings: SupportRuntimeSettings = { ...DEFAULT_SUPPORT_RUNTIME_SETTINGS }
let hasLoadedSupportRuntimeSettings = false
let supportRuntimePromise: Promise<SupportRuntimeSettings> | null = null

function normalizeSupportRuntimeSettings(payload: any = {}): SupportRuntimeSettings {
  const title = String(payload?.support_chat_title || '').trim() || DEFAULT_SUPPORT_RUNTIME_SETTINGS.title
  const welcomeMessage =
    String(payload?.support_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.welcomeMessage
  const merchantWelcomeMessage =
    String(payload?.merchant_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.merchantWelcomeMessage
  const riderWelcomeMessage =
    String(payload?.rider_chat_welcome_message || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.riderWelcomeMessage
  const aboutSummary =
    String(payload?.rider_about_summary || '').trim() ||
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.aboutSummary

  return {
    title,
    welcomeMessage,
    merchantWelcomeMessage,
    riderWelcomeMessage,
    aboutSummary
  }
}

export function getCachedSupportRuntimeSettings(): SupportRuntimeSettings {
  return { ...cachedSupportRuntimeSettings }
}

export async function loadSupportRuntimeSettings(force = false): Promise<SupportRuntimeSettings> {
  if (hasLoadedSupportRuntimeSettings && !force) {
    return getCachedSupportRuntimeSettings()
  }
  if (supportRuntimePromise && !force) {
    return supportRuntimePromise
  }

  supportRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload: any) => {
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
