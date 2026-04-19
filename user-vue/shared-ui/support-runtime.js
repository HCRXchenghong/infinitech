import { fetchPublicRuntimeSettings } from './api.js'
import {
  createConsumerSupportRuntimeBindings,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
} from '../../packages/mobile-core/src/consumer-runtime-support.js'

const supportRuntimeStore = createConsumerSupportRuntimeBindings(fetchPublicRuntimeSettings)

export const {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  resetSupportRuntimeSettings,
} = supportRuntimeStore

export { DEFAULT_SUPPORT_RUNTIME_SETTINGS }
