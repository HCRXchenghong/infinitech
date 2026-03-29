/**
 * 本地 SQLite 数据库管理（只读镜像）
 * 用于离线查看数据，所有写操作必须在线完成
 */

// uni-app SQLite 插件（需要安装）
// npm install @dcloudio/uni-app-plus
// 或使用 uni-app 内置的 plus.sqlite

class LocalDB {
  constructor() {
    this.db = null
    this.dbName = 'yuexiang_cache'
    this.dbPath = '_doc/yuexiang_cache.db'
    this.isInitialized = false
    this.initPromise = null // 防止重复初始化
  }

  /**
   * 打开数据库（内部方法）
   */
  openDatabase(resolve, reject) {
    plus.sqlite.openDatabase({
      name: this.dbName,
      path: this.dbPath,
      success: (e) => {
        // 注意：uni-app 的 plus.sqlite.openDatabase 返回的对象需要通过 transaction 使用
        // 我们只需要保存数据库名称和路径，实际执行 SQL 时使用 plus.sqlite.executeSql
        this.db = {
          name: this.dbName,
          path: this.dbPath
        }
        
        this.createTables().then(() => {
          this.isInitialized = true
          this.initPromise = null
          resolve()
        }).catch((err) => {
          this.initPromise = null
          reject(err)
        })
      },
      fail: (e) => {
        console.error('❌ 本地数据库打开失败:', e)
        this.initPromise = null
        reject(e)
      }
    })
  }

