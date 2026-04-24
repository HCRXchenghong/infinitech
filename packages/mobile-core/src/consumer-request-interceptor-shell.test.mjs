import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerAppRequestInterceptorBindings,
  createConsumerUserRequestInterceptorBindings,
  createDefaultConsumerRequestInterceptorBindings,
  createScopedConsumerRequestInterceptorBindings,
} from "./consumer-request-interceptor-shell.js";

test("consumer request interceptor shell derives base url from config", async () => {
  const storage = new Map([
    ["token", "old-token"],
    ["refreshToken", "old-refresh"],
    ["tokenExpiresAt", Date.now() - 1_000],
  ]);
  let requestOptions = null;

  const controller = createDefaultConsumerRequestInterceptorBindings({
    config: { API_BASE_URL: "https://api.example.com" },
    logger: {
      error() {},
    },
    uniApp: {
      getStorageSync(key) {
        return storage.get(key);
      },
      setStorageSync(key, value) {
        storage.set(key, value);
      },
      removeStorageSync() {},
      reLaunch() {},
      request(options) {
        requestOptions = options;
        options.success({
          statusCode: 200,
          data: {
            request_id: "req-refresh-1",
            code: "OK",
            message: "令牌刷新成功",
            success: true,
            data: {
              token: "new-token",
              refreshToken: "new-refresh",
              expiresIn: 7200,
            },
          },
        });
      },
    },
  });

  await controller.manualRefreshToken();

  assert.equal(requestOptions.url, "https://api.example.com/api/auth/refresh");
});

test("consumer request interceptor shell derives scoped push storage keys", () => {
  const storage = new Map([
    ["consumer_lite_push_registration", { installationId: "push-1" }],
  ]);
  let relaunchPayload = null;

  const controller = createScopedConsumerRequestInterceptorBindings({
    clientScope: "consumer-lite",
    logger: {
      error() {},
    },
    clearLocalCache() {},
    uniApp: {
      getStorageSync(key) {
        return storage.get(key);
      },
      setStorageSync() {},
      removeStorageSync(key) {
        storage.delete(key);
      },
      reLaunch(payload) {
        relaunchPayload = payload;
      },
      request() {},
    },
  });

  controller.forceLogout();

  assert.equal(storage.has("consumer_lite_push_registration"), false);
  assert.deepEqual(relaunchPayload, {
    url: "/pages/welcome/welcome/index",
  });
});

test("consumer request interceptor shell exposes stable user/app aliases", () => {
  const userRuntime = createConsumerUserRequestInterceptorBindings({
    config: { API_BASE_URL: "https://user.example.com" },
    logger: {
      error() {},
    },
    uniApp: {
      getStorageSync() {
        return null;
      },
      setStorageSync() {},
      removeStorageSync() {},
      reLaunch() {},
      request() {},
    },
  });
  const appRuntime = createConsumerAppRequestInterceptorBindings({
    config: { API_BASE_URL: "https://app.example.com" },
    logger: {
      error() {},
    },
    uniApp: {
      getStorageSync() {
        return null;
      },
      setStorageSync() {},
      removeStorageSync() {},
      reLaunch() {},
      request() {},
    },
  });

  assert.equal(typeof userRuntime.setupRequestInterceptor, "function");
  assert.equal(typeof appRuntime.setupRequestInterceptor, "function");
});
