/**
 * 数据同步服务
 * 实现只读本地缓存与增量同步
 */

import config from './config'
import getLocalDB, { LocalDB } from './db'

// 请求选项接口
interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT'
  data?: any
  header?: Record<string, string>
}

// 同步数据接口
interface SyncData {
  changed?: any[]
  deleted?: number[]
  newVersion: number
}

// 同步状态接口
interface SyncState {
  shops?: number
  products?: number
  menus?: number
  orders?: number
}

// 数据条件接口
interface DataConditions {
  id?: number
  shop_id?: number
  user_id?: number
  featured?: boolean
}

// 直接使用 uni.request 避免循环依赖
function request(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: config.API_BASE_URL + options.url,
      method: (options.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT',
      data: options.data || {},
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        options.header || {}
      ),
      timeout: config.TIMEOUT,
      success(res: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({
            error: res.data?.error || `请求失败: ${res.statusCode}`,
            statusCode: res.statusCode
          })
        }
      },
      fail(err: any) {
        reject({
          error: err.errMsg || '网络请求失败',
          message: err.errMsg || '网络请求失败'
        })
      }
    })
  })
}

class SyncService {
  private localDB: LocalDB
  private syncing: boolean

  constructor() {
    this.localDB = getLocalDB()
    this.syncing = false
  }

  /**
   * 初始化同步（App 启动时调用）
   */
  async init(): Promise<void> {
    try {
      // 1. 初始化本地数据库
      await this.localDB.init()

      // 2. 后台同步最新数据
      this.syncInBackground()
    } catch (error) {
      console.error('❌ 同步初始化失败:', error)
    }
  }

  /**
   * 后台同步（不阻塞 UI）
   */
  async syncInBackground(): Promise<void> {
    if (this.syncing) {
      return
    }
    
    this.syncing = true
    
    try {
      // 1. 获取本地版本号
      const localState: SyncState = await this.localDB.getLocalSyncState()
      
      // 2. 获取服务器版本号
      const serverState: SyncState = await request({
        url: '/api/sync/state',
        method: 'GET'
      })
      
      // 3. 对比版本，增量同步
      const datasets = ['shops', 'products', 'menus', 'orders']
      
      for (const dataset of datasets) {
        const localVersion = localState[dataset as keyof SyncState] || 0
        const serverVersion = serverState[dataset as keyof SyncState] || 0
        
        if (serverVersion > localVersion) {
          await this.syncDataset(dataset, localVersion)
        }
      }
    } catch (error: any) {
      // 检查是否是网络连接错误
      const isNetworkError = error?.error?.includes('fail') || 
                            error?.error?.includes('connect') ||
                            error?.errMsg?.includes('fail') ||
                            error?.message?.includes('无法连接')
      
      if (isNetworkError) {
        // 网络错误是预期的（服务器可能未启动或离线），使用警告级别而不是错误
        console.warn('⚠️ 无法连接到服务器，使用本地缓存数据。请确认：')
        console.warn('   1. BFF 服务是否在运行（端口 25500）')
        console.warn('   2. IP 地址是否正确（当前配置：' + config.API_BASE_URL + '）')
        console.warn('   3. 手机和电脑是否在同一 Wi-Fi 网络')
      } else {
        // 其他错误（如服务器返回错误）才记录为错误
        console.error('❌ 同步失败:', error)
      }
      // 同步失败不影响使用，继续使用本地缓存
    } finally {
      this.syncing = false
    }
  }

  /**
   * 同步单个数据集
   */
  async syncDataset(dataset: string, sinceVersion: number): Promise<void> {
    try {
      const response: SyncData = await request({
        url: `/api/sync/${dataset}?since=${sinceVersion}`,
        method: 'GET'
      })
      
      // 保存到本地数据库
      await this.localDB.saveSyncData(dataset, response)
      
      // 触发更新事件
      uni.$emit('data-synced', { dataset, version: response.newVersion })
    } catch (error: any) {
      // 网络错误不抛出，让上层处理
      const isNetworkError = error?.error?.includes('fail') || 
                            error?.error?.includes('connect') ||
                            error?.errMsg?.includes('fail')
      
      if (!isNetworkError) {
        // 非网络错误才记录
        console.error(`❌ 同步 ${dataset} 失败:`, error)
      }
      throw error
    }
  }

  /**
   * 获取数据（优先本地，失败则请求服务器）
   */
  async getData(dataset: string, conditions: DataConditions = {}): Promise<any> {
    try {
      // 1. 先尝试从本地读取
      const localData = await this.localDB.getLocalData(dataset, conditions)
      
      if (localData && localData.length > 0) {
        return localData
      }

      // 2. 本地没有，请求服务器
      const serverData = await request({
        url: this.getApiUrl(dataset, conditions),
        method: 'GET'
      })
      
      // 3. 保存到本地（临时缓存）
      // 处理数组和对象两种情况
      if (serverData) {
        if (Array.isArray(serverData)) {
          await this.localDB.saveSyncData(dataset, {
            changed: serverData,
            deleted: [],
            newVersion: Date.now()
          })
        } else if (typeof serverData === 'object') {
          // 单个对象，转换为数组
          await this.localDB.saveSyncData(dataset, {
            changed: [serverData],
            deleted: [],
            newVersion: Date.now()
          })
        }
      }
      
      return serverData
    } catch (error: any) {
      // 检查是否是网络连接错误
      const isNetworkError = error?.error?.includes('fail') || 
                            error?.error?.includes('connect') ||
                            error?.errMsg?.includes('fail') ||
                            error?.message?.includes('无法连接')
      
      if (isNetworkError) {
        // 网络错误：静默降级到本地数据
      } else {
        // 其他错误（如服务器返回错误）才记录
        console.error(`❌ 获取 ${dataset} 失败:`, error)
      }
      
      // 如果在线请求失败，返回本地数据（即使为空）
      return await this.localDB.getLocalData(dataset, conditions)
    }
  }

  /**
   * 获取 API URL
   */
  getApiUrl(dataset: string, conditions: DataConditions): string {
    const mapping: Record<string, string> = {
      shops: '/api/shops',
      products: conditions.featured ? '/api/products/featured' : 
                conditions.shop_id ? `/api/shops/${conditions.shop_id}/menu` : 
                conditions.id ? `/api/products/${conditions.id}` : '/api/products',
      menus: `/api/shops/${conditions.shop_id}/menu`,
      orders: conditions.id ? `/api/orders/${conditions.id}` :
              conditions.user_id ? `/api/orders/user/${conditions.user_id}` : '/api/orders'
    }
    return mapping[dataset] || `/api/${dataset}`
  }

  /**
   * 强制同步（用户下拉刷新时调用）
   */
  async forceSync(): Promise<void> {
    this.syncing = false // 重置状态
    await this.syncInBackground()
  }
}

// 单例模式
let instance: SyncService | null = null
export default function getSyncService(): SyncService {
  if (!instance) {
    instance = new SyncService()
  }
  return instance
}
