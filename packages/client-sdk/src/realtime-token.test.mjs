import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY,
  DEFAULT_SOCKET_TOKEN_STORAGE_KEY,
  buildSocketTokenAccountKey,
  clearCachedSocketToken,
  extractSocketTokenResult,
  resolveSocketToken,
} from "./realtime-token.js";

function createMockUniApp(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const requests = [];

  return {
    requests,
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    request(payload) {
      requests.push(payload);
      if (typeof payload.success === "function") {
        payload.success({
          data: {
            data: {
              token: "socket-token-default",
              userId: payload.data.userId,
              role: payload.data.role,
            },
          },
        });
      }
    },
  };
}

test("buildSocketTokenAccountKey normalizes runtime values consistently", () => {
  assert.equal(buildSocketTokenAccountKey(" 1001 ", " Rider "), "rider:1001");
  assert.equal(buildSocketTokenAccountKey("", "user"), "");
});

test("extractSocketTokenResult prefers standardized envelope data", () => {
  assert.deepEqual(
    extractSocketTokenResult({
      request_id: "req-socket-1",
      code: "OK",
      message: "Socket token issued successfully",
      data: {
        token: "socket-token-1",
        userId: "u-1",
        role: "User",
      },
    }),
    {
      token: "socket-token-1",
      userId: "u-1",
      role: "user",
    },
  );
});

test("extractSocketTokenResult falls back to legacy root fields", () => {
  assert.deepEqual(
    extractSocketTokenResult({
      token: "socket-token-2",
      user_id: "merchant-9",
      role: "MERCHANT",
    }),
    {
      token: "socket-token-2",
      userId: "merchant-9",
      role: "merchant",
    },
  );
});

test("clearCachedSocketToken removes both token cache keys", () => {
  const uniApp = createMockUniApp({
    [DEFAULT_SOCKET_TOKEN_STORAGE_KEY]: "token-1",
    [DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY]: "user:user_1",
  });

  clearCachedSocketToken({ uniApp });

  assert.equal(uniApp.getStorageSync(DEFAULT_SOCKET_TOKEN_STORAGE_KEY), undefined);
  assert.equal(
    uniApp.getStorageSync(DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY),
    undefined,
  );
});

test("resolveSocketToken reuses cached token when account key matches", async () => {
  const uniApp = createMockUniApp({
    socket_token: "cached-token",
    socket_token_account_key: "merchant:merchant_1",
  });
  let requested = 0;

  const token = await resolveSocketToken({
    uniApp,
    userId: "merchant_1",
    role: "merchant",
    socketUrl: "https://socket.example.com",
    requestSocketToken() {
      requested += 1;
      return {
        data: {
          token: "fresh-token",
        },
      };
    },
  });

  assert.equal(token, "cached-token");
  assert.equal(requested, 0);
});

test("resolveSocketToken clears stale cache and persists refreshed token", async () => {
  const uniApp = createMockUniApp({
    socket_token: "stale-token",
    socket_token_account_key: "user:user_9",
  });
  const requestCalls = [];

  const token = await resolveSocketToken({
    uniApp,
    userId: "merchant_1",
    role: "merchant",
    socketUrl: "https://socket.example.com",
    authToken: "merchant-auth-token",
    requestSocketToken(options) {
      requestCalls.push(options);
      return {
        data: JSON.stringify({
          request_id: "req_1",
          code: "OK",
          data: {
            token: "fresh-token",
            userId: "merchant_1",
            role: "merchant",
          },
        }),
      };
    },
  });

  assert.equal(token, "fresh-token");
  assert.equal(requestCalls.length, 1);
  assert.equal(uniApp.getStorageSync("socket_token"), "fresh-token");
  assert.equal(
    uniApp.getStorageSync("socket_token_account_key"),
    "merchant:merchant_1",
  );
});

test("resolveSocketToken uses the default requester and normalizes bearer headers", async () => {
  const uniApp = createMockUniApp();

  const token = await resolveSocketToken({
    uniApp,
    userId: "rider_2",
    role: "rider",
    socketUrl: "https://socket.example.com",
    authToken: "auth-token-1",
  });

  assert.equal(token, "socket-token-default");
  assert.deepEqual(uniApp.requests[0].header, {
    "Content-Type": "application/json",
    Authorization: "Bearer auth-token-1",
  });
});

test("resolveSocketToken throws a custom authorization error when request headers are missing", async () => {
  const uniApp = createMockUniApp();

  await assert.rejects(
    () =>
      resolveSocketToken({
        uniApp,
        userId: "user_1",
        role: "user",
        socketUrl: "https://socket.example.com",
        missingAuthorizationMessage: "请先登录后再连接聊天",
      }),
    /请先登录后再连接聊天/,
  );
});
