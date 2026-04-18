import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSyncApiUrl,
  createMobileSyncServiceGetter,
  createSyncService,
  isSyncNetworkError,
  normalizeSyncRecords,
} from "./sync-service.js";

test("buildSyncApiUrl supports consumer and merchant path variants", () => {
  assert.equal(
    buildSyncApiUrl(
      "shops",
      { category: "coffee & tea" },
      { supportsShopCategory: true },
    ),
    "/api/shops?category=coffee%20%26%20tea",
  );
  assert.equal(
    buildSyncApiUrl(
      "products",
      { shop_id: 9 },
      { productShopMode: "products-query" },
    ),
    "/api/products?shopId=9",
  );
  assert.equal(
    buildSyncApiUrl(
      "products",
      { shop_id: 9 },
      { productShopMode: "shop-menu" },
    ),
    "/api/shops/9/menu",
  );
});

test("normalizeSyncRecords keeps supported payload shapes stable", () => {
  assert.deepEqual(normalizeSyncRecords({ data: { items: [{ id: 1 }] } }), [
    { id: 1 },
  ]);
  assert.deepEqual(normalizeSyncRecords({ shops: [{ id: 2 }] }), [{ id: 2 }]);
  assert.deepEqual(normalizeSyncRecords({ id: 3, name: "one" }), [
    { id: 3, name: "one" },
  ]);
  assert.deepEqual(normalizeSyncRecords({ error: "failed" }), []);
});

test("isSyncNetworkError recognizes runtime transport failures", () => {
  assert.equal(isSyncNetworkError({ error: "request:fail timeout" }), true);
  assert.equal(isSyncNetworkError({ message: "Network request failed" }), true);
  assert.equal(isSyncNetworkError({ error: "validation failed" }), false);
});

test("createSyncService synchronizes changed datasets and emits events", async () => {
  const saved = [];
  const emitted = [];
  const localDB = {
    async init() {},
    async getLocalSyncState() {
      return { shops: 5, products: 3, orders: 1 };
    },
    async saveSyncData(dataset, payload) {
      saved.push({ dataset, payload });
    },
    async getLocalData() {
      return [];
    },
  };

  const requestCalls = [];
  const request = async (options) => {
    requestCalls.push(options);
    if (options.url === "/api/sync/state") {
      return { shops: 4, products: 6, orders: 1 };
    }
    if (options.url === "/api/sync/products?since=3") {
      return { changed: [{ id: "p-1" }], deleted: [], newVersion: 6 };
    }
    throw new Error(`unexpected request: ${options.url}`);
  };

  const service = createSyncService({
    getLocalDB: () => localDB,
    request,
    buildApiUrl: (dataset) => `/api/${dataset}`,
    emitDataSynced(payload) {
      emitted.push(payload);
    },
    logger: {
      error() {},
      warn() {},
    },
  });

  await service.syncInBackground();

  assert.deepEqual(
    requestCalls.map((item) => item.url),
    ["/api/sync/state", "/api/sync/products?since=3"],
  );
  assert.deepEqual(saved, [
    {
      dataset: "shops",
      payload: {
        changed: [],
        deleted: [],
        newVersion: 4,
      },
    },
    {
      dataset: "products",
      payload: {
        changed: [{ id: "p-1" }],
        deleted: [],
        newVersion: 6,
      },
    },
  ]);
  assert.deepEqual(emitted, [{ dataset: "products", version: 6 }]);
});

test("createSyncService falls back to local data unless preferFresh is enabled", async () => {
  const localValue = [{ id: "cached-1" }];
  const service = createSyncService({
    getLocalDB: () => ({
      async init() {},
      async getLocalSyncState() {
        return {};
      },
      async saveSyncData() {},
      async getLocalData() {
        return localValue;
      },
    }),
    async request() {
      throw { message: "Network request failed" };
    },
    buildApiUrl: (dataset) => `/api/${dataset}`,
    logger: {
      error() {},
      warn() {},
    },
  });

  assert.equal(await service.getData("shops"), localValue);
  await assert.rejects(
    () => service.getData("shops", {}, { preferFresh: true }),
    /Network request failed/,
  );
});

test("createMobileSyncServiceGetter memoizes shared sync services and emits default sync events", async () => {
  const emitted = [];
  const requestCalls = [];
  const localDB = {
    async init() {},
    async getLocalSyncState() {
      return {};
    },
    async saveSyncData() {},
    async getLocalData() {
      return [];
    },
  };

  const getSyncService = createMobileSyncServiceGetter({
    getLocalDB: () => localDB,
    request: async (options) => {
      requestCalls.push(options);
      if (options.url === "/api/sync/orders?since=1") {
        return { changed: [], deleted: [], newVersion: 2 };
      }
      throw new Error(`unexpected request: ${options.url}`);
    },
    productShopMode: "shop-menu",
    supportsShopCategory: false,
    isDev: true,
    uniApp: {
      $emit(eventName, payload) {
        emitted.push({ eventName, payload });
      },
    },
    logger: {
      error() {},
      warn() {},
    },
  });

  const first = getSyncService();
  const second = getSyncService();

  assert.equal(first, second);
  assert.equal(
    first.getApiUrl("products", { shop_id: 12 }),
    "/api/shops/12/menu",
  );

  await first.syncDataset("orders", 1);

  assert.deepEqual(requestCalls, [
    {
      url: "/api/sync/orders?since=1",
      method: "GET",
    },
  ]);
  assert.deepEqual(emitted, [
    {
      eventName: "data-synced",
      payload: {
        dataset: "orders",
        version: 2,
      },
    },
  ]);
});
