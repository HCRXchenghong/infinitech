import { fetchPublicRuntimeSettings } from './api.js'
import {
  buildHomeCategoriesForClient,
  createPlatformRuntimeLoader,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
} from '../../shared/mobile-common/platform-runtime.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createPlatformRuntimeLoader(fetchPublicRuntimeSettings)

export {
  buildHomeCategoriesForClient,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
}
