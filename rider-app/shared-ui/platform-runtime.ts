import { fetchPublicRuntimeSettings } from './api'
import { createPlatformRuntimeLoader, findRiderRankLevel } from '../../packages/mobile-core/src/platform-runtime.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createPlatformRuntimeLoader(fetchPublicRuntimeSettings)

export { findRiderRankLevel }