  /**
   * 初始化数据库
   */
  async init() {
    if (this.isInitialized && this.db) {
      return Promise.resolve()
    }
    
    // 如果正在初始化，返回同一个 Promise
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      // App 环境使用 plus.sqlite
      // 先尝试关闭可能已打开的数据库
      try {
        plus.sqlite.closeDatabase({
          name: this.dbName,
          path: this.dbPath,
          success: () => {
            this.openDatabase(resolve, reject)
          },
          fail: (err) => {
            // 关闭失败（可能数据库未打开），直接打开
            this.openDatabase(resolve, reject)
          }
        })
      } catch (e) {
        // 关闭操作异常，直接打开
        this.openDatabase(resolve, reject)
      }
      // #endif

      // #ifdef MP
      // 小程序环境使用本地存储
      // 小程序环境使用本地存储
      this.createTables().then(() => {
        this.isInitialized = true
        this.initPromise = null
        resolve()
      }).catch((err) => {
        this.initPromise = null
        reject(err)
      })
      // #endif
    })
    
    return this.initPromise
  }

  /**
   * 顺序执行SQL语句
   */
  executeSqlSequential(sqls, callback) {
    let index = 0
    const next = () => {
      if (index >= sqls.length) return callback(null)
      const sql = sqls[index]
      plus.sqlite.executeSql({
        name: this.db.name,
        path: this.db.path,
        sql: sql,
        success: () => { index++; next() },
        fail: (err) => { console.error('SQL失败:', sql, err); callback(err) }
      })
    }
    next()
  }

  /**
   * 创建数据表
   */
  async createTables() {
    // bump schema to rebuild stale local tables and avoid sync SQL mismatches
    const SCHEMA_VERSION = 8

    // #ifdef APP-PLUS
    if (!this.db || !this.db.name) return Promise.reject(new Error('数据库对象无效'))

    return new Promise((resolve, reject) => {
      // 第一步：确保 schema_version 表存在
      plus.sqlite.executeSql({
        name: this.db.name,
        path: this.db.path,
        sql: 'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)',
        success: () => {
          // 第二步：查询当前版本
          plus.sqlite.selectSql({
            name: this.db.name,
            path: this.db.path,
            sql: 'SELECT version FROM schema_version LIMIT 1',
            success: (result) => {
              const currentVersion = result.length > 0 ? result[0].version : 0

              if (currentVersion >= SCHEMA_VERSION) {
                return resolve()
              }

              // 第三步：需要升级 - 先DROP所有旧表，再CREATE新表
              const dropSqls = [
                'DROP TABLE IF EXISTS shops',
                'DROP TABLE IF EXISTS products',
                'DROP TABLE IF EXISTS menus',
                'DROP TABLE IF EXISTS orders',
                'DROP TABLE IF EXISTS sync_versions'
              ]

              this.executeSqlSequential(dropSqls, (err) => {
                if (err) return reject(err)

                const createSqls = [
                  `CREATE TABLE shops (
                    id TEXT PRIMARY KEY, merchantId TEXT, merchant_id TEXT, name TEXT, category TEXT,
                    coverImage TEXT, cover_image TEXT, avatar TEXT, logo TEXT, rating REAL,
                    monthlySales INTEGER, monthly_sales INTEGER, sales INTEGER, perCapita INTEGER,
                    per_capita INTEGER, announcement TEXT, address TEXT, phone TEXT,
                    businessHours TEXT, business_hours TEXT, tags TEXT, discounts TEXT,
                    isBrand INTEGER, is_brand INTEGER, isTodayRecommended INTEGER DEFAULT 0,
                    is_today_recommended INTEGER DEFAULT 0, todayRecommendPosition INTEGER DEFAULT 0,
                    today_recommend_position INTEGER DEFAULT 0, isActive INTEGER, is_active INTEGER,
                    minPrice REAL, min_price REAL, deliveryPrice REAL, delivery_price REAL,
                    deliveryTime TEXT, delivery_time TEXT, distance TEXT, created_at TEXT,
                    version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                  )`,
                  `CREATE TABLE products (
                    id TEXT PRIMARY KEY, shopId TEXT, shop_id TEXT, categoryId TEXT,
                    category_id TEXT, category TEXT, name TEXT, description TEXT, image TEXT,
                    images TEXT, price REAL, originalPrice REAL, original_price REAL,
                    monthlySales INTEGER, monthly_sales INTEGER, rating REAL,
                    goodReviews INTEGER, good_reviews INTEGER, stock INTEGER, unit TEXT,
                    nutrition TEXT, tags TEXT, isRecommend INTEGER, is_recommend INTEGER,
                    isFeatured INTEGER, featured INTEGER, is_featured INTEGER,
                    isActive INTEGER, is_active INTEGER, sortOrder INTEGER, sort_order INTEGER,
                    shopName TEXT, shop_name TEXT, tag TEXT, created_at TEXT,
                    version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                  )`,
                  `CREATE TABLE orders (
                    id TEXT PRIMARY KEY, user_id TEXT, shop_id TEXT, status TEXT,
                    total_price REAL, items TEXT, address TEXT, created_at INTEGER,
                    version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                  )`,
                  `CREATE TABLE sync_versions (
                    dataset TEXT PRIMARY KEY, version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                  )`,
                  `DELETE FROM schema_version`,
                  `INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`
                ]

                this.executeSqlSequential(createSqls, (err) => {
                  if (err) return reject(err)
                  resolve()
                })
              })
            },
            fail: () => {
              // 首次创建，version表为空
              const createSqls = [
                `CREATE TABLE IF NOT EXISTS shops (
                  id TEXT PRIMARY KEY, merchantId TEXT, merchant_id TEXT, name TEXT, category TEXT,
                  coverImage TEXT, cover_image TEXT, avatar TEXT, logo TEXT, rating REAL,
                  monthlySales INTEGER, monthly_sales INTEGER, sales INTEGER, perCapita INTEGER,
                  per_capita INTEGER, announcement TEXT, address TEXT, phone TEXT,
                  businessHours TEXT, business_hours TEXT, tags TEXT, discounts TEXT,
                  isBrand INTEGER, is_brand INTEGER, isTodayRecommended INTEGER DEFAULT 0,
                  is_today_recommended INTEGER DEFAULT 0, todayRecommendPosition INTEGER DEFAULT 0,
                  today_recommend_position INTEGER DEFAULT 0, isActive INTEGER, is_active INTEGER,
                  minPrice REAL, min_price REAL, deliveryPrice REAL, delivery_price REAL,
                  deliveryTime TEXT, delivery_time TEXT, distance TEXT, created_at TEXT,
                  version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS products (
                  id TEXT PRIMARY KEY, shopId TEXT, shop_id TEXT, categoryId TEXT,
                  category_id TEXT, category TEXT, name TEXT, description TEXT, image TEXT,
                  images TEXT, price REAL, originalPrice REAL, original_price REAL,
                  monthlySales INTEGER, monthly_sales INTEGER, rating REAL,
                  goodReviews INTEGER, good_reviews INTEGER, stock INTEGER, unit TEXT,
                  nutrition TEXT, tags TEXT, isRecommend INTEGER, is_recommend INTEGER,
                  isFeatured INTEGER, featured INTEGER, is_featured INTEGER,
                  isActive INTEGER, is_active INTEGER, sortOrder INTEGER, sort_order INTEGER,
                  shopName TEXT, shop_name TEXT, tag TEXT, created_at TEXT,
                  version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS orders (
                  id TEXT PRIMARY KEY, user_id TEXT, shop_id TEXT, status TEXT,
                  total_price REAL, items TEXT, address TEXT, created_at INTEGER,
                  version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS sync_versions (
                  dataset TEXT PRIMARY KEY, version INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
                )`,
                `INSERT OR REPLACE INTO schema_version (version) VALUES (${SCHEMA_VERSION})`
              ]

              this.executeSqlSequential(createSqls, (err) => {
                if (err) return reject(err)
                resolve()
              })
            }
          })
        },
        fail: (err) => reject(err)
      })
    })
    // #endif

    // #ifdef MP
    return Promise.resolve()
    // #endif
  }

  /**
   * 获取同步状态（从本地读取版本号）
   */
  async getLocalSyncState() {
    await this.init()
    
    // #ifdef APP-PLUS
    if (!this.db || !this.db.name) {
      console.error('❌ 数据库对象无效，无法获取同步状态')
      return Promise.resolve({
        shops: 0,
        products: 0,
        orders: 0
      })
    }
    
    return new Promise((resolve) => {
      const state = {}
      const datasets = ['shops', 'products', 'orders']
      let completed = 0
      
      const checkComplete = () => {
        completed++
        if (completed === datasets.length) {
          // 确保所有字段都有值
          datasets.forEach(d => {
            if (state[d] === undefined) {
              state[d] = 0
            }
          })
          resolve(state)
        }
      }
      
      datasets.forEach((dataset) => {
        // 手动替换参数（因为 plus.sqlite.selectSql 可能不支持 args 参数）
        const sql = `SELECT version FROM sync_versions WHERE dataset = '${dataset.replace(/'/g, "''")}'`
        
        plus.sqlite.selectSql({
          name: this.db.name,
          path: this.db.path,
          sql: sql,
          success: (result) => {
            state[dataset] = result.length > 0 ? result[0].version : 0
            checkComplete()
          },
          fail: () => {
            state[dataset] = 0
            checkComplete()
          }
        })
      })
    })
    // #endif

    // #ifdef MP
    // 小程序环境：使用本地存储
    const state = uni.getStorageSync('sync_versions') || {}
    return Promise.resolve({
      shops: state.shops || 0,
      products: state.products || 0,
      orders: state.orders || 0
    })
    // #endif
  }

  /**
   * 保存同步数据（增量更新）
   */
  async saveSyncData(dataset, data) {
    await this.init()

    const { changed = [], deleted = [], newVersion = 0 } = data

    // #ifdef APP-PLUS
    if (!this.db || !this.db.name) {
      console.error('❌ 数据库对象无效，无法保存同步数据')
      return Promise.reject(new Error('数据库对象无效'))
    }

    return new Promise((resolve, reject) => {
      const tableName = this.getTableName(dataset)
      let completed = 0
      let hasError = false
      const totalOperations = changed.length + deleted.length + 1 // +1 for version update
      const safeVersion = Number.isFinite(Number(newVersion)) ? Number(newVersion) : Date.now()

      // 每个表允许的列名（防止API返回多余字段导致SQL错误）
      const tableColumns = {
        shops: ['id','merchantId','merchant_id','name','category','coverImage','cover_image','avatar','logo','rating','monthlySales','monthly_sales','sales','perCapita','per_capita','announcement','address','phone','businessHours','business_hours','tags','discounts','isBrand','is_brand','isTodayRecommended','is_today_recommended','todayRecommendPosition','today_recommend_position','isActive','is_active','minPrice','min_price','deliveryPrice','delivery_price','deliveryTime','delivery_time','distance','created_at','version','updated_at'],
        products: ['id','shopId','shop_id','categoryId','category_id','category','name','description','image','images','price','originalPrice','original_price','monthlySales','monthly_sales','rating','goodReviews','good_reviews','stock','unit','nutrition','tags','isRecommend','is_recommend','isFeatured','featured','is_featured','isActive','is_active','sortOrder','sort_order','shopName','shop_name','tag','created_at','version','updated_at'],
        orders: ['id','user_id','shop_id','status','total_price','items','address','created_at','version','updated_at']
      }
      const allowedColumns = tableColumns[tableName] || null

      // 辅助函数：安全地转义SQL字符串值
      const escapeSqlValue = (value) => {
        if (value === null || value === undefined) {
          return 'NULL'
        }
        if (typeof value === 'boolean') {
          return value ? 1 : 0
        }
        if (typeof value === 'number') {
          if (!Number.isFinite(value)) {
            return 'NULL'
          }
          return value
        }
        if (typeof value === 'object') {
          const jsonStr = JSON.stringify(value)
          return `'${jsonStr.replace(/'/g, "''")}'`
        }
        return `'${String(value).replace(/'/g, "''")}'`
      }

      const checkComplete = () => {
        completed++
        if (completed === totalOperations && !hasError) {
          resolve()
        }
      }

      const handleError = (error, sql) => {
        if (!hasError) {
          hasError = true
          console.error(`❌ ${dataset} 同步失败:`, error, 'SQL:', sql)
          reject(error)
        }
      }

      // 处理变更的数据
      changed.forEach((item) => {
        const normalizedId = String(item?.id || '').trim()
        if (!normalizedId) {
          checkComplete()
          return
        }

        // 只保留表中存在的列，排除 version/updated_at（我们自己添加）
        const fields = Object.keys(item).filter(k => {
          if (k === 'id' || k === 'version' || k === 'updated_at') return false
          return !allowedColumns || allowedColumns.includes(k)
        })
        const fieldNames = ['id', ...fields, 'version', 'updated_at'].join(',')
        const values = [
          escapeSqlValue(normalizedId),
          ...fields.map(f => escapeSqlValue(item[f])),
          safeVersion,
          Date.now()
        ].join(',')

        const sql = `INSERT OR REPLACE INTO ${tableName} (${fieldNames}) VALUES (${values})`

        plus.sqlite.executeSql({
          name: this.db.name,
          path: this.db.path,
          sql: sql,
          success: checkComplete,
          fail: (error) => handleError(error, sql)
        })
      })

      // 处理删除的数据
      deleted.forEach((id) => {
        const normalizedId = String(id || '').trim()
        if (!normalizedId) {
          checkComplete()
          return
        }
        const sql = `DELETE FROM ${tableName} WHERE id = ${escapeSqlValue(normalizedId)}`

        plus.sqlite.executeSql({
          name: this.db.name,
          path: this.db.path,
          sql: sql,
          success: checkComplete,
          fail: (error) => handleError(error, sql)
        })
      })

      // 更新版本号
      const versionSql = `INSERT OR REPLACE INTO sync_versions (dataset, version, updated_at) VALUES ('${dataset}', ${safeVersion}, ${Date.now()})`

      plus.sqlite.executeSql({
        name: this.db.name,
        path: this.db.path,
        sql: versionSql,
        success: checkComplete,
        fail: (error) => handleError(error, versionSql)
      })
    })
    // #endif

    // #ifdef MP
    // 小程序环境：使用本地存储
    const tableName = this.getTableName(dataset)
    let tableData = uni.getStorageSync(tableName) || {}
    
    // 更新/插入
    changed.forEach((item) => {
      // 深拷贝并处理 JSON 字段
      const processedItem = { ...item }
      tableData[item.id] = {
        ...processedItem,
        version: newVersion,
        updated_at: Date.now()
      }
    })
    
    // 删除
    deleted.forEach((id) => {
      delete tableData[id]
    })
    
    uni.setStorageSync(tableName, tableData)
    
    // 更新版本号
    const versions = uni.getStorageSync('sync_versions') || {}
    versions[dataset] = newVersion
    uni.setStorageSync('sync_versions', versions)
    
    return Promise.resolve()
    // #endif
  }

  /**
   * 从本地读取数据
   */
  async getLocalData(dataset, conditions = {}) {
    await this.init()
    
    // #ifdef APP-PLUS
    if (!this.db || !this.db.name) {
      console.error('❌ 数据库对象无效，无法获取本地数据')
      return Promise.resolve([])
    }
    
    return new Promise((resolve) => {
      const tableName = this.getTableName(dataset)
      let sql = `SELECT * FROM ${tableName}`
      const args = []
      
      if (conditions.id) {
        sql += ' WHERE id = ?'
        args.push(conditions.id)
      }
      
      if (conditions.shop_id) {
        const shopCondition = '(shop_id = ? OR shopId = ?)'
        sql += conditions.id ? (' AND ' + shopCondition) : (' WHERE ' + shopCondition)
        args.push(conditions.shop_id, conditions.shop_id)
      }
      
      if (conditions.user_id) {
        sql += (conditions.id || conditions.shop_id) ? ' AND user_id = ?' : ' WHERE user_id = ?'
        args.push(conditions.user_id)
      }
      
      if (conditions.featured) {
        // featured 商品需要特殊处理
        sql += (conditions.id || conditions.shop_id || conditions.user_id) ? ' AND (isFeatured = 1 OR featured = 1 OR is_featured = 1)' : ' WHERE (isFeatured = 1 OR featured = 1 OR is_featured = 1)'
      }
      
      if (dataset === 'shops') {
        sql += ' ORDER BY isTodayRecommended DESC, CASE WHEN isTodayRecommended = 1 THEN todayRecommendPosition ELSE 2147483647 END ASC, updated_at DESC'
      } else {
        sql += ' ORDER BY updated_at DESC'
      }
      
      // 手动替换参数（因为 plus.sqlite.selectSql 可能不支持 args 参数）
      let finalSql = sql
      if (args && args.length > 0) {
        args.forEach((arg) => {
          const value = typeof arg === 'string' ? `'${arg.replace(/'/g, "''")}'` : arg
          finalSql = finalSql.replace('?', value)
        })
      }
      
      plus.sqlite.selectSql({
        name: this.db.name,
        path: this.db.path,
        sql: finalSql,
        success: (result) => {
          // 反序列化 JSON 字段
          const data = result.map(item => {
            const jsonFields = ['tags', 'items', 'business_hours']
            jsonFields.forEach(field => {
              if (item[field] && typeof item[field] === 'string') {
                try {
                  item[field] = JSON.parse(item[field])
                } catch (e) {
                  // 解析失败，保持原值
                }
              }
            })
            return item
          })
          resolve(data)
        },
        fail: () => {
          resolve([])
        }
      })
    })
    // #endif

    // #ifdef MP
    // 小程序环境：使用本地存储
    const tableName = this.getTableName(dataset)
    const tableData = uni.getStorageSync(tableName) || {}
    let data = Object.values(tableData)
    
    if (conditions.id) {
      data = data.filter(item => item.id === conditions.id)
    }
    if (conditions.shop_id) {
      data = data.filter(item => item.shop_id === conditions.shop_id || item.shopId === conditions.shop_id)
    }
    if (conditions.user_id) {
      data = data.filter(item => item.user_id === conditions.user_id)
    }
    if (conditions.featured) {
      data = data.filter(item => item.isFeatured === true || item.isFeatured === 1 || item.featured === true || item.featured === 1 || item.is_featured === true || item.is_featured === 1)
    }

    if (dataset === 'shops') {
      data = data.sort((a, b) => {
        const aRecommended = Number(a.isTodayRecommended || 0)
        const bRecommended = Number(b.isTodayRecommended || 0)
        if (aRecommended !== bRecommended) return bRecommended - aRecommended

        const aPos = aRecommended ? Number(a.todayRecommendPosition || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
        const bPos = bRecommended ? Number(b.todayRecommendPosition || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
        if (aPos !== bPos) return aPos - bPos

        return Number(b.updated_at || 0) - Number(a.updated_at || 0)
      })
    }

    // 反序列化 JSON 字段
    data = data.map(item => {
      const result = { ...item }
      // 尝试解析 JSON 字段
      const jsonFields = ['tags', 'items', 'business_hours']
      jsonFields.forEach(field => {
        if (result[field] && typeof result[field] === 'string') {
          try {
            result[field] = JSON.parse(result[field])
          } catch (e) {
            // 解析失败，保持原值
          }
        }
      })
      return result
    })
    
    return Promise.resolve(data)
    // #endif
  }

  /**
   * 获取表名
   */
  getTableName(dataset) {
    const mapping = {
      shops: 'shops',
      products: 'products',
      orders: 'orders'
    }
    return mapping[dataset] || dataset
  }

  /**
   * 清空本地缓存
   */
  async clearCache() {
    await this.init()
    
    // #ifdef APP-PLUS
    if (this.db && this.db.name) {
      const tables = ['shops', 'products', 'orders', 'sync_versions']
      tables.forEach((table) => {
        plus.sqlite.executeSql({
          name: this.db.name,
          path: this.db.path,
          sql: `DELETE FROM ${table}`,
          success: () => {
            // 清空成功
          },
          fail: (e) => {
            console.error(`❌ 清空表 ${table} 失败:`, e)
          }
        })
      })
    }
    // #endif

    // #ifdef MP
    // 小程序环境：清空本地存储
    uni.removeStorageSync('shops')
    uni.removeStorageSync('products')
    uni.removeStorageSync('orders')
    uni.removeStorageSync('sync_versions')
    // #endif
  }
}

// 单例模式
let instance = null
export default function getLocalDB() {
  if (!instance) {
    instance = new LocalDB()
  }
  return instance
}
