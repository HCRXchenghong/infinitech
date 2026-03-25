import { fetchPublicRuntimeSettings } from './api.js'

export const DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS = {
  title: '欢迎使用悦享e食',
  subtitle: '一站式本地生活服务平台',
  loginFooter: '登录后可同步订单、消息、地址与优惠权益',
  wechatLoginEnabled: false,
  wechatLoginEntryUrl: ''
}

let cachedConsumerAuthRuntimeSettings = { ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS }
let hasLoadedConsumerAuthRuntimeSettings = false
let consumerAuthRuntimePromise = null

function normalizeConsumerAuthRuntimeSettings(payload = {}) {
  const entryUrl = String(payload.wechat_login_entry_url || '').trim()
  return {
    title:
      String(payload.consumer_portal_title || '').trim() ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.title,
    subtitle:
      String(payload.consumer_portal_subtitle || '').trim() ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.subtitle,
    loginFooter:
      String(payload.consumer_portal_login_footer || '').trim() ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.loginFooter,
    wechatLoginEnabled: Boolean(payload.wechat_login_enabled && entryUrl),
    wechatLoginEntryUrl: entryUrl
  }
}

export function getCachedConsumerAuthRuntimeSettings() {
  return { ...cachedConsumerAuthRuntimeSettings }
}

export async function loadConsumerAuthRuntimeSettings(force = false) {
  if (hasLoadedConsumerAuthRuntimeSettings && !force) {
    return getCachedConsumerAuthRuntimeSettings()
  }
  if (consumerAuthRuntimePromise && !force) {
    return consumerAuthRuntimePromise
  }

  consumerAuthRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload) => {
      cachedConsumerAuthRuntimeSettings = normalizeConsumerAuthRuntimeSettings(payload)
      hasLoadedConsumerAuthRuntimeSettings = true
      return getCachedConsumerAuthRuntimeSettings()
    })
    .catch(() => getCachedConsumerAuthRuntimeSettings())
    .finally(() => {
      consumerAuthRuntimePromise = null
    })

  return consumerAuthRuntimePromise
}
