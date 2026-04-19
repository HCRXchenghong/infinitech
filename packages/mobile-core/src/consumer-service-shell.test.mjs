import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  createDefaultConsumerServiceRuntime,
} from "./consumer-service-shell.js";

test("consumer service shell derives default runtime settings from config", () => {
  let syncOptions = null;

  const runtime = createDefaultConsumerServiceRuntime({
    config: {
      API_BASE_URL: "https://api.example.com",
      TIMEOUT: 6200,
      isDev: true,
    },
    getLocalDB() {
      return { type: "db" };
    },
    createMobileSyncServiceGetterImpl(options) {
      syncOptions = options;
      return function getSyncService() {
        return { type: "sync" };
      };
    },
    createConsumerApiImpl() {
      return {
        fetchPublicRuntimeSettings() {
          return { featureFlag: true };
        },
        request() {
          return "request";
        },
      };
    },
    createConsumerAuthRuntimeStoreImpl() {
      return {
        getCachedConsumerAuthRuntimeSettings() {
          return { runtime: "cached" };
        },
        loadConsumerAuthRuntimeSettings() {
          return { runtime: "loaded" };
        },
        resetConsumerAuthRuntimeSettings() {
          return true;
        },
      };
    },
  });

  assert.equal(syncOptions.baseUrl, "https://api.example.com");
  assert.equal(syncOptions.timeout, 6200);
  assert.equal(syncOptions.productShopMode, "products-query");
  assert.equal(syncOptions.supportsShopCategory, true);
  assert.equal(syncOptions.isDev, true);
  assert.equal(runtime.request(), "request");
});

test("consumer service shell respects explicit runtime overrides", () => {
  let syncOptions = null;

  createDefaultConsumerServiceRuntime({
    config: {
      API_BASE_URL: "https://api.example.com",
      TIMEOUT: 6200,
      isDev: false,
    },
    baseUrl: "https://override.example.com",
    timeout: 9100,
    productShopMode: "shop-detail",
    supportsShopCategory: false,
    isDev: true,
    createMobileSyncServiceGetterImpl(options) {
      syncOptions = options;
      return function getSyncService() {
        return { type: "sync" };
      };
    },
    createConsumerApiImpl() {
      return {
        fetchPublicRuntimeSettings() {
          return { featureFlag: true };
        },
        request() {
          return "request";
        },
      };
    },
    createConsumerAuthRuntimeStoreImpl() {
      return {
        getCachedConsumerAuthRuntimeSettings() {
          return DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS;
        },
        loadConsumerAuthRuntimeSettings() {
          return DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS;
        },
        resetConsumerAuthRuntimeSettings() {
          return true;
        },
      };
    },
  });

  assert.equal(syncOptions.baseUrl, "https://override.example.com");
  assert.equal(syncOptions.timeout, 9100);
  assert.equal(syncOptions.productShopMode, "shop-detail");
  assert.equal(syncOptions.supportsShopCategory, false);
  assert.equal(syncOptions.isDev, true);
});
