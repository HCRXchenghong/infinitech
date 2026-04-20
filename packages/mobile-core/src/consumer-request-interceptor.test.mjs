import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerRequestInterceptor } from "./consumer-request-interceptor.js";

function createUniRuntime() {
  const storage = new Map();
  const relaunchCalls = [];
  const requestCalls = [];
  let protectedCallCount = 0;

  const uniApp = {
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    reLaunch(payload) {
      relaunchCalls.push(payload);
    },
    request(options) {
      requestCalls.push({
        url: options.url,
        method: options.method,
        header: options.header,
        data: options.data,
      });

      if (options.url.endsWith("/api/auth/refresh")) {
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
        return;
      }

      if (options.url === "/api/protected") {
        protectedCallCount += 1;
        if (protectedCallCount === 1) {
          options.success({
            statusCode: 401,
            data: {
              error: "expired",
            },
          });
          return;
        }
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            authorization: options.header?.Authorization || "",
          },
        });
      }
    },
  };

  return {
    uniApp,
    storage,
    relaunchCalls,
    requestCalls,
  };
}

test("consumer request interceptor refreshes access tokens on manual refresh", async () => {
  const runtime = createUniRuntime();
  runtime.storage.set("token", "old-token");
  runtime.storage.set("refreshToken", "old-refresh");
  runtime.storage.set("tokenExpiresAt", Date.now() - 1000);

  const controller = createConsumerRequestInterceptor({
    uniApp: runtime.uniApp,
    baseUrl: "https://api.example.com",
    logger: {
      error() {},
    },
  });

  assert.equal(await controller.manualRefreshToken(), true);
  assert.equal(runtime.storage.get("token"), "new-token");
  assert.equal(runtime.storage.get("refreshToken"), "new-refresh");
  assert.equal(
    runtime.requestCalls[0].url,
    "https://api.example.com/api/auth/refresh",
  );
});

test("consumer request interceptor forceLogout clears auth state and cache", () => {
  const runtime = createUniRuntime();
  const cleared = [];

  runtime.storage.set("token", "old-token");
  runtime.storage.set("refreshToken", "old-refresh");
  runtime.storage.set("tokenExpiresAt", Date.now() + 3600_000);
  runtime.storage.set("userProfile", { id: 1 });
  runtime.storage.set("authMode", "user");
  runtime.storage.set("app_mobile_push_registration", { id: 1 });

  const controller = createConsumerRequestInterceptor({
    uniApp: runtime.uniApp,
    baseUrl: "https://api.example.com",
    clearLocalCache() {
      cleared.push("cache");
    },
    pushRegistrationStorageKey: "app_mobile_push_registration",
    logger: {
      error() {},
    },
  });

  controller.forceLogout();

  assert.equal(runtime.storage.has("token"), false);
  assert.equal(runtime.storage.has("refreshToken"), false);
  assert.equal(runtime.storage.has("userProfile"), false);
  assert.equal(runtime.storage.has("app_mobile_push_registration"), false);
  assert.deepEqual(cleared, ["cache"]);
  assert.deepEqual(runtime.relaunchCalls, [
    {
      url: "/pages/welcome/welcome/index",
    },
  ]);
});

test("consumer request interceptor retries protected requests after 401 refresh", async () => {
  const runtime = createUniRuntime();
  runtime.storage.set("token", "old-token");
  runtime.storage.set("refreshToken", "old-refresh");
  runtime.storage.set("tokenExpiresAt", Date.now() + 3600_000);

  const controller = createConsumerRequestInterceptor({
    uniApp: runtime.uniApp,
    baseUrl: "https://api.example.com",
    logger: {
      error() {},
    },
  });

  controller.setupRequestInterceptor();
  const response = await runtime.uniApp.request({
    url: "/api/protected",
    method: "GET",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.ok, true);
  assert.equal(response.data.authorization, "Bearer new-token");
  assert.equal(
    runtime.requestCalls.find((item) => item.url.endsWith("/api/auth/refresh"))
      .url,
    "https://api.example.com/api/auth/refresh",
  );
});
