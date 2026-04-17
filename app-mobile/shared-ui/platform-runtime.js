import { fetchPublicRuntimeSettings } from './api.js'
import {
  buildHomeCategoriesForClient,
  createPlatformRuntimeLoader,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
} from '../../packages/mobile-core/src/platform-runtime.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createPlatformRuntimeLoader(fetchPublicRuntimeSettings)

export {
  buildHomeCategoriesForClient,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
}
