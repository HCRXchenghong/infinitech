import { fetchPublicRuntimeSettings } from './api'
import {
  createSupportRuntimeStore,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/support-runtime.js'

const supportRuntimeStore = createSupportRuntimeStore({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
})

export const {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  resetSupportRuntimeSettings,
} = supportRuntimeStore

export { DEFAULT_SUPPORT_RUNTIME_SETTINGS }
export type { SupportRuntimeSettings } from '../../packages/mobile-core/src/support-runtime.js'
