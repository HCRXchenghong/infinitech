import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerAppSessionManager } from "./consumer-app-session.js";

test("consumer app session manager reads active session snapshots", () => {
  const storage = {
    token: "token-1",
    refreshToken: "refresh-1",
    authMode: "user",
  };
  const sessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync(key) {
        return storage[key];
      },
      removeStorageSync(key) {
        delete storage[key];
      },
    },
  });

  assert.deepEqual(sessionManager.getSessionSnapshot(), {
    token: "token-1",
    refreshToken: "refresh-1",
    authMode: "user",
  });
  assert.equal(sessionManager.hasActiveSession(), true);
});

test("consumer app session manager clears stale sessions without force logout", async () => {
  const removed = [];
  const sessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync() {
        return "";
      },
      removeStorageSync(key) {
        removed.push(key);
      },
    },
  });

  assert.equal(await sessionManager.verifySession(), false);
  assert.deepEqual(removed, [
    "token",
    "refreshToken",
    "tokenExpiresAt",
    "userProfile",
    "authMode",
  ]);
});

test("consumer app session manager forces logout when refresh fails", async () => {
  let logoutCalls = 0;
  const sessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync(key) {
        return {
          token: "token-1",
          refreshToken: "refresh-1",
          authMode: "user",
        }[key];
      },
      removeStorageSync() {},
    },
    manualRefreshToken: async () => false,
    forceLogout() {
      logoutCalls += 1;
    },
  });

  assert.equal(await sessionManager.verifySession(), false);
  assert.equal(logoutCalls, 1);
});

test("consumer app session manager verifies session responses and tolerates network errors", async () => {
  let requestCalls = 0;
  let logoutCalls = 0;

  const validSessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync(key) {
        return {
          token: "token-1",
          refreshToken: "refresh-1",
          authMode: "user",
        }[key];
      },
      removeStorageSync() {},
    },
    manualRefreshToken: async () => true,
    request: async ({ url }) => {
      requestCalls += 1;
      assert.equal(url, "https://api.example.com/api/auth/verify");
      return {
        statusCode: 200,
        data: { valid: true },
      };
    },
    baseUrl: "https://api.example.com",
    forceLogout() {
      logoutCalls += 1;
    },
  });

  assert.equal(await validSessionManager.verifySession(), true);

  const invalidSessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync(key) {
        return {
          token: "token-2",
          refreshToken: "refresh-2",
          authMode: "user",
        }[key];
      },
      removeStorageSync() {},
    },
    manualRefreshToken: async () => true,
    request: async () => ({
      statusCode: 200,
      data: { valid: false },
    }),
    forceLogout() {
      logoutCalls += 1;
    },
  });

  assert.equal(await invalidSessionManager.verifySession(), false);
  assert.equal(logoutCalls, 1);

  const resilientSessionManager = createConsumerAppSessionManager({
    uniApp: {
      getStorageSync(key) {
        return {
          token: "token-3",
          refreshToken: "refresh-3",
          authMode: "user",
        }[key];
      },
      removeStorageSync() {},
    },
    manualRefreshToken: async () => true,
    request: async () => {
      throw new Error("offline");
    },
    logger: {
      error() {},
    },
    forceLogout() {
      logoutCalls += 1;
    },
  });

  assert.equal(await resilientSessionManager.verifySession(), true);
  assert.equal(requestCalls, 1);
  assert.equal(logoutCalls, 1);
});
