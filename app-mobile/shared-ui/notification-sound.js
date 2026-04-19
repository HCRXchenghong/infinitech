import config from './config'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from './support-runtime.js'
import { createConsumerNotificationSoundBridge } from '../../packages/mobile-core/src/consumer-notification-sound.js'

const notificationSoundBridge = createConsumerNotificationSoundBridge({
  config,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
})

export const {
  bindNotificationSoundBridge,
  playMessageNotificationSound,
  playOrderNotificationSound,
} = notificationSoundBridge

void notificationSoundBridge.warmupNotificationSoundRuntime()
