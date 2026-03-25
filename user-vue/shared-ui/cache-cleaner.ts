/**
 * 清除所有本地缓存数据
 * 用于强制刷新数据，确保显示最新的服务器数据
 */

declare const plus: any

const DB_NAME = 'yuexiang_cache'
const DB_PATH = '_doc/yuexiang_cache.db'
const CACHE_TABLES = ['shops', 'products', 'menus', 'orders', 'sync_versions']

function isNoSuchTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const record = err as Record<string, any>
  if (record.code === -1404) return true
  const message = typeof record.message === 'string' ? record.message : ''
  return message.includes('no such table')
}

function isDatabaseAlreadyOpenError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const record = err as Record<string, any>
  if (record.code === -1402) return true
  const message = typeof record.message === 'string' ? record.message : ''
  return message.includes('Same Name Already Open')
}

function clearTables(tables: string[]) {
  if (!tables.length) {
    return
  }

  tables.forEach((table) => {
    const sql = `DELETE FROM ${table}`
    plus.sqlite.executeSql({
      name: DB_NAME,
      path: DB_PATH,
      // plus.sqlite 类型声明要求 sql: string[]，但运行时接受 string
      sql: sql as unknown as string[],
      success: () => {
        // table cleared
      },
      fail: (e: unknown) => {
        if (isNoSuchTableError(e)) {
          return
        }
        console.error(`❌ 清除表 ${table} 失败:`, e)
      }
    })
  })
}

function clearTablesFromOpenDatabase() {
  plus.sqlite.selectSql({
    name: DB_NAME,
    path: DB_PATH,
    sql: "SELECT name FROM sqlite_master WHERE type='table'",
    success: (result: Array<{ name: string }>) => {
      const existing = new Set(result.map((item) => item.name))
      const targetTables = CACHE_TABLES.filter((table) => existing.has(table))
      clearTables(targetTables)
    },
    fail: (e: unknown) => {
      clearTables(CACHE_TABLES)
    }
  })
}

/**
 * 清除SQLite数据库中的所有数据
 */
export function clearSQLiteCache() {
  // #ifdef APP-PLUS
  try {
    if (typeof plus !== 'undefined' && plus && plus.sqlite) {
      const isOpen =
        typeof plus.sqlite.isOpenDatabase === 'function' &&
        plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })

      if (isOpen) {
        clearTablesFromOpenDatabase()
        return
      }

      plus.sqlite.openDatabase({
        name: DB_NAME,
        path: DB_PATH,
        success: () => {
          clearTablesFromOpenDatabase()
        },
        fail: (e: unknown) => {
          if (isDatabaseAlreadyOpenError(e)) {
            clearTablesFromOpenDatabase()
            return
          }
          console.error('❌ 打开数据库失败:', e)
        }
      })
    }
  } catch (err) {
    console.error('❌ 清除SQLite缓存失败:', err)
  }
  // #endif
}

/**
 * 清除Storage中的缓存数据
 */
export function clearStorageCache() {
  try {
    // 清除数据缓存
    uni.removeStorageSync('shops')
    uni.removeStorageSync('products')
    uni.removeStorageSync('menus')
    uni.removeStorageSync('orders')
    uni.removeStorageSync('sync_versions')

    // 清除同步状态
    uni.removeStorageSync('lastSyncTime')
  } catch (err) {
    console.error('❌ 清除Storage缓存失败:', err)
  }
}

/**
 * 清除所有缓存（SQLite + Storage）
 */
export function clearAllCache() {
  clearSQLiteCache()
  clearStorageCache()
}

/**
 * 检查是否需要清除缓存
 * 如果app版本更新，自动清除缓存
 */
export function checkAndClearCacheIfNeeded() {
  const currentVersion = '3.0.1' // 当前app版本（用于触发一次缓存迁移）
  const lastVersion = uni.getStorageSync('appVersion')

  if (lastVersion !== currentVersion) {
    clearAllCache()
    uni.setStorageSync('appVersion', currentVersion)
  }
}
