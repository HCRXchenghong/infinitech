export const CONSUMER_CACHE_DB_NAME = "yuexiang_cache";
export const CONSUMER_CACHE_DB_PATH = "_doc/yuexiang_cache.db";
export const CONSUMER_CACHE_TABLES = [
  "shops",
  "products",
  "orders",
  "sync_versions",
];
export const CONSUMER_CACHE_STORAGE_KEYS = [
  "shops",
  "products",
  "orders",
  "sync_versions",
  "lastSyncTime",
];
export const CONSUMER_CACHE_VERSION_STORAGE_KEY = "appVersion";
export const CONSUMER_CACHE_SCHEMA_VERSION = "3.0.1";

function resolveLogger(logger) {
  if (logger && typeof logger === "object") {
    return {
      error:
        typeof logger.error === "function"
          ? (...args) => logger.error(...args)
          : (...args) => console.error(...args),
    };
  }

  return {
    error: (...args) => console.error(...args),
  };
}

function isNoSuchTableError(err) {
  if (!err || typeof err !== "object") return false;
  const record = err;
  if (record.code === -1404) return true;
  const message = typeof record.message === "string" ? record.message : "";
  return message.includes("no such table");
}

function isDatabaseAlreadyOpenError(err) {
  if (!err || typeof err !== "object") return false;
  const record = err;
  if (record.code === -1402) return true;
  const message = typeof record.message === "string" ? record.message : "";
  return message.includes("Same Name Already Open");
}

function clearTables(sqlite, tables, options) {
  if (!tables.length) {
    return;
  }

  tables.forEach((table) => {
    sqlite.executeSql({
      name: options.dbName,
      path: options.dbPath,
      sql: `DELETE FROM ${table}`,
      success: () => {},
      fail: (error) => {
        if (isNoSuchTableError(error)) {
          return;
        }
        options.logger.error(`Failed to clear table ${table}:`, error);
      },
    });
  });
}

function clearTablesFromOpenDatabase(sqlite, options) {
  sqlite.selectSql({
    name: options.dbName,
    path: options.dbPath,
    sql: "SELECT name FROM sqlite_master WHERE type='table'",
    success: (result) => {
      const existing = new Set(
        (Array.isArray(result) ? result : []).map((item) => item.name),
      );
      const targetTables = options.tables.filter((table) =>
        existing.has(table),
      );
      clearTables(sqlite, targetTables, options);
    },
    fail: () => {
      clearTables(sqlite, options.tables, options);
    },
  });
}

export function clearSQLiteCache(options = {}) {
  const plusRuntime = options.plusRuntime || globalThis.plus;
  const sqlite = plusRuntime?.sqlite;
  const logger = resolveLogger(options.logger);
  const clearOptions = {
    dbName: options.dbName || CONSUMER_CACHE_DB_NAME,
    dbPath: options.dbPath || CONSUMER_CACHE_DB_PATH,
    tables:
      Array.isArray(options.tables) && options.tables.length > 0
        ? options.tables.slice()
        : CONSUMER_CACHE_TABLES.slice(),
    logger,
  };

  try {
    if (!sqlite) {
      return;
    }

    const isOpen =
      typeof sqlite.isOpenDatabase === "function" &&
      sqlite.isOpenDatabase({
        name: clearOptions.dbName,
        path: clearOptions.dbPath,
      });

    if (isOpen) {
      clearTablesFromOpenDatabase(sqlite, clearOptions);
      return;
    }

    sqlite.openDatabase({
      name: clearOptions.dbName,
      path: clearOptions.dbPath,
      success: () => {
        clearTablesFromOpenDatabase(sqlite, clearOptions);
      },
      fail: (error) => {
        if (isDatabaseAlreadyOpenError(error)) {
          clearTablesFromOpenDatabase(sqlite, clearOptions);
          return;
        }
        logger.error("Failed to open cache database:", error);
      },
    });
  } catch (error) {
    logger.error("Failed to clear SQLite cache:", error);
  }
}

export function clearStorageCache(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const logger = resolveLogger(options.logger);
  const keys =
    Array.isArray(options.storageKeys) && options.storageKeys.length > 0
      ? options.storageKeys.slice()
      : CONSUMER_CACHE_STORAGE_KEYS.slice();

  try {
    if (!uniApp || typeof uniApp.removeStorageSync !== "function") {
      return;
    }
    keys.forEach((key) => {
      uniApp.removeStorageSync(key);
    });
  } catch (error) {
    logger.error("Failed to clear Storage cache:", error);
  }
}

export function clearAllCache(options = {}) {
  clearSQLiteCache(options);
  clearStorageCache(options);
}

export function checkAndClearCacheIfNeeded(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const currentVersion =
    String(options.currentVersion || CONSUMER_CACHE_SCHEMA_VERSION).trim() ||
    CONSUMER_CACHE_SCHEMA_VERSION;
  const versionStorageKey =
    options.versionStorageKey || CONSUMER_CACHE_VERSION_STORAGE_KEY;

  if (
    !uniApp ||
    typeof uniApp.getStorageSync !== "function" ||
    typeof uniApp.setStorageSync !== "function"
  ) {
    return;
  }

  const lastVersion = uniApp.getStorageSync(versionStorageKey);
  if (lastVersion !== currentVersion) {
    clearAllCache(options);
    uniApp.setStorageSync(versionStorageKey, currentVersion);
  }
}
