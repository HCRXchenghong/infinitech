const DEFAULT_SYNC_STATE = Object.freeze({
  shops: 0,
  products: 0,
  orders: 0,
});

const JSON_FIELDS = ["tags", "items", "business_hours"];
const SCHEMA_VERSION = 8;

function cloneDefaultSyncState() {
  return {
    shops: DEFAULT_SYNC_STATE.shops,
    products: DEFAULT_SYNC_STATE.products,
    orders: DEFAULT_SYNC_STATE.orders,
  };
}

function resolvePlusRuntime(plusRuntime) {
  return plusRuntime || globalThis.plus || null;
}

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveSqliteApi(plusRuntime) {
  const runtime = resolvePlusRuntime(plusRuntime);
  const sqlite = runtime?.sqlite;
  if (
    !sqlite ||
    typeof sqlite.openDatabase !== "function" ||
    typeof sqlite.closeDatabase !== "function" ||
    typeof sqlite.executeSql !== "function" ||
    typeof sqlite.selectSql !== "function"
  ) {
    return null;
  }
  return sqlite;
}

function resolveStorageRuntime(uniApp) {
  const runtime = resolveUniRuntime(uniApp);
  if (
    !runtime ||
    typeof runtime.getStorageSync !== "function" ||
    typeof runtime.setStorageSync !== "function" ||
    typeof runtime.removeStorageSync !== "function"
  ) {
    return null;
  }
  return runtime;
}

function createLogger(logger) {
  if (logger && typeof logger === "object" && typeof logger.error === "function") {
    return logger;
  }
  return console;
}

