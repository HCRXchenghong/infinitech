import { fetchPublicRuntimeSettings } from './api'
import {
  createSupportRuntimeStore,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS as DEFAULT_SHARED_SUPPORT_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/support-runtime.js'

export const DEFAULT_SUPPORT_RUNTIME_SETTINGS = {
  ...DEFAULT_SHARED_SUPPORT_RUNTIME_SETTINGS,
  aboutSummary: '骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。',
}

const supportRuntimeStore = createSupportRuntimeStore({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
  defaultSettings: DEFAULT_SUPPORT_RUNTIME_SETTINGS,
})

export const {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  resetSupportRuntimeSettings,
} = supportRuntimeStore

export type { SupportRuntimeSettings } from '../../packages/mobile-core/src/support-runtime.js'
