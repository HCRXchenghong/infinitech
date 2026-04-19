import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  createConsumerServiceRuntime,
} from "./consumer-service-runtime.js";

test("consumer service runtime wires sync service, api, and auth runtime together", () => {
  let syncOptions = null;
  let apiOptions = null;
  let authOptions = null;

  const runtime = createConsumerServiceRuntime({
    config: { API_BASE_URL: "https://api.example.com" },
    getLocalDB() {
      return { type: "db" };
    },
    baseUrl: "https://api.example.com",
    timeout: 3200,
    productShopMode: "products-query",
    supportsShopCategory: true,
    isDev: true,
    logger: console,
    createMobileSyncServiceGetterImpl(options) {
      syncOptions = options;
      return function getSyncService() {
        return { type: "sync-service" };
      };
    },
    createConsumerApiImpl(options) {
      apiOptions = options;
      return {
        fetchPublicRuntimeSettings() {
          return { featureFlag: true };
        },
        request() {
          return "request";
        },
      };
    },
    createConsumerAuthRuntimeStoreImpl(options) {
      authOptions = options;
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
  assert.equal(syncOptions.timeout, 3200);
  assert.equal(apiOptions.getSyncService, runtime.getSyncService);
  assert.equal(apiOptions.config.API_BASE_URL, "https://api.example.com");
  assert.equal(
    authOptions.fetchRuntimeSettings,
    runtime.api.fetchPublicRuntimeSettings,
  );
  assert.equal(runtime.request(), "request");
  assert.deepEqual(runtime.getCachedConsumerAuthRuntimeSettings(), {
    runtime: "cached",
  });
});

test("consumer service runtime respects explicit service overrides", () => {
  const getSyncService = () => ({ type: "sync" });
  const api = {
    fetchPublicRuntimeSettings() {
      return { featureFlag: "api" };
    },
    request() {
      return "api-request";
    },
  };
  const authRuntimeStore = {
    getCachedConsumerAuthRuntimeSettings() {
      return { featureFlag: "auth" };
    },
    loadConsumerAuthRuntimeSettings() {
      return { featureFlag: "auth-load" };
    },
    resetConsumerAuthRuntimeSettings() {
      return true;
    },
  };

  const runtime = createConsumerServiceRuntime({
    getSyncService,
    api,
    authRuntimeStore,
  });

  assert.equal(runtime.getSyncService, getSyncService);
  assert.equal(runtime.request, api.request);
  assert.equal(
    runtime.getCachedConsumerAuthRuntimeSettings,
    authRuntimeStore.getCachedConsumerAuthRuntimeSettings,
  );
  assert.deepEqual(DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS, {
    title: "欢迎使用悦享e食",
    subtitle: "一站式本地生活服务平台",
    loginFooter: "登录后可同步订单、消息、地址与优惠权益",
    wechatLoginEnabled: false,
    wechatLoginEntryUrl: "",
  });
});
