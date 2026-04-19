import { fetchPublicRuntimeSettings } from './api'
import {
  createDefaultRoleSupportRuntimeBindings,
  DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS as DEFAULT_SUPPORT_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/role-runtime-support.js'

const supportRuntimeStore = createDefaultRoleSupportRuntimeBindings({
  role: 'rider',
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
})

export const {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  resetSupportRuntimeSettings,
} = supportRuntimeStore

export { DEFAULT_SUPPORT_RUNTIME_SETTINGS }
export type { SupportRuntimeSettings } from '../../packages/mobile-core/src/support-runtime.js'
