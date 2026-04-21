import test from "node:test";
import assert from "node:assert/strict";

import { persistRoleAuthSession } from "./role-auth-session.js";
import {
  buildRoleAuthSessionPersistOptions,
  persistRoleAuthSessionFromAuthResult,
  resolveRoleSessionTokenExpiresAt,
} from "./role-auth-response.js";

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

function persistMerchantSession(options = {}) {
  return persistRoleAuthSession({
    role: "merchant",
    profileStorageKey: "merchantProfile",
    idSources: ["profile:id", "profile:role_id"],
    ...options,
  });
}

test("role auth response helpers normalize expiry timestamps and session fallbacks", () => {
  assert.equal(
    resolveRoleSessionTokenExpiresAt(3600, { now: 1_000 }),
    3_601_000,
  );
  assert.equal(
    resolveRoleSessionTokenExpiresAt(0, { fallbackTokenExpiresAt: 8_888 }),
    8_888,
  );
  assert.equal(resolveRoleSessionTokenExpiresAt("", {}), null);

  assert.deepEqual(
    buildRoleAuthSessionPersistOptions({
      response: {
        token: "rider-token-2",
        expiresIn: 7200,
        user: {
          id: "rider-9",
          name: "九号骑手",
        },
      },
      currentSession: {
        refreshToken: "rider-refresh-legacy",
        tokenExpiresAt: 1_234_567,
      },
      now: 5_000,
      extraStorageValues({ responseUser, profile, pickFirstText }) {
        return {
          riderName: pickFirstText(
            [responseUser.name, profile.nickname],
            "骑手",
          ),
        };
      },
    }),
    {
      uniApp: undefined,
      token: "rider-token-2",
      refreshToken: "rider-refresh-legacy",
      tokenExpiresAt: 7_205_000,
      profile: {
        id: "rider-9",
        name: "九号骑手",
      },
      extraStorageValues: {
        riderName: "九号骑手",
      },
    },
  );
});

test("persistRoleAuthSessionFromAuthResult persists normalized role sessions through bound storage", () => {
  const uniApp = createUniApp();

  const session = persistRoleAuthSessionFromAuthResult({
    uniApp,
    persistRoleAuthSession: persistMerchantSession,
    response: {
      token: "merchant-token-1",
      refreshToken: "merchant-refresh-1",
      expiresIn: 3600,
      user: {
        id: "merchant-1",
        name: "一号门店",
      },
    },
    now: 9_000,
    extraStorageValues({ profile }) {
      return {
        merchantName: profile.name || "商户",
      };
    },
  });

  assert.equal(session.token, "merchant-token-1");
  assert.equal(session.refreshToken, "merchant-refresh-1");
  assert.equal(session.tokenExpiresAt, 3_609_000);
  assert.equal(session.accountId, "merchant-1");
  assert.deepEqual(uniApp.storage.merchantProfile, {
    id: "merchant-1",
    name: "一号门店",
  });
  assert.equal(uniApp.storage.merchantName, "一号门店");
});

test("persistRoleAuthSessionFromAuthResult rejects missing auth tokens", () => {
  assert.throws(
    () =>
      persistRoleAuthSessionFromAuthResult({
        persistRoleAuthSession: persistMerchantSession,
        response: {
          refreshToken: "merchant-refresh-1",
        },
      }),
    /auth response token is required/,
  );
});
