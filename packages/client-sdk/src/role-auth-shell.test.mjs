import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleAuthSessionOptions,
  buildRoleStoredAuthResolverOptions,
  createRoleAuthSessionBindings,
} from "./role-auth-shell.js";

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

test("role auth shell builds stable session and resolver options", () => {
  const sessionOptions = buildRoleAuthSessionOptions({
    role: "merchant",
    profileStorageKey: "merchantProfile",
    tokenStorageKeys: ["token", "access_token", "token"],
    allowLegacyAuthModeFallback: true,
    idSources: ["profile:id", "storage:merchantId"],
  });

  assert.deepEqual(sessionOptions, {
    role: "merchant",
    profileStorageKey: "merchantProfile",
    tokenStorageKeys: ["token", "access_token"],
    allowLegacyAuthModeFallback: true,
    idSources: ["profile:id", "storage:merchantId"],
  });

  assert.deepEqual(
    buildRoleStoredAuthResolverOptions({
      sessionOptions,
      userType: "merchant",
    }),
    {
      allowedAuthModes: ["merchant"],
      tokenKeys: ["token", "access_token"],
      profileKey: "merchantProfile",
      idSources: ["profile:id", "storage:merchantId"],
      role: "merchant",
      userType: "merchant",
    },
  );
});

test("role auth shell persists and reads merchant identity through shared bindings", () => {
  const bindings = createRoleAuthSessionBindings({
    role: "merchant",
    userType: "merchant",
    profileStorageKey: "merchantProfile",
    tokenStorageKeys: ["token", "access_token"],
    allowLegacyAuthModeFallback: true,
    idSources: ["profile:id", "profile:role_id", "storage:merchantId"],
    clearStorageKeys: ["access_token", "merchantId", "merchantName"],
    buildIdentity({ session, profile, readStorage, pickFirstText }) {
      const merchantPhone = pickFirstText([profile.phone, readStorage("merchantPhone")]);
      const merchantId = pickFirstText([
        session.accountId,
        profile.id,
        profile.role_id,
        readStorage("merchantId"),
      ]);
      const merchantName = pickFirstText(
        [profile.name, profile.nickname, profile.shopName, readStorage("merchantName")],
        "商户",
      );
      return {
        ...session,
        merchantId,
        merchantPhone,
        merchantName,
        userId: merchantId || merchantPhone,
      };
    },
  });
  const uniApp = createUniApp();

  bindings.persistRoleAuthSession({
    uniApp,
    token: "merchant-token",
    profile: {
      id: "merchant-8",
      shopName: "八号店",
      phone: "13800000000",
    },
    extraStorageValues: {
      merchantName: "八号店",
    },
  });

  assert.deepEqual(bindings.sessionOptions, {
    role: "merchant",
    profileStorageKey: "merchantProfile",
    tokenStorageKeys: ["token", "access_token"],
    allowLegacyAuthModeFallback: true,
    idSources: ["profile:id", "profile:role_id", "storage:merchantId"],
  });
  assert.deepEqual(bindings.storedAuthResolverOptions, {
    allowedAuthModes: ["merchant"],
    tokenKeys: ["token", "access_token"],
    profileKey: "merchantProfile",
    idSources: ["profile:id", "profile:role_id", "storage:merchantId"],
    role: "merchant",
    userType: "merchant",
  });
  assert.equal(bindings.readRoleAuthSession({ uniApp }).accountId, "merchant-8");
  assert.deepEqual(bindings.readRoleAuthIdentity({ uniApp }), {
    role: "merchant",
    token: "merchant-token",
    refreshToken: "",
    tokenExpiresAt: 0,
    authMode: "merchant",
    profile: {
      id: "merchant-8",
      shopName: "八号店",
      phone: "13800000000",
    },
    accountId: "merchant-8",
    isAuthenticated: true,
    tokenStorageKey: "token",
    refreshTokenStorageKey: "refreshToken",
    tokenExpiresAtStorageKey: "tokenExpiresAt",
    authModeStorageKey: "authMode",
    profileStorageKey: "merchantProfile",
    merchantId: "merchant-8",
    merchantPhone: "13800000000",
    merchantName: "八号店",
    userId: "merchant-8",
  });

  bindings.clearRoleAuthSession({
    uniApp,
    extraStorageKeys: ["merchant_push_registration"],
  });
  assert.deepEqual(uniApp.storage, {});
});

test("role auth shell supports rider fallback auth mode and custom identity projection", () => {
  const bindings = createRoleAuthSessionBindings({
    role: "rider",
    profileStorageKey: "riderProfile",
    tokenStorageKeys: ["token", "access_token"],
    allowLegacyAuthModeFallback: true,
    idSources: ["storage:riderId", "profile:id", "profile:riderId"],
    clearStorageKeys: ["access_token", "riderId", "riderPhone"],
    buildIdentity({ session, profile, readStorage, pickFirstText }) {
      const riderId = pickFirstText([
        session.accountId,
        profile.id,
        profile.riderId,
        readStorage("riderId"),
      ]);
      const riderPhone = pickFirstText([profile.phone, readStorage("riderPhone")]);

      return {
        ...session,
        riderId,
        riderPhone,
        userId: riderId,
      };
    },
  });
  const uniApp = createUniApp({
    access_token: "rider-token",
    riderId: "rider-18",
    riderPhone: "13900000000",
    riderProfile: {
      nickname: "骑手十八",
    },
  });

  const session = bindings.ensureRoleAuthSession({ uniApp });

  assert.equal(session.authMode, "rider");
  assert.equal(session.isAuthenticated, true);
  assert.deepEqual(bindings.readRoleAuthIdentity({ uniApp }), {
    role: "rider",
    token: "rider-token",
    refreshToken: "",
    tokenExpiresAt: 0,
    authMode: "rider",
    profile: {
      nickname: "骑手十八",
    },
    accountId: "rider-18",
    isAuthenticated: true,
    tokenStorageKey: "token",
    refreshTokenStorageKey: "refreshToken",
    tokenExpiresAtStorageKey: "tokenExpiresAt",
    authModeStorageKey: "authMode",
    profileStorageKey: "riderProfile",
    riderId: "rider-18",
    riderPhone: "13900000000",
    userId: "rider-18",
  });
});
