import { isRuntimeRouteEnabled, loadPlatformRuntimeSettings } from './platform-runtime.js'
import { ensureConsumerRuntimeFeatureOpen } from '../../packages/mobile-core/src/consumer-runtime-support.js'

export function ensureRuntimeFeatureOpen(featureKey, clientScope) {
  return ensureConsumerRuntimeFeatureOpen(featureKey, {
    clientScope,
    loadPlatformRuntimeSettings,
    isRuntimeRouteEnabled,
  })
}
