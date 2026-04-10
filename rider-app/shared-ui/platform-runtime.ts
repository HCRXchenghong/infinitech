import { fetchPublicRuntimeSettings } from './api'
import { createPlatformRuntimeLoader, findRiderRankLevel } from '../../shared/mobile-common/platform-runtime.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createPlatformRuntimeLoader(fetchPublicRuntimeSettings)

export { findRiderRankLevel }