function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "NULL";
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeVersion(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function parseJsonFields(record = {}) {
  const result = { ...record };
  for (const field of JSON_FIELDS) {
    if (typeof result[field] !== "string") {
      continue;
    }
    try {
      result[field] = JSON.parse(result[field]);
    } catch (_error) {
      // Preserve legacy raw values when local cache holds non-JSON strings.
    }
  }
  return result;
}

export class LocalDB {
  constructor(options = {}) {
    this.db = null;
    this.dbName = options.dbName || "yuexiang_cache";
    this.dbPath = options.dbPath || "_doc/yuexiang_cache.db";
    this.isInitialized = false;
    this.initPromise = null;
    this.plusRuntime = options.plusRuntime;
    this.uniApp = options.uniApp;
    this.logger = createLogger(options.logger);
  }

  getSqliteApi() {
    return resolveSqliteApi(this.plusRuntime);
  }

  getStorageRuntime() {
    return resolveStorageRuntime(this.uniApp);
  }

  hasSqliteRuntime() {
    return Boolean(this.getSqliteApi());
  }

  hasStorageRuntime() {
    return Boolean(this.getStorageRuntime());
  }

  openDatabase(resolve, reject) {
    const sqlite = this.getSqliteApi();
    if (!sqlite) {
      reject(new Error("SQLite runtime unavailable"));
      return;
    }

    sqlite.openDatabase({
      name: this.dbName,
      path: this.dbPath,
      success: () => {
        this.db = {
          name: this.dbName,
          path: this.dbPath,
        };

        this.createTables()
          .then(() => {
            this.isInitialized = true;
            this.initPromise = null;
            resolve();
          })
          .catch((error) => {
            this.initPromise = null;
            reject(error);
          });
      },
      fail: (error) => {
        this.logger.error("❌ 本地数据库打开失败:", error);
        this.initPromise = null;
        reject(error);
      },
    });
  }

  async init() {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      this.initPromise = new Promise((resolve, reject) => {
        try {
          sqlite.closeDatabase({
            name: this.dbName,
            path: this.dbPath,
            success: () => {
              this.openDatabase(resolve, reject);
            },
            fail: () => {
              this.openDatabase(resolve, reject);
            },
          });
        } catch (_error) {
          this.openDatabase(resolve, reject);
        }
      });
      return this.initPromise;
    }

    if (this.hasStorageRuntime()) {
      this.initPromise = this.createTables()
        .then(() => {
          this.isInitialized = true;
          this.initPromise = null;
        })
        .catch((error) => {
          this.initPromise = null;
          throw error;
        });
      return this.initPromise;
    }

    throw new Error("No supported local DB runtime");
  }

  executeSqlSequential(sqls, callback) {
    const sqlite = this.getSqliteApi();
    if (!sqlite || !this.db?.name) {
      callback(new Error("数据库对象无效"));
      return;
    }

    let index = 0;
    const next = () => {
      if (index >= sqls.length) {
        callback(null);
        return;
      }

      const sql = sqls[index];
      sqlite.executeSql({
        name: this.db.name,
        path: this.db.path,
        sql,
        success: () => {
          index += 1;
          next();
        },
        fail: (error) => {
          this.logger.error("SQL失败:", sql, error);
          callback(error);
        },
      });
    };

    next();
  }

  async createTables() {
    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      if (!this.db?.name) {
        throw new Error("数据库对象无效");
      }

      return new Promise((resolve, reject) => {
        sqlite.executeSql({
          name: this.db.name,
          path: this.db.path,
          sql: "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)",
          success: () => {
            sqlite.selectSql({
              name: this.db.name,
              path: this.db.path,
              sql: "SELECT version FROM schema_version LIMIT 1",
              success: (result) => {
                const currentVersion = result.length > 0 ? result[0].version : 0;

                if (currentVersion >= SCHEMA_VERSION) {
                  resolve();
                  return;
                }

                const dropSqls = [
                  "DROP TABLE IF EXISTS shops",
                  "DROP TABLE IF EXISTS products",
                  "DROP TABLE IF EXISTS menus",
                  "DROP TABLE IF EXISTS orders",
                  "DROP TABLE IF EXISTS sync_versions",
                ];

                this.executeSqlSequential(dropSqls, (dropError) => {
                  if (dropError) {
                    reject(dropError);
                    return;
                  }

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
                    "DELETE FROM schema_version",
                    `INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`,
                  ];

                  this.executeSqlSequential(createSqls, (createError) => {
                    if (createError) {
                      reject(createError);
                      return;
                    }
                    resolve();
                  });
                });
              },
              fail: () => {
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
                  `INSERT OR REPLACE INTO schema_version (version) VALUES (${SCHEMA_VERSION})`,
                ];

                this.executeSqlSequential(createSqls, (createError) => {
                  if (createError) {
                    reject(createError);
                    return;
                  }
                  resolve();
                });
              },
            });
          },
          fail: (error) => {
            reject(error);
          },
        });
      });
    }

    if (this.hasStorageRuntime()) {
      return;
    }

    throw new Error("No supported local DB runtime");
  }

  async getLocalSyncState() {
    await this.init();

    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      if (!this.db?.name) {
        this.logger.error("❌ 数据库对象无效，无法获取同步状态");
        return cloneDefaultSyncState();
      }

      return new Promise((resolve) => {
        const state = {};
        const datasets = ["shops", "products", "orders"];
        let completed = 0;

        const checkComplete = () => {
          completed += 1;
          if (completed !== datasets.length) {
            return;
          }

          for (const dataset of datasets) {
            if (state[dataset] === undefined) {
              state[dataset] = 0;
            }
          }
          resolve(state);
        };

        for (const dataset of datasets) {
          const sql = `SELECT version FROM sync_versions WHERE dataset = '${dataset.replace(/'/g, "''")}'`;
          sqlite.selectSql({
            name: this.db.name,
            path: this.db.path,
            sql,
            success: (result) => {
              state[dataset] = result.length > 0 ? result[0].version : 0;
              checkComplete();
            },
            fail: () => {
              state[dataset] = 0;
              checkComplete();
            },
          });
        }
      });
    }

    const uniApp = this.getStorageRuntime();
    if (!uniApp) {
      return cloneDefaultSyncState();
    }

    const state = uniApp.getStorageSync("sync_versions") || {};
    return {
      shops: state.shops || 0,
      products: state.products || 0,
      orders: state.orders || 0,
    };
  }

  async saveSyncData(dataset, data = {}) {
    await this.init();

    const changed = Array.isArray(data.changed) ? data.changed : [];
    const deleted = Array.isArray(data.deleted) ? data.deleted : [];
    const newVersion = normalizeVersion(data.newVersion);

    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      if (!this.db?.name) {
        this.logger.error("❌ 数据库对象无效，无法保存同步数据");
        throw new Error("数据库对象无效");
      }

      return new Promise((resolve, reject) => {
        const tableName = this.getTableName(dataset);
        let completed = 0;
        let hasError = false;
        const totalOperations = changed.length + deleted.length + 1;

        const tableColumns = {
          shops: ["id", "merchantId", "merchant_id", "name", "category", "coverImage", "cover_image", "avatar", "logo", "rating", "monthlySales", "monthly_sales", "sales", "perCapita", "per_capita", "announcement", "address", "phone", "businessHours", "business_hours", "tags", "discounts", "isBrand", "is_brand", "isTodayRecommended", "is_today_recommended", "todayRecommendPosition", "today_recommend_position", "isActive", "is_active", "minPrice", "min_price", "deliveryPrice", "delivery_price", "deliveryTime", "delivery_time", "distance", "created_at", "version", "updated_at"],
          products: ["id", "shopId", "shop_id", "categoryId", "category_id", "category", "name", "description", "image", "images", "price", "originalPrice", "original_price", "monthlySales", "monthly_sales", "rating", "goodReviews", "good_reviews", "stock", "unit", "nutrition", "tags", "isRecommend", "is_recommend", "isFeatured", "featured", "is_featured", "isActive", "is_active", "sortOrder", "sort_order", "shopName", "shop_name", "tag", "created_at", "version", "updated_at"],
          orders: ["id", "user_id", "shop_id", "status", "total_price", "items", "address", "created_at", "version", "updated_at"],
        };
        const allowedColumns = tableColumns[tableName] || null;

        const checkComplete = () => {
          completed += 1;
          if (completed === totalOperations && !hasError) {
            resolve();
          }
        };

        const handleError = (error, sql) => {
          if (hasError) {
            return;
          }
          hasError = true;
          this.logger.error(`❌ ${dataset} 同步失败:`, error, "SQL:", sql);
          reject(error);
        };

        for (const item of changed) {
          const normalizedId = String(item?.id || "").trim();
          if (!normalizedId) {
            checkComplete();
            continue;
          }

          const fields = Object.keys(item).filter((key) => {
            if (key === "id" || key === "version" || key === "updated_at") {
              return false;
            }
            return !allowedColumns || allowedColumns.includes(key);
          });
          const fieldNames = ["id", ...fields, "version", "updated_at"].join(",");
          const values = [
            escapeSqlValue(normalizedId),
            ...fields.map((field) => escapeSqlValue(item[field])),
            newVersion,
            Date.now(),
          ].join(",");
          const sql = `INSERT OR REPLACE INTO ${tableName} (${fieldNames}) VALUES (${values})`;

          sqlite.executeSql({
            name: this.db.name,
            path: this.db.path,
            sql,
            success: checkComplete,
            fail: (error) => {
              handleError(error, sql);
            },
          });
        }

        for (const id of deleted) {
          const normalizedId = String(id || "").trim();
          if (!normalizedId) {
            checkComplete();
            continue;
          }

          const sql = `DELETE FROM ${tableName} WHERE id = ${escapeSqlValue(normalizedId)}`;
          sqlite.executeSql({
            name: this.db.name,
            path: this.db.path,
            sql,
            success: checkComplete,
            fail: (error) => {
              handleError(error, sql);
            },
          });
        }

        const versionSql = `INSERT OR REPLACE INTO sync_versions (dataset, version, updated_at) VALUES ('${dataset}', ${newVersion}, ${Date.now()})`;
        sqlite.executeSql({
          name: this.db.name,
          path: this.db.path,
          sql: versionSql,
          success: checkComplete,
          fail: (error) => {
            handleError(error, versionSql);
          },
        });
      });
    }

    const uniApp = this.getStorageRuntime();
    if (!uniApp) {
      throw new Error("No supported local DB runtime");
    }

    const tableName = this.getTableName(dataset);
    const tableData = uniApp.getStorageSync(tableName) || {};

    for (const item of changed) {
      const normalizedId = String(item?.id || "").trim();
      if (!normalizedId) {
        continue;
      }
      tableData[normalizedId] = {
        ...item,
        id: normalizedId,
        version: newVersion,
        updated_at: Date.now(),
      };
    }

    for (const id of deleted) {
      delete tableData[id];
    }

    uniApp.setStorageSync(tableName, tableData);
    const versions = uniApp.getStorageSync("sync_versions") || {};
    versions[dataset] = newVersion;
    uniApp.setStorageSync("sync_versions", versions);
  }

  async getLocalData(dataset, conditions = {}) {
    await this.init();

    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      if (!this.db?.name) {
        this.logger.error("❌ 数据库对象无效，无法获取本地数据");
        return [];
      }

      return new Promise((resolve) => {
        const tableName = this.getTableName(dataset);
        let sql = `SELECT * FROM ${tableName}`;
        const args = [];

        if (conditions.id) {
          sql += " WHERE id = ?";
          args.push(conditions.id);
        }

        if (conditions.shop_id) {
          const shopCondition = "(shop_id = ? OR shopId = ?)";
          sql += conditions.id ? ` AND ${shopCondition}` : ` WHERE ${shopCondition}`;
          args.push(conditions.shop_id, conditions.shop_id);
        }

        if (conditions.user_id) {
          sql += conditions.id || conditions.shop_id ? " AND user_id = ?" : " WHERE user_id = ?";
          args.push(conditions.user_id);
        }

        if (conditions.featured) {
          const featuredClause = "(isFeatured = 1 OR featured = 1 OR is_featured = 1)";
          sql += conditions.id || conditions.shop_id || conditions.user_id ? ` AND ${featuredClause}` : ` WHERE ${featuredClause}`;
        }

        if (dataset === "shops") {
          sql += " ORDER BY isTodayRecommended DESC, CASE WHEN isTodayRecommended = 1 THEN todayRecommendPosition ELSE 2147483647 END ASC, updated_at DESC";
        } else {
          sql += " ORDER BY updated_at DESC";
        }

        let finalSql = sql;
        for (const arg of args) {
          const value = typeof arg === "string" ? `'${arg.replace(/'/g, "''")}'` : arg;
          finalSql = finalSql.replace("?", value);
        }

        sqlite.selectSql({
          name: this.db.name,
          path: this.db.path,
          sql: finalSql,
          success: (result) => {
            resolve(result.map((item) => parseJsonFields(item)));
          },
          fail: () => {
            resolve([]);
          },
        });
      });
    }

    const uniApp = this.getStorageRuntime();
    if (!uniApp) {
      return [];
    }

    const tableName = this.getTableName(dataset);
    let data = Object.values(uniApp.getStorageSync(tableName) || {});

    if (conditions.id) {
      data = data.filter((item) => item.id === conditions.id);
    }
    if (conditions.shop_id) {
      data = data.filter((item) => item.shop_id === conditions.shop_id || item.shopId === conditions.shop_id);
    }
    if (conditions.user_id) {
      data = data.filter((item) => item.user_id === conditions.user_id);
    }
    if (conditions.featured) {
      data = data.filter(
        (item) =>
          item.isFeatured === true ||
          item.isFeatured === 1 ||
          item.featured === true ||
          item.featured === 1 ||
          item.is_featured === true ||
          item.is_featured === 1,
      );
    }

    if (dataset === "shops") {
      data = data.sort((left, right) => {
        const leftRecommended = Number(left.isTodayRecommended || 0);
        const rightRecommended = Number(right.isTodayRecommended || 0);
        if (leftRecommended !== rightRecommended) {
          return rightRecommended - leftRecommended;
        }

        const leftPosition = leftRecommended ? Number(left.todayRecommendPosition || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const rightPosition = rightRecommended ? Number(right.todayRecommendPosition || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        if (leftPosition !== rightPosition) {
          return leftPosition - rightPosition;
        }

        return Number(right.updated_at || 0) - Number(left.updated_at || 0);
      });
    }

    return data.map((item) => parseJsonFields(item));
  }

  getTableName(dataset) {
    const mapping = {
      shops: "shops",
      products: "products",
      orders: "orders",
    };
    return mapping[dataset] || dataset;
  }

  async clearCache() {
    await this.init();

    if (this.hasSqliteRuntime()) {
      const sqlite = this.getSqliteApi();
      if (this.db?.name) {
        for (const table of ["shops", "products", "orders", "sync_versions"]) {
          sqlite.executeSql({
            name: this.db.name,
            path: this.db.path,
            sql: `DELETE FROM ${table}`,
            success: () => {},
            fail: (error) => {
              this.logger.error(`❌ 清空表 ${table} 失败:`, error);
            },
          });
        }
      }
      return;
    }

    const uniApp = this.getStorageRuntime();
    if (!uniApp) {
      throw new Error("No supported local DB runtime");
    }

    uniApp.removeStorageSync("shops");
    uniApp.removeStorageSync("products");
    uniApp.removeStorageSync("orders");
    uniApp.removeStorageSync("sync_versions");
  }
}

export function createLocalDB(options = {}) {
  return new LocalDB(options);
}

let instance = null;

export function resetLocalDBForTest() {
  instance = null;
}

export default function getLocalDB() {
  if (!instance) {
    instance = new LocalDB();
  }
  return instance;
}
