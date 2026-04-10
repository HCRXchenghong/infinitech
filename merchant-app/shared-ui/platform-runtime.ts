import { fetchPublicRuntimeSettings } from './api'
import { createPlatformRuntimeLoader } from '../../shared/mobile-common/platform-runtime.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createPlatformRuntimeLoader(fetchPublicRuntimeSettings)
