import { fetchPublicRuntimeSettings } from './api'
import { createPortalRuntimeStore, type PortalRuntimeSettings } from '../../packages/mobile-core/src/portal-runtime.js'

export interface RiderPortalRuntimeSettings extends PortalRuntimeSettings {
  title: string
  subtitle: string
  loginFooter: string
}

export const DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS: RiderPortalRuntimeSettings = {
  title: '骑手登录',
  subtitle: '悦享e食 · 骑手端',
  loginFooter: '骑手账号由平台邀约开通',
}

const riderPortalRuntimeStore = createPortalRuntimeStore<RiderPortalRuntimeSettings>({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
  defaultSettings: DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
  fieldMap: {
    title: 'rider_portal_title',
    subtitle: 'rider_portal_subtitle',
    loginFooter: 'rider_portal_login_footer',
  },
})

export const {
  getCachedPortalRuntimeSettings: getCachedRiderPortalRuntimeSettings,
  loadPortalRuntimeSettings: loadRiderPortalRuntimeSettings,
  resetPortalRuntimeSettings: resetRiderPortalRuntimeSettings,
} = riderPortalRuntimeStore
