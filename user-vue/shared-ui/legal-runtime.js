import { fetchPublicRuntimeSettings } from './api.js'
import { createConsumerLegalRuntimeBindings } from '../../packages/mobile-core/src/consumer-runtime-support.js'

const legalRuntimeStore = createConsumerLegalRuntimeBindings(fetchPublicRuntimeSettings)

export const {
  getCachedLegalRuntimeSettings,
  loadLegalRuntimeSettings,
  resetLegalRuntimeSettings,
} = legalRuntimeStore
