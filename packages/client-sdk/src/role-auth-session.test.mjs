import test from "node:test";
import assert from "node:assert/strict";

import {
  clearRoleAuthSession,
  ensureRoleAuthSession,
  hasRoleAuthSession,
  persistRoleAuthSession,
  readRoleAuthSessionSnapshot,
} from "./role-auth-session.js";

function createUniApp(initialStorage = {}) {
  const storage = { ...initialStorage };
  return {
    storage,
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    removeStorageSync(key) {
      delete storage[key];
    },
  };
}

test("role auth session helpers persist and read merchant sessions consistently", () => {
  const uniApp = createUniApp();

  const session = persistRoleAuthSession({
    uniApp,
    role: "merchant",
    token: "merchant-token",
    refreshToken: "merchant-refresh",
    tokenExpiresAt: 1200,
    profileStorageKey: "merchantProfile",
    profile: {
      id: "merchant-9",
      name: "商户九号",
    },
    idSources: ["profile:id"],
    extraStorageValues: {
      merchantName: "商户九号",
    },
  });

  assert.deepEqual(session, {
    role: "merchant",
    token: "merchant-token",
    refreshToken: "merchant-refresh",
    tokenExpiresAt: 1200,
    authMode: "merchant",
    profile: {
      id: "merchant-9",
      name: "商户九号",
    },
    accountId: "merchant-9",
    isAuthenticated: true,
    tokenStorageKey: "token",
    refreshTokenStorageKey: "refreshToken",
    tokenExpiresAtStorageKey: "tokenExpiresAt",
    authModeStorageKey: "authMode",
    profileStorageKey: "merchantProfile",
  });

  assert.equal(uniApp.storage.token, "merchant-token");
  assert.equal(uniApp.storage.authMode, "merchant");
  assert.equal(uniApp.storage.merchantName, "商户九号");
  assert.equal(
    hasRoleAuthSession({
      uniApp,
      role: "merchant",
      profileStorageKey: "merchantProfile",
    }),
    true,
  );
});

test("role auth session helpers backfill legacy authMode when rider token and identity already exist", () => {
  const uniApp = createUniApp({
    token: "rider-token",
    riderId: "rider-18",
    riderProfile: {
      id: "rider-profile-18",
      name: "骑手十八",
    },
  });

  const session = ensureRoleAuthSession({
    uniApp,
    role: "rider",
    profileStorageKey: "riderProfile",
    allowLegacyAuthModeFallback: true,
    idSources: ["storage:riderId", "profile:id"],
  });

  assert.deepEqual(session, {
    role: "rider",
    token: "rider-token",
    refreshToken: "",
    tokenExpiresAt: 0,
    authMode: "rider",
    profile: {
      id: "rider-profile-18",
      name: "骑手十八",
    },
    accountId: "rider-18",
    isAuthenticated: true,
    tokenStorageKey: "token",
    refreshTokenStorageKey: "refreshToken",
    tokenExpiresAtStorageKey: "tokenExpiresAt",
    authModeStorageKey: "authMode",
    profileStorageKey: "riderProfile",
  });
  assert.equal(uniApp.storage.authMode, "rider");
});

test("role auth session helpers support legacy fallback token storage keys", () => {
  const uniApp = createUniApp({
    access_token: "legacy-rider-token",
    riderId: "rider-21",
    riderProfile: {
      nickname: "骑手二十一",
    },
  });

  const session = ensureRoleAuthSession({
    uniApp,
    role: "rider",
    profileStorageKey: "riderProfile",
    allowLegacyAuthModeFallback: true,
    tokenStorageKeys: ["token", "access_token"],
    idSources: ["storage:riderId", "profile:id"],
  });

  assert.equal(session.token, "legacy-rider-token");
  assert.equal(session.accountId, "rider-21");
  assert.equal(session.isAuthenticated, true);
  assert.equal(uniApp.storage.authMode, "rider");
});

test("role auth session helpers clear standard and extra storage keys together", () => {
  const uniApp = createUniApp({
    token: "merchant-token",
    refreshToken: "merchant-refresh",
    tokenExpiresAt: 1000,
    merchantProfile: {
      id: "merchant-7",
    },
    authMode: "merchant",
    merchantCurrentShopId: "shop-7",
  });

  clearRoleAuthSession({
    uniApp,
    profileStorageKey: "merchantProfile",
    extraStorageKeys: ["merchantCurrentShopId"],
  });

  assert.deepEqual(uniApp.storage, {});
});

test("role auth session snapshot stays unauthenticated when auth mode mismatches role", () => {
  const uniApp = createUniApp({
    token: "mixed-token",
    authMode: "user",
    merchantProfile: {
      id: "merchant-3",
    },
  });

  assert.deepEqual(
    readRoleAuthSessionSnapshot({
      uniApp,
      role: "merchant",
      profileStorageKey: "merchantProfile",
      idSources: ["profile:id"],
    }),
    {
      role: "merchant",
      token: "mixed-token",
      refreshToken: "",
      tokenExpiresAt: 0,
      authMode: "user",
      profile: {
        id: "merchant-3",
      },
      accountId: "merchant-3",
      isAuthenticated: false,
      tokenStorageKey: "token",
      refreshTokenStorageKey: "refreshToken",
      tokenExpiresAtStorageKey: "tokenExpiresAt",
      authModeStorageKey: "authMode",
      profileStorageKey: "merchantProfile",
    },
  );
});
