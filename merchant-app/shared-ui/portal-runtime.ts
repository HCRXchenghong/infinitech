import { fetchPublicRuntimeSettings } from './api'
import { type PortalRuntimeSettings } from '../../packages/mobile-core/src/portal-runtime.js'
import {
  createDefaultRolePortalRuntimeBindings,
  DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS as SHARED_DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/role-portal-runtime-shell.js'

export interface MerchantPortalRuntimeSettings extends PortalRuntimeSettings {
  title: string
  subtitle: string
  loginFooter: string
  privacyPolicy: string
  serviceAgreement: string
}

export const DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS: MerchantPortalRuntimeSettings =
  SHARED_DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS

const merchantPortalRuntimeStore = createDefaultRolePortalRuntimeBindings({
  role: 'merchant',
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
  defaultSettings: DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
})

export const {
  getCachedPortalRuntimeSettings: getCachedMerchantPortalRuntimeSettings,
  loadPortalRuntimeSettings: loadMerchantPortalRuntimeSettings,
  resetPortalRuntimeSettings: resetMerchantPortalRuntimeSettings,
} = merchantPortalRuntimeStore
