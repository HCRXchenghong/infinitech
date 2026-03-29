/**
 * Data sync service.
 * Uses local cached data for fast reads and syncs incrementally in the background.
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
          error: res.data?.error || `Request failed: ${res.statusCode}`,
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
  const errorText = String(error?.error || '')
  const messageText = String(error?.message || '')
  const errMsgText = String(error?.errMsg || '')
  return errorText.includes('fail') ||
    errorText.includes('connect') ||
    messageText.includes('Network') ||
    errMsgText.includes('fail')
}

function hasLocalRecords(localData: any) {
  return Array.isArray(localData) && localData.length > 0
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
    const shouldUseFreshData = Boolean(options.preferFresh)

    try {
      if (!shouldUseFreshData && hasLocalRecords(localData)) {
        return localData
      }

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
      if (!isNetworkError(error)) {
        console.error(`Failed to get ${dataset}:`, error)
      }
      return localData
    }
  }

  getApiUrl(dataset: string, conditions: DataConditions): string {
    const mapping: Record<string, string> = {
      shops: '/api/shops',
      products: conditions.featured
        ? '/api/products/featured'
        : conditions.shop_id
          ? `/api/shops/${conditions.shop_id}/menu`
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

    if (Array.isArray(serverData.products)) {
      return serverData.products
    }

    if (serverData.data && typeof serverData.data === 'object') {
      if (Array.isArray(serverData.data.products)) {
        return serverData.data.products
      }
      if (Array.isArray(serverData.data)) {
        return serverData.data
      }
    }

    if (serverData.id !== undefined && serverData.id !== null) {
      return [serverData]
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
