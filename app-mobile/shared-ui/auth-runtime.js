import { fetchPublicRuntimeSettings } from './api.js'
import { createConsumerAuthRuntimeStore } from '../../packages/mobile-core/src/consumer-auth-runtime.js'

const consumerAuthRuntimeStore = createConsumerAuthRuntimeStore({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
})

export const {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
  resetConsumerAuthRuntimeSettings,
} = consumerAuthRuntimeStore

export { DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS } from '../../packages/mobile-core/src/consumer-auth-runtime.js'
