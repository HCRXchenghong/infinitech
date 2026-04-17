import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUniNetworkErrorMessage,
  createUniRequestClient,
  isRetryableUniNetworkError,
} from "./uni-request.js";

test("isRetryableUniNetworkError recognizes transport failures", () => {
  assert.equal(isRetryableUniNetworkError({ errMsg: "request:fail timeout" }), true);
  assert.equal(isRetryableUniNetworkError({ message: "connect ECONNREFUSED" }), true);
  assert.equal(isRetryableUniNetworkError({ error: "validation failed" }), false);
});

test("buildUniNetworkErrorMessage supports timeout and unreachable overrides", () => {
  assert.equal(
    buildUniNetworkErrorMessage(
      { errMsg: "request:fail timeout" },
      { baseUrl: "http://127.0.0.1:25500" },
      {
        defaultMessage: "网络请求失败",
        timeoutMessage: "请求超时，请检查后端服务",
      },
    ),
    "请求超时，请检查后端服务",
  );
  assert.equal(
    buildUniNetworkErrorMessage(
      { errMsg: "request:fail connect" },
      { baseUrl: "http://127.0.0.1:25500" },
      {
        defaultMessage: "网络请求失败",
        unreachableMessage: ({ baseUrl }) => `无法连接服务器：${baseUrl}`,
      },
    ),
    "无法连接服务器：http://127.0.0.1:25500",
  );
});

test("createUniRequestClient injects authorization headers when enabled", async () => {
  const calls = [];
  const request = createUniRequestClient({
    uniApp: {
      request(options) {
        calls.push(options);
        options.success({
          statusCode: 200,
          data: { ok: true },
        });
      },
    },
    baseUrl: "http://127.0.0.1:25500/",
    timeout: 3000,
    getAuthToken() {
      return "token-value";
    },
  });

  const payload = await request({
    url: "/api/orders",
    method: "GET",
  });

  assert.deepEqual(payload, { ok: true });
  assert.equal(calls[0].url, "http://127.0.0.1:25500/api/orders");
  assert.equal(calls[0].header.Authorization, "Bearer token-value");
});

test("createUniRequestClient skips auth and runs unauthorized hooks for 401 responses", async () => {
  let unauthorizedCount = 0;
  const request = createUniRequestClient({
    uniApp: {
      request(options) {
        options.success({
          statusCode: 401,
          data: { error: "unauthorized" },
        });
      },
    },
    baseUrl: "http://127.0.0.1:25500",
    getAuthToken() {
      return "token-value";
    },
    onUnauthorized() {
      unauthorizedCount += 1;
    },
    createHttpError(payload, statusCode) {
      return {
        error: payload?.error,
        statusCode,
      };
    },
  });

  await assert.rejects(
    () => request({ url: "/api/private" }),
    (error) => {
      assert.equal(error.error, "unauthorized");
      assert.equal(error.statusCode, 401);
      return true;
    },
  );
  assert.equal(unauthorizedCount, 1);

  const publicRequest = createUniRequestClient({
    uniApp: {
      request(options) {
        options.success({
          statusCode: 200,
          data: { ok: true },
        });
      },
    },
    baseUrl: "http://127.0.0.1:25500",
    getAuthToken() {
      return "token-value";
    },
  });

  await publicRequest({
    url: "/api/public",
    auth: false,
  });
});

test("createUniRequestClient retries network failures through shared hooks", async () => {
  const urls = [];
  let baseUrl = "http://10.0.0.10:25500";

  const request = createUniRequestClient({
    uniApp: {
      request(options) {
        urls.push(options.url);
        if (urls.length === 1) {
          options.fail({ errMsg: "request:fail connect" });
          return;
        }

        options.success({
          statusCode: 200,
          data: { ok: true, retried: true },
        });
      },
    },
    getBaseUrl() {
      return baseUrl;
    },
    retryOnNetworkError: async ({ retryRequest }) => {
      baseUrl = "http://127.0.0.1:25500";
      return {
        retried: true,
        value: await retryRequest(),
      };
    },
  });

  const payload = await request({
    url: "/api/health",
  });

  assert.deepEqual(payload, { ok: true, retried: true });
  assert.deepEqual(urls, [
    "http://10.0.0.10:25500/api/health",
    "http://127.0.0.1:25500/api/health",
  ]);
});
