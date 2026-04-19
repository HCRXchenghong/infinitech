import { fetchPublicRuntimeSettings } from './api'
import { createDefaultRolePlatformRuntimeBindings } from '../../packages/mobile-core/src/role-runtime-support.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createDefaultRolePlatformRuntimeBindings({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
})
