import test from "node:test";
import assert from "node:assert/strict";

import { persistConsumerAuthSessionResult } from "./consumer-auth-session.js";

test("consumer auth session helper persists standardized user session state", () => {
  const storage = {};
  const tokenCalls = [];

  const result = persistConsumerAuthSessionResult({
    result: {
      success: true,
      data: {
        authenticated: true,
        session: {
          token: "token-2",
          refreshToken: "refresh-2",
          expiresIn: 7200,
        },
        user: {
          id: "user-2",
          nickname: "小李",
        },
      },
    },
    profile: {
      id: "user-2",
      phone: "13912345678",
      nickname: "小李",
    },
    saveTokenInfo(...args) {
      tokenCalls.push(args);
    },
    uniApp: {
      setStorageSync(key, value) {
        storage[key] = value;
      },
    },
  });

  assert.equal(result.persisted, true);
  assert.deepEqual(tokenCalls, [["token-2", "refresh-2", 7200]]);
  assert.equal(storage.authMode, "user");
  assert.equal(storage.hasSeenWelcome, true);
  assert.deepEqual(storage.userProfile, {
    id: "user-2",
    phone: "13912345678",
    nickname: "小李",
  });
});

test("consumer auth session helper falls back cleanly when auth session is missing", () => {
  const tokenCalls = [];
  const storage = {};

  const result = persistConsumerAuthSessionResult({
    result: {
      success: true,
      data: {
        user: {
          id: "user-3",
        },
      },
    },
    profile: {
      id: "user-3",
      nickname: "未登录资料",
    },
    saveTokenInfo(...args) {
      tokenCalls.push(args);
    },
    uniApp: {
      setStorageSync(key, value) {
        storage[key] = value;
      },
    },
  });

  assert.equal(result.persisted, false);
  assert.deepEqual(result.profile, {
    id: "user-3",
    nickname: "未登录资料",
  });
  assert.deepEqual(tokenCalls, []);
  assert.deepEqual(storage, {});
});
