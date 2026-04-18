import test from "node:test";
import assert from "node:assert/strict";

import {
  checkAndClearCacheIfNeeded,
  clearSQLiteCache,
  clearStorageCache,
  CONSUMER_CACHE_SCHEMA_VERSION,
} from "./consumer-cache.js";

test("consumer cache clears storage-backed sync keys deterministically", () => {
  const removed = [];
  clearStorageCache({
    uniApp: {
      removeStorageSync(key) {
        removed.push(key);
      },
    },
  });

  assert.deepEqual(removed, [
    "shops",
    "products",
    "orders",
    "sync_versions",
    "lastSyncTime",
  ]);
});

test("consumer cache clears sqlite-backed cache tables when database is open", () => {
  const executed = [];
  clearSQLiteCache({
    plusRuntime: {
      sqlite: {
        isOpenDatabase() {
          return true;
        },
        selectSql({ success }) {
          success([{ name: "shops" }, { name: "orders" }]);
        },
        executeSql({ sql, success }) {
          executed.push(sql);
          success();
        },
      },
    },
    logger: {
      error() {},
    },
  });

  assert.deepEqual(executed, ["DELETE FROM shops", "DELETE FROM orders"]);
});

test("consumer cache clears all cache on schema changes and persists version", () => {
  const storage = new Map([
    ["appVersion", "2.9.0"],
    ["shops", [{ id: 1 }]],
    ["products", [{ id: 2 }]],
  ]);

  checkAndClearCacheIfNeeded({
    uniApp: {
      getStorageSync(key) {
        return storage.get(key);
      },
      setStorageSync(key, value) {
        storage.set(key, value);
      },
      removeStorageSync(key) {
        storage.delete(key);
      },
    },
    logger: {
      error() {},
    },
  });

  assert.equal(storage.get("appVersion"), CONSUMER_CACHE_SCHEMA_VERSION);
  assert.equal(storage.has("shops"), false);
  assert.equal(storage.has("products"), false);
});
