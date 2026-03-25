import { fetchPublicRuntimeSettings } from './api.js'

const DEFAULT_LEGAL_RUNTIME_SETTINGS = {
  aboutSummary: '悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景，持续优化用户体验。',
  privacyPolicySummary: '平台仅在提供服务所必需的范围内处理账号、定位和订单信息，并遵循最小必要原则。',
  userAgreementSummary: '使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。'
}

let cachedLegalRuntimeSettings = { ...DEFAULT_LEGAL_RUNTIME_SETTINGS }
let hasLoadedLegalRuntimeSettings = false
let legalRuntimePromise = null

function normalizeLegalRuntimeSettings(payload = {}) {
  return {
    aboutSummary:
      String(payload.consumer_about_summary || '').trim() ||
      DEFAULT_LEGAL_RUNTIME_SETTINGS.aboutSummary,
    privacyPolicySummary:
      String(payload.consumer_privacy_policy || '').trim() ||
      DEFAULT_LEGAL_RUNTIME_SETTINGS.privacyPolicySummary,
    userAgreementSummary:
      String(payload.consumer_user_agreement || '').trim() ||
      DEFAULT_LEGAL_RUNTIME_SETTINGS.userAgreementSummary
  }
}

export function getCachedLegalRuntimeSettings() {
  return { ...cachedLegalRuntimeSettings }
}

export async function loadLegalRuntimeSettings(force = false) {
  if (hasLoadedLegalRuntimeSettings && !force) {
    return getCachedLegalRuntimeSettings()
  }
  if (legalRuntimePromise && !force) {
    return legalRuntimePromise
  }

  legalRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload) => {
      cachedLegalRuntimeSettings = normalizeLegalRuntimeSettings(payload)
      hasLoadedLegalRuntimeSettings = true
      return getCachedLegalRuntimeSettings()
    })
    .catch(() => getCachedLegalRuntimeSettings())
    .finally(() => {
      legalRuntimePromise = null
    })

  return legalRuntimePromise
}
