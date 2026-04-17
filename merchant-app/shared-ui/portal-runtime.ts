import { fetchPublicRuntimeSettings } from './api'
import { createPortalRuntimeStore, type PortalRuntimeSettings } from '../../packages/mobile-core/src/portal-runtime.js'

export interface MerchantPortalRuntimeSettings extends PortalRuntimeSettings {
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

const merchantPortalRuntimeStore = createPortalRuntimeStore<MerchantPortalRuntimeSettings>({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
  defaultSettings: DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
  fieldMap: {
    title: 'merchant_portal_title',
    subtitle: 'merchant_portal_subtitle',
    loginFooter: 'merchant_portal_login_footer',
    privacyPolicy: 'merchant_privacy_policy',
    serviceAgreement: 'merchant_service_agreement',
  },
})

export const {
  getCachedPortalRuntimeSettings: getCachedMerchantPortalRuntimeSettings,
  loadPortalRuntimeSettings: loadMerchantPortalRuntimeSettings,
  resetPortalRuntimeSettings: resetMerchantPortalRuntimeSettings,
} = merchantPortalRuntimeStore
