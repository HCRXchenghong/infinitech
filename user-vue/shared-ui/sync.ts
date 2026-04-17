/**
 * Data sync service.
 * Server data stays authoritative. Local storage is only a fast fallback cache.
 */

import config from './config'
import getLocalDB from './db'
import {
  buildSyncApiUrl,
  createSyncService,
  createUniSyncRequest,
} from '../../packages/mobile-core/src/sync-service.js'

const request = createUniSyncRequest({
  baseUrl: config.API_BASE_URL,
  timeout: config.TIMEOUT,
})

function buildApiUrl(dataset: string, conditions: Record<string, any> = {}) {
  return buildSyncApiUrl(dataset, conditions, {
    productShopMode: 'products-query',
    supportsShopCategory: true,
  })
}

let instance: ReturnType<typeof createSyncService> | null = null

export default function getSyncService() {
  if (!instance) {
    instance = createSyncService({
      getLocalDB,
      request,
      buildApiUrl,
      isDev: Boolean(config.isDev),
      emitDataSynced(payload) {
        uni.$emit('data-synced', payload)
      },
      logger: console,
    })
  }
  return instance
}
