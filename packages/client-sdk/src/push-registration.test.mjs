import test from "node:test";
import assert from "node:assert/strict";

import { createPushRegistrationManager } from "./push-registration.js";

function createMockUniApp(initialStorage = {}, systemInfo = {}) {
  const storage = new Map(Object.entries(initialStorage));
  return {
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    getSystemInfoSync() {
      return { ...systemInfo };
    },
  };
}

function createMockPlusRuntime(clientInfo = {}) {
  return {
    push: {
      getClientInfo() {
        return { ...clientInfo };
      },
    },
  };
}

test("push registration manager registers current device and caches fingerprint state", async () => {
  const registerCalls = [];
  const uniApp = createMockUniApp({}, {
    appVersion: "2.0.1",
    language: "en-US",
    timezone: "Asia/Shanghai",
  });
  const plusRuntime = createMockPlusRuntime({
    clientid: "push-token-1",
  });

  const manager = createPushRegistrationManager({
    uniApp,
    plusRuntime,
    nowFn: () => 123456,
    resolveAuthIdentity: () => ({
      userId: "user_1",
      userType: "customer",
    }),
    getAppEnv: () => "prod",
    registerPushDevice(payload) {
      registerCalls.push(payload);
      return { ok: true };
    },
  });

  const result = await manager.registerCurrentPushDevice();

  assert.equal(result.success, true);
  assert.deepEqual(registerCalls, [
    {
      userId: "user_1",
      userType: "customer",
      deviceToken: "push-token-1",
      appVersion: "2.0.1",
      locale: "en-US",
      timezone: "Asia/Shanghai",
      appEnv: "prod",
    },
  ]);
  assert.deepEqual(manager.getCachedRegistrationState(), {
    userId: "user_1",
    userType: "customer",
    deviceToken: "push-token-1",
    appVersion: "2.0.1",
    locale: "en-US",
    timezone: "Asia/Shanghai",
    appEnv: "prod",
    fingerprint: "user_1|customer|push-token-1|2.0.1|en-US|Asia/Shanghai|prod",
    lastRegisteredAt: 123456,
  });
});

test("push registration manager skips repeated registration within the dedupe window", async () => {
  let nowValue = 1000;
  let registerCount = 0;
  const manager = createPushRegistrationManager({
    uniApp: createMockUniApp({}, {
      appVersion: "1.0.0",
      language: "zh-CN",
      timezone: "Asia/Shanghai",
    }),
    plusRuntime: createMockPlusRuntime({
      deviceToken: "device-1",
    }),
    nowFn: () => nowValue,
    minRegisterIntervalMs: 60000,
    resolveAuthIdentity: () => ({
      userId: "merchant_1",
      userType: "merchant",
    }),
    registerPushDevice() {
      registerCount += 1;
      return { ok: true };
    },
  });

  await manager.registerCurrentPushDevice();
  nowValue = 4000;
  const result = await manager.registerCurrentPushDevice();

  assert.equal(registerCount, 1);
  assert.equal(result.success, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "recently-registered");
});

test("push registration manager unregisters with cached state fallback and clears storage", async () => {
  const unregisterCalls = [];
  const uniApp = createMockUniApp({
    push_registration: JSON.stringify({
      userId: "rider_1",
      userType: "rider",
      deviceToken: "device-2",
      fingerprint: "cached",
      lastRegisteredAt: 100,
    }),
  });

  const manager = createPushRegistrationManager({
    uniApp,
    resolveAuthIdentity: () => null,
    unregisterPushDevice(payload) {
      unregisterCalls.push(payload);
      return { ok: true };
    },
  });

  const result = await manager.unregisterCurrentPushDevice();

  assert.equal(result.success, true);
  assert.deepEqual(unregisterCalls, [
    {
      userId: "rider_1",
      userType: "rider",
      deviceToken: "device-2",
    },
  ]);
  assert.equal(manager.getCachedRegistrationState(), null);
});

test("push registration manager clears stale state when identity or device token is missing", async () => {
  const uniApp = createMockUniApp({
    push_registration: JSON.stringify({
      userId: "user_9",
      userType: "customer",
      deviceToken: "device-stale",
      fingerprint: "stale",
      lastRegisteredAt: 100,
    }),
  });

  const manager = createPushRegistrationManager({
    uniApp,
    resolveAuthIdentity: () => null,
  });

  const result = await manager.registerCurrentPushDevice();

  assert.equal(result.success, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "missing-context");
  assert.equal(manager.getCachedRegistrationState(), null);
});
