import { fetchPublicRuntimeSettings } from './api'
import { type PortalRuntimeSettings } from '../../packages/mobile-core/src/portal-runtime.js'
import {
  createDefaultRolePortalRuntimeBindings,
  DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS as SHARED_DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/role-portal-runtime-shell.js'

export interface RiderPortalRuntimeSettings extends PortalRuntimeSettings {
  title: string
  subtitle: string
  loginFooter: string
}

export const DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS: RiderPortalRuntimeSettings =
  SHARED_DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS

const riderPortalRuntimeStore = createDefaultRolePortalRuntimeBindings({
  role: 'rider',
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
  defaultSettings: DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
})

export const {
  getCachedPortalRuntimeSettings: getCachedRiderPortalRuntimeSettings,
  loadPortalRuntimeSettings: loadRiderPortalRuntimeSettings,
  resetPortalRuntimeSettings: resetRiderPortalRuntimeSettings,
} = riderPortalRuntimeStore
