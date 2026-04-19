import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleApiBaseUrlCandidates,
  createRoleApiRuntimeBindings,
} from "./role-api-shell.js";

test("role api shell builds stable fallback base url candidates", () => {
  const uniApp = {
    getStorageSync(key) {
      return key === "dev_local_ip" ? "192.168.0.8" : "";
    },
  };

  assert.deepEqual(
    buildRoleApiBaseUrlCandidates("http://api.example.com:25500", {
      uniApp,
      fallbackPort: "25500",
      defaultFallbackIp: "127.0.0.1",
    }),
    [
      "http://api.example.com:25500",
      "http://192.168.0.8:25500",
      "http://127.0.0.1:25500",
    ],
  );
});

test("role api shell exposes request, auth header, and push bindings", async () => {
  let capturedRequestOptions = null;
  let capturedPushClientOptions = null;

  const runtime = createRoleApiRuntimeBindings({
    role: "rider",
    config: {
      API_BASE_URL: "http://127.0.0.1:25500",
      TIMEOUT: 5000,
    },
    uniApp: {},
    readStoredBearerTokenImpl() {
      return "token-123";
    },
    buildAuthorizationHeadersImpl(token) {
      return { Authorization: `Bearer ${token}` };
    },
    createUniRequestClientImpl(options) {
      capturedRequestOptions = options;
      return async (requestOptions) => ({
        ok: true,
        requestOptions,
      });
    },
    createMobilePushApiImpl(options) {
      capturedPushClientOptions = options;
      return {
        registerPushDevice(payload) {
          return options.post("/push/register", payload);
        },
        unregisterPushDevice(payload) {
          return options.post("/push/unregister", payload);
        },
        ackPushMessage(payload) {
          return options.post("/push/ack", payload);
        },
      };
    },
  });

  assert.equal(runtime.getBaseUrl(), "http://127.0.0.1:25500");
  assert.deepEqual(runtime.readAuthorizationHeader(), {
    Authorization: "Bearer token-123",
  });
  assert.equal(typeof capturedRequestOptions.getAuthToken, "function");

  assert.deepEqual(
    await runtime.registerPushDevice({ clientId: "cid" }),
    {
      ok: true,
      requestOptions: {
        url: "/push/register",
        method: "POST",
        data: { clientId: "cid" },
      },
    },
  );

  assert.equal(typeof capturedPushClientOptions.post, "function");
});

test("role api shell retries uploads through fallback base url resolution", async () => {
  const uploadedBaseUrls = [];
  const configPatches = [];

  const runtime = createRoleApiRuntimeBindings({
    role: "merchant",
    config: {
      API_BASE_URL: "http://10.0.0.2:25500",
      TIMEOUT: 5000,
    },
    uniApp: {},
    enableBaseUrlFallback: true,
    resolveReachableBaseUrl: async () => "http://127.0.0.1:25500",
    updateRuntimeConfig(patch) {
      configPatches.push(patch);
    },
    readStoredBearerTokenImpl() {
      return "merchant-token";
    },
    uploadAuthenticatedAssetImpl(options) {
      uploadedBaseUrls.push(options.baseUrl);
      if (options.baseUrl === "http://10.0.0.2:25500") {
        throw { error: "request:fail connect ECONNREFUSED" };
      }
      return {
        success: true,
        url: `${options.baseUrl}/uploads/image.png`,
      };
    },
  });

  assert.deepEqual(
    await runtime.uploadImage("/tmp/demo.png"),
    {
      success: true,
      url: "http://127.0.0.1:25500/uploads/image.png",
    },
  );
  assert.deepEqual(uploadedBaseUrls, [
    "http://10.0.0.2:25500",
    "http://127.0.0.1:25500",
  ]);
  assert.deepEqual(configPatches, [
    {
      API_BASE_URL: "http://127.0.0.1:25500",
      SOCKET_URL: "http://127.0.0.1:25500",
    },
  ]);
});

test("role api shell wires request fallback retry through resolved base urls", async () => {
  const configPatches = [];
  let receivedRetryHook = null;

  const runtime = createRoleApiRuntimeBindings({
    role: "merchant",
    config: {
      API_BASE_URL: "http://10.0.0.2:25500",
      TIMEOUT: 5000,
    },
    uniApp: {},
    enableBaseUrlFallback: true,
    resolveReachableBaseUrl: async () => "http://127.0.0.1:25500",
    updateRuntimeConfig(patch) {
      configPatches.push(patch);
    },
    createUniRequestClientImpl(options) {
      receivedRetryHook = options.retryOnNetworkError;
      return async (requestOptions) => ({
        ok: true,
        requestOptions,
      });
    },
  });

  const retryResult = await receivedRetryHook({
    baseUrl: "http://10.0.0.2:25500",
    error: { message: "request:fail connect ECONNREFUSED" },
    async retryRequest(overrideOptions) {
      return runtime.request({
        url: "/api/demo",
        method: "GET",
        ...overrideOptions,
      });
    },
  });

  assert.deepEqual(retryResult, {
    retried: true,
    value: {
      ok: true,
      requestOptions: {
        url: "/api/demo",
        method: "GET",
        _skipFallback: true,
      },
    },
  });
  assert.deepEqual(configPatches, [
    {
      API_BASE_URL: "http://127.0.0.1:25500",
      SOCKET_URL: "http://127.0.0.1:25500",
    },
  ]);
});
