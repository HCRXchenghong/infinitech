import { fetchPublicRuntimeSettings } from './api.js'
import {
  DEFAULT_RTC_RUNTIME_SETTINGS,
  createRTCRuntimeSettingsLoader,
} from '../../packages/client-sdk/src/rtc-runtime.js'

const { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings } =
  createRTCRuntimeSettingsLoader(fetchPublicRuntimeSettings)

export { DEFAULT_RTC_RUNTIME_SETTINGS, getCachedRTCRuntimeSettings, loadRTCRuntimeSettings }
