import { fetchPublicRuntimeSettings } from './api.js'
import {
  DEFAULT_RTC_RUNTIME_SETTINGS,
  createRTCRuntimeSettingsLoader,
} from '../../shared/mobile-common/rtc-runtime.js'

const { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings } =
  createRTCRuntimeSettingsLoader(fetchPublicRuntimeSettings)

export { DEFAULT_RTC_RUNTIME_SETTINGS, getCachedRTCRuntimeSettings, loadRTCRuntimeSettings }
