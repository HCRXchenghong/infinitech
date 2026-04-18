import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_AUTH_SESSION_VERSION,
  ADMIN_AUTH_STORAGE_KEYS,
  buildAdminAuthSession,
  createAdminSessionIdentity,
  getAdminSessionAccountId,
  isAdminAuthSessionExpired,
  isAdminAuthSessionValid,
  isAdminSessionUser,
  mergeAdminVerifiedSession,
  normalizeAdminAuthSessionRecord,
  normalizeAdminSessionUser,
} from "./admin-auth-session.js";

function encodeBase64UrlJSON(value) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createToken(payload) {
  return `header.${encodeBase64UrlJSON(payload)}.signature`;
}

test("admin auth session helpers normalize storage keys and explicit admin identities", () => {
  assert.deepEqual(ADMIN_AUTH_STORAGE_KEYS, {
    SESSION_KEY: "admin_session_v2",
    BIO_CONFIG_KEY: "admin_bio_config_v2",
    BIO_FAIL_STATE_KEY: "admin_bio_fail_state_v1",
    BIO_APP_LOCK_KEY: "admin_bio_lock_required_v1",
  });

  assert.deepEqual(
    createAdminSessionIdentity([
      { id: "9", name: "Ops" },
      { principal_type: "admin", principal_id: "admin_uid_9", role: "super_admin" },
    ]),
    {
      id: "9",
      uid: "admin_uid_9",
      numericId: "9",
      principalType: "admin",
      role: "super_admin",
      phone: "",
      name: "Ops",
      sessionId: "",
      type: "super_admin",
    },
  );

  assert.equal(isAdminSessionUser({ id: 9, name: "Ops" }), false);
  assert.equal(
    isAdminSessionUser({ principal_type: "admin", principal_id: "admin_9", role: "admin" }),
    true,
  );
});

test("admin auth session helpers normalize session users and account ids strictly", () => {
  assert.deepEqual(
    normalizeAdminSessionUser([
      { id: "9", name: " Alice " },
      { role: "ADMIN", principal_type: "admin", phone: "13800138000" },
    ]),
    {
      id: "9",
      phone: "13800138000",
      name: "Alice",
      type: "admin",
    },
  );

  assert.equal(
    getAdminSessionAccountId([
      { id: "", phone: "13800138000" },
      { role: "super_admin", principal_type: "admin" },
    ]),
    "13800138000",
  );
  assert.equal(
    normalizeAdminSessionUser({ id: "9", name: "Ops" }),
    null,
  );
});

test("admin auth session helpers build and normalize admin sessions from unified claims", () => {
  const token = createToken({
    sub: "admin_uid_9",
    principal_type: "admin",
    principal_id: "admin_uid_9",
    role: "super_admin",
    session_id: "sess_1",
    exp: 2000,
    iat: 1000,
  });

  const session = buildAdminAuthSession(
    `Bearer ${token}`,
    {
      id: "9",
      name: " Alice ",
      phone: "13800138000",
    },
    {
      source: "password",
      nowFn: () => 500,
    },
  );

  assert.deepEqual(session, {
    version: ADMIN_AUTH_SESSION_VERSION,
    token,
    user: {
      id: "9",
      phone: "13800138000",
      name: "Alice",
      type: "super_admin",
    },
    source: "password",
    issuedAt: 1000 * 1000,
    expiresAt: 2000 * 1000,
    lastVerifiedAt: 0,
    updatedAt: 500,
  });

  assert.deepEqual(
    normalizeAdminAuthSessionRecord({
      token,
      user: {
        id: "9",
        name: "Alice",
      },
      lastVerifiedAt: "10",
      updatedAt: "20",
    }),
    {
      token,
      user: {
        id: "9",
        phone: "",
        name: "Alice",
        type: "super_admin",
      },
      version: ADMIN_AUTH_SESSION_VERSION,
      source: "",
      issuedAt: 1000 * 1000,
      expiresAt: 2000 * 1000,
      lastVerifiedAt: 10,
      updatedAt: 20,
    },
  );
});

test("admin auth session helpers validate expiry and merge verified users", () => {
  const token = createToken({
    sub: "admin_uid_9",
    principal_type: "admin",
    principal_id: "admin_uid_9",
    role: "admin",
    exp: Math.floor((Date.now() + 5 * 60_000) / 1000),
    iat: Math.floor(Date.now() / 1000),
  });
  const session = buildAdminAuthSession(
    token,
    { id: "9", name: "Ops", type: "admin" },
    { nowFn: () => 1000 },
  );

  assert.equal(isAdminAuthSessionValid(session), true);
  assert.equal(
    isAdminAuthSessionExpired({
      ...session,
      expiresAt: Date.now() - 1000,
    }),
    true,
  );

  const merged = mergeAdminVerifiedSession(
    session,
    { id: "9", phone: "13800138000", name: "Verified Ops" },
    { nowFn: () => 5000 },
  );
  assert.deepEqual(merged, {
    ...session,
    user: {
      id: "9",
      phone: "13800138000",
      name: "Verified Ops",
      type: "admin",
    },
    lastVerifiedAt: 5000,
    updatedAt: 5000,
  });
});
