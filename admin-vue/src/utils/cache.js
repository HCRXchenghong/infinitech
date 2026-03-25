/**
 * 本地数据缓存工具
 * 使用 IndexedDB 存储数据，用于离线查看和导出
 */
import { hasValidPrimaryKey } from './record';

const DB_NAME = 'yuexiange_admin_cache';
const DB_VERSION = 1;
const STORES = {
  USERS: 'users',
  RIDERS: 'riders',
  ORDERS: 'orders',
  MERCHANTS: 'merchants'
};

let db = null;

function idbRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbTransactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // 创建对象存储
      if (!database.objectStoreNames.contains(STORES.USERS)) {
        database.createObjectStore(STORES.USERS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.RIDERS)) {
        database.createObjectStore(STORES.RIDERS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.ORDERS)) {
        database.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.MERCHANTS)) {
        database.createObjectStore(STORES.MERCHANTS, { keyPath: 'id' });
      }
      // 创建缓存元数据存储
      if (!database.objectStoreNames.contains('cache_meta')) {
        database.createObjectStore('cache_meta', { keyPath: 'key' });
      }
    };
  });
}

// 保存数据到缓存
export async function saveToCache(storeName, data) {
  try {
    const database = await initDB();
    const transaction = database.transaction([storeName, 'cache_meta'], 'readwrite');
    const donePromise = idbTransactionDone(transaction);
    const store = transaction.objectStore(storeName);
    const metaStore = transaction.objectStore('cache_meta');
    
    // 清空旧数据
    await idbRequestToPromise(store.clear());
    
    // 保存新数据
    const rows = Array.isArray(data) ? data : [data];
    for (const item of rows) {
      if (!hasValidPrimaryKey(item)) continue;
      await idbRequestToPromise(store.put(item));
    }
    
    // 更新缓存时间戳
    await idbRequestToPromise(metaStore.put({ key: storeName, timestamp: Date.now() }));
    await donePromise;
    
    return true;
  } catch (error) {
    console.error('保存缓存失败:', error);
    return false;
  }
}

// 从缓存读取数据
export async function getFromCache(storeName) {
  try {
    const database = await initDB();
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('读取缓存失败:', error);
    return [];
  }
}

// 清空指定缓存
export async function clearCache(storeName) {
  try {
    const database = await initDB();
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    await idbRequestToPromise(store.clear());
    return true;
  } catch (error) {
    console.error('清空缓存失败:', error);
    return false;
  }
}

// 清空所有缓存
export async function clearAllCache() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.USERS, STORES.RIDERS, STORES.ORDERS, STORES.MERCHANTS], 'readwrite');
    const donePromise = idbTransactionDone(transaction);
    await Promise.all([
      idbRequestToPromise(transaction.objectStore(STORES.USERS).clear()),
      idbRequestToPromise(transaction.objectStore(STORES.RIDERS).clear()),
      idbRequestToPromise(transaction.objectStore(STORES.ORDERS).clear()),
      idbRequestToPromise(transaction.objectStore(STORES.MERCHANTS).clear())
    ]);
    await donePromise;
    
    return true;
  } catch (error) {
    console.error('清空所有缓存失败:', error);
    return false;
  }
}

// 获取缓存时间戳
export async function getCacheTimestamp(storeName) {
  try {
    const database = await initDB();
    const transaction = database.transaction(['cache_meta'], 'readonly');
    const store = transaction.objectStore('cache_meta');
    
    return new Promise((resolve) => {
      const request = store.get(storeName);
      request.onsuccess = () => {
        resolve(request.result?.timestamp || 0);
      };
      request.onerror = () => resolve(0);
    });
  } catch (error) {
    return 0;
  }
}

export { STORES };

