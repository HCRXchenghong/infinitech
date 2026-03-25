import { fetchPublicRuntimeSettings } from './api'

export interface MerchantPortalRuntimeSettings {
  title: string
  subtitle: string
  loginFooter: string
  privacyPolicy: string
  serviceAgreement: string
}

export const DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS: MerchantPortalRuntimeSettings = {
  title: '商户工作台',
  subtitle: '悦享e食 · Merchant Console',
  loginFooter: '账号由平台管理员分配，登录后可直接管理订单和商品',
  privacyPolicy: '我们会在必要范围内处理商户信息，用于订单履约、结算和风控，详细条款请联系平台管理员获取。',
  serviceAgreement: '使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。'
}

let cachedMerchantPortalRuntimeSettings: MerchantPortalRuntimeSettings = {
  ...DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS
}
let hasLoadedMerchantPortalRuntimeSettings = false
let merchantPortalRuntimePromise: Promise<MerchantPortalRuntimeSettings> | null = null

function normalizeMerchantPortalRuntimeSettings(payload: any = {}): MerchantPortalRuntimeSettings {
  return {
    title:
      String(payload?.merchant_portal_title || '').trim() ||
      DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS.title,
    subtitle:
      String(payload?.merchant_portal_subtitle || '').trim() ||
      DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS.subtitle,
    loginFooter:
      String(payload?.merchant_portal_login_footer || '').trim() ||
      DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS.loginFooter,
    privacyPolicy:
      String(payload?.merchant_privacy_policy || '').trim() ||
      DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS.privacyPolicy,
    serviceAgreement:
      String(payload?.merchant_service_agreement || '').trim() ||
      DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS.serviceAgreement,
  }
}

export function getCachedMerchantPortalRuntimeSettings(): MerchantPortalRuntimeSettings {
  return { ...cachedMerchantPortalRuntimeSettings }
}

export async function loadMerchantPortalRuntimeSettings(force = false): Promise<MerchantPortalRuntimeSettings> {
  if (hasLoadedMerchantPortalRuntimeSettings && !force) {
    return getCachedMerchantPortalRuntimeSettings()
  }
  if (merchantPortalRuntimePromise && !force) {
    return merchantPortalRuntimePromise
  }

  merchantPortalRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload: any) => {
      cachedMerchantPortalRuntimeSettings = normalizeMerchantPortalRuntimeSettings(payload)
      hasLoadedMerchantPortalRuntimeSettings = true
      return getCachedMerchantPortalRuntimeSettings()
    })
    .catch(() => getCachedMerchantPortalRuntimeSettings())
    .finally(() => {
      merchantPortalRuntimePromise = null
    })

  return merchantPortalRuntimePromise
}
