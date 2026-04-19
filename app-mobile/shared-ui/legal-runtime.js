import { fetchPublicRuntimeSettings } from './api.js'
import { createConsumerLegalRuntimeStore } from '../../packages/mobile-core/src/consumer-legal-runtime.js'

const legalRuntimeStore = createConsumerLegalRuntimeStore({
  fetchRuntimeSettings: fetchPublicRuntimeSettings,
})

export const {
  getCachedLegalRuntimeSettings,
  loadLegalRuntimeSettings,
  resetLegalRuntimeSettings,
} = legalRuntimeStore
