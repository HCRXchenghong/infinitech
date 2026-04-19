import { fetchPublicRuntimeSettings } from './api.js'
import {
  buildHomeCategoriesForClient,
  createConsumerPlatformRuntimeBindings,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
} from '../../packages/mobile-core/src/consumer-runtime-support.js'

export const {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} = createConsumerPlatformRuntimeBindings(fetchPublicRuntimeSettings)

export {
  buildHomeCategoriesForClient,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled
}
