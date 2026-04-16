/**
 * Data sync service.
 * Server data stays authoritative. Local storage is only a fast fallback cache.
 */

import config from './config'
import getLocalDB, { LocalDB } from './db'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT'
  data?: any
  header?: Record<string, string>
}

interface SyncData {
  changed?: any[]
  deleted?: Array<number | string>
  newVersion: number
}

interface SyncState {
  shops?: number
  products?: number
  orders?: number
}

interface DataConditions {
  id?: number
  shop_id?: number
  user_id?: number
  featured?: boolean
  category?: string
}

interface GetDataOptions {
  preferFresh?: boolean
}

function request(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: config.API_BASE_URL + options.url,
      method: (options.method || 'GET') as RequestOptions['method'],
      data: options.data || {},
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        options.header || {}
      ),
      timeout: config.TIMEOUT,
      success(res: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject({
          error: (res.data && res.data.error) || `Request failed: ${res.statusCode}`,
          statusCode: res.statusCode
        })
      },
      fail(err: any) {
        reject({
          error: err.errMsg || 'Network request failed',
          message: err.errMsg || 'Network request failed'
        })
      }
    })
  })
}

function isNetworkError(error: any) {
  const safeError = error && typeof error === 'object' ? error : {}
  const errorText = String(safeError.error || '')
  const messageText = String(safeError.message || '')
  const errMsgText = String(safeError.errMsg || '')
  return errorText.includes('fail') ||
    errorText.includes('connect') ||
    messageText.includes('Network') ||
    errMsgText.includes('fail')
}

class SyncService {
  private localDB: LocalDB
  private syncing: boolean

  constructor() {
    this.localDB = getLocalDB()
    this.syncing = false
  }

  async init(): Promise<void> {
    try {
      await this.localDB.init()
      void this.syncInBackground()
    } catch (error) {
      console.error('Sync initialization failed:', error)
    }
  }

  async syncInBackground(): Promise<void> {
    if (this.syncing) return

    this.syncing = true
    try {
      const localState: SyncState = await this.localDB.getLocalSyncState()
      const serverState: SyncState = await request({
        url: '/api/sync/state',
        method: 'GET'
      })

      const datasets = ['shops', 'products', 'orders']
      for (const dataset of datasets) {
        const localVersion = Number(localState[dataset as keyof SyncState] || 0)
        const serverVersion = Number(serverState[dataset as keyof SyncState] || 0)
        let sinceVersion = localVersion

        if (localVersion > serverVersion) {
          await this.localDB.saveSyncData(dataset, {
            changed: [],
            deleted: [],
            newVersion: serverVersion
          })
          sinceVersion = serverVersion
        }

        if (serverVersion > sinceVersion) {
          await this.syncDataset(dataset, sinceVersion)
        }
      }
    } catch (error: any) {
      if (!isNetworkError(error)) {
        console.error('Background sync failed:', error)
      }
    } finally {
      this.syncing = false
    }
  }

  async syncDataset(dataset: string, sinceVersion: number): Promise<void> {
    try {
      const response: SyncData = await request({
        url: `/api/sync/${dataset}?since=${sinceVersion}`,
        method: 'GET'
      })

      await this.localDB.saveSyncData(dataset, response)
      uni.$emit('data-synced', { dataset, version: response.newVersion })
    } catch (error: any) {
      if (!isNetworkError(error)) {
        console.error(`Failed to sync ${dataset}:`, error)
      }
      throw error
    }
  }

  async getData(dataset: string, conditions: DataConditions = {}, options: GetDataOptions = {}): Promise<any> {
    const localData = await this.localDB.getLocalData(dataset, conditions)

    try {
      const serverData = await request({
        url: this.getApiUrl(dataset, conditions),
        method: 'GET'
      })

      const recordsToCache = this.normalizeRecords(serverData)
      if (recordsToCache.length > 0) {
        await this.localDB.saveSyncData(dataset, {
          changed: recordsToCache,
          deleted: [],
          newVersion: Date.now()
        })
      }

      return serverData
    } catch (error: any) {
      const shouldUseFreshData = Boolean(options.preferFresh)
      if (!isNetworkError(error)) {
        console.error(`Failed to get ${dataset}:`, error)
      }
      if (shouldUseFreshData) {
        throw error
      }
      return localData
    }
  }

  getApiUrl(dataset: string, conditions: DataConditions): string {
    const encodedCategory = conditions.category ? encodeURIComponent(conditions.category) : ''
    const mapping: Record<string, string> = {
      shops: conditions.id
        ? `/api/shops/${conditions.id}`
        : conditions.category
          ? `/api/shops?category=${encodedCategory}`
          : '/api/shops',
      products: conditions.featured
        ? '/api/products/featured'
        : conditions.shop_id
          ? `/api/products?shopId=${conditions.shop_id}`
          : conditions.id
            ? `/api/products/${conditions.id}`
            : '/api/products',
      orders: conditions.id
        ? `/api/orders/${conditions.id}`
        : conditions.user_id
          ? `/api/orders/user/${conditions.user_id}`
          : '/api/orders'
    }
    return mapping[dataset] || `/api/${dataset}`
  }

  normalizeRecords(serverData: any): any[] {
    if (!serverData) return []
    if (Array.isArray(serverData)) return serverData
    if (typeof serverData !== 'object') return []
    if (Object.prototype.hasOwnProperty.call(serverData, 'error')) return []

    const sources = [serverData, serverData.data].filter(
      (value) => value && typeof value === 'object'
    ) as Record<string, any>[]

    for (const source of sources) {
      if (Array.isArray(source.products)) return source.products
      if (Array.isArray(source.shops)) return source.shops
      if (Array.isArray(source.items)) return source.items
      if (Array.isArray(source.list)) return source.list
      if (Array.isArray(source.data)) return source.data
      if (source.id !== undefined && source.id !== null) return [source]
    }

    if (config.isDev) {
      console.warn('Skip unsupported sync payload shape', {
        keys: Object.keys(serverData)
      })
    }
    return []
  }

  async forceSync(): Promise<void> {
    this.syncing = false
    await this.syncInBackground()
  }
}

let instance: SyncService | null = null

export default function getSyncService(): SyncService {
  if (!instance) {
    instance = new SyncService()
  }
  return instance
}
