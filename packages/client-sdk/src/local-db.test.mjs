import test from "node:test";
import assert from "node:assert/strict";

import getLocalDB, {
  createLocalDB,
  resetLocalDBForTest,
} from "./local-db.js";

function createMockUniStorage() {
  const store = new Map();
  return {
    getStorageSync(key) {
      return store.get(key);
    },
    setStorageSync(key, value) {
      store.set(key, value);
    },
    removeStorageSync(key) {
      store.delete(key);
    },
  };
}

test("local db factory exposes a resettable singleton", () => {
  resetLocalDBForTest();
  const first = getLocalDB();
  const second = getLocalDB();

  assert.equal(first, second);

  resetLocalDBForTest();
  const third = getLocalDB();
  assert.notEqual(first, third);
});

test("local db storage runtime persists sync snapshots and query filters", async () => {
  const uniApp = createMockUniStorage();
  const db = createLocalDB({
    uniApp,
    logger: {
      error() {},
    },
  });

  await db.saveSyncData("shops", {
    changed: [
      { id: "shop-a", name: "A", isTodayRecommended: 1, todayRecommendPosition: 2, tags: "[\"hot\"]" },
      { id: "shop-b", name: "B", isTodayRecommended: 1, todayRecommendPosition: 1 },
      { id: "shop-c", name: "C", isTodayRecommended: 0 },
    ],
    newVersion: 12,
  });
  await db.saveSyncData("products", {
    changed: [
      { id: "product-a", shop_id: "shop-a", featured: 1, tags: "[\"combo\"]" },
    ],
    newVersion: 18,
  });

  assert.deepEqual(await db.getLocalSyncState(), {
    shops: 12,
    products: 18,
    orders: 0,
  });

  const shops = await db.getLocalData("shops");
  assert.deepEqual(
    shops.map((item) => item.id),
    ["shop-b", "shop-a", "shop-c"],
  );
  assert.deepEqual(shops[0].tags ?? [], []);

  const featuredProducts = await db.getLocalData("products", {
    featured: true,
  });
  assert.equal(featuredProducts.length, 1);
  assert.deepEqual(featuredProducts[0].tags, ["combo"]);

  await db.clearCache();
  assert.deepEqual(await db.getLocalSyncState(), {
    shops: 0,
    products: 0,
    orders: 0,
  });
});

test("local db rejects initialization when no runtime adapter is available", async () => {
  const db = createLocalDB({
    plusRuntime: null,
    uniApp: null,
  });

  await assert.rejects(() => db.init(), /No supported local DB runtime/);
});
