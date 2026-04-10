/**
 * Clears cached local data.
 * Use this when the app must force a fresh server-backed reload.
 */

declare const plus: any

const DB_NAME = 'yuexiang_cache'
const DB_PATH = '_doc/yuexiang_cache.db'
const CACHE_TABLES = ['shops', 'products', 'orders', 'sync_versions']

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
    plus.sqlite.executeSql({
      name: DB_NAME,
      path: DB_PATH,
      // The runtime accepts a single SQL string even though the typing expects string[].
      sql: `DELETE FROM ${table}` as unknown as string[],
      success: () => {
        // table cleared
      },
      fail: (e: unknown) => {
        if (isNoSuchTableError(e)) {
          return
        }
        console.error(`Failed to clear table ${table}:`, e)
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
    fail: () => {
      clearTables(CACHE_TABLES)
    }
  })
}

/**
 * Clears all SQLite-backed cached data.
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
          console.error('Failed to open cache database:', e)
        }
      })
    }
  } catch (err) {
    console.error('Failed to clear SQLite cache:', err)
  }
  // #endif
}

/**
 * Clears Storage-backed cached data.
 */
export function clearStorageCache() {
  try {
    uni.removeStorageSync('shops')
    uni.removeStorageSync('products')
    uni.removeStorageSync('orders')
    uni.removeStorageSync('sync_versions')
    uni.removeStorageSync('lastSyncTime')
  } catch (err) {
    console.error('Failed to clear Storage cache:', err)
  }
}

/**
 * Clears all local caches.
 */
export function clearAllCache() {
  clearSQLiteCache()
  clearStorageCache()
}

/**
 * Clears cache automatically after a cache schema bump.
 */
export function checkAndClearCacheIfNeeded() {
  const currentVersion = '3.0.1'
  const lastVersion = uni.getStorageSync('appVersion')

  if (lastVersion !== currentVersion) {
    clearAllCache()
    uni.setStorageSync('appVersion', currentVersion)
  }
}
