import { fetchPublicRuntimeSettings } from './api.js'
import {
  DEFAULT_RTC_RUNTIME_SETTINGS,
  createConsumerRTCRuntimeBindings,
} from '../../packages/mobile-core/src/consumer-runtime-support.js'

const { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings } =
  createConsumerRTCRuntimeBindings(fetchPublicRuntimeSettings)

export { DEFAULT_RTC_RUNTIME_SETTINGS, getCachedRTCRuntimeSettings, loadRTCRuntimeSettings }
