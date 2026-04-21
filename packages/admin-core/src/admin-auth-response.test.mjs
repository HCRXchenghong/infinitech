import test from "node:test";
import assert from "node:assert/strict";

import { ADMIN_AUTH_STORAGE_KEYS } from "./admin-auth-session.js";
import {
  ADMIN_AUTH_RESPONSE_STORAGE_KEYS,
  DEFAULT_ADMIN_LOGIN_TYPE,
  clearStoredAdminAuthSession,
  hasStoredAdminAuthToken,
  persistAdminAuthSessionFromAuthResult,
  readStoredAdminAuthToken,
  readStoredAdminLoginType,
  readStoredAdminRememberMe,
  writeStoredAdminLoginType,
  writeStoredAdminRememberMe,
} from "./admin-auth-response.js";

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

function createStorage(initial = {}) {
  const store = {};
  Object.entries(initial).forEach(([key, value]) => {
    store[key] = String(value);
  });

  return {
    store,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
  };
}

test("admin auth response helpers normalize preference reads and token presence", () => {
  const localStorage = createStorage({
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY]: " code ",
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY]: "false",
  });
  const sessionStorage = createStorage({
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY]: "password",
  });

  assert.equal(DEFAULT_ADMIN_LOGIN_TYPE, "password");
  assert.equal(readStoredAdminLoginType({ localStorage, sessionStorage }), "code");
  assert.equal(readStoredAdminRememberMe({ localStorage, sessionStorage }), false);

  writeStoredAdminLoginType("qr", { localStorage, sessionStorage });
  writeStoredAdminRememberMe(true, { localStorage, sessionStorage });

  assert.equal(localStorage.store.admin_login_type, "qr");
  assert.equal(readStoredAdminLoginType({ localStorage, sessionStorage }), "password");
  assert.equal(localStorage.store.admin_remember_me, "true");
  assert.equal(
    sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY),
    null,
  );
  assert.equal(
    sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY),
    null,
  );

  assert.equal(hasStoredAdminAuthToken({ localStorage, sessionStorage }), false);
  localStorage.setItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY, "admin-token-1");
  assert.equal(readStoredAdminAuthToken({ localStorage, sessionStorage }), "admin-token-1");
  assert.equal(hasStoredAdminAuthToken({ localStorage, sessionStorage }), true);

  clearStoredAdminAuthSession({ localStorage, sessionStorage });
  assert.equal(readStoredAdminAuthToken({ localStorage, sessionStorage }), "");
  assert.equal(hasStoredAdminAuthToken({ localStorage, sessionStorage }), false);
});

test("persistAdminAuthSessionFromAuthResult stores normalized admin sessions and bootstrap flags", () => {
  const token = createToken({
    sub: "admin_uid_9",
    principal_type: "admin",
    principal_id: "admin_uid_9",
    role: "super_admin",
    exp: 2000,
    iat: 1000,
  });
  const localStorage = createStorage({
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY]: "legacy-token",
  });
  const sessionStorage = createStorage({
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY]: JSON.stringify({ id: "legacy" }),
  });
  let clearCalled = 0;

  const result = persistAdminAuthSessionFromAuthResult(
    {
      token,
      user: {
        id: "9",
        name: " Alice ",
        phone: "13800138000",
        mustChangeBootstrap: true,
      },
    },
    {
      localStorage,
      sessionStorage,
      rememberMe: false,
      loginType: "qr",
      source: "qr",
      nowFn: () => 500,
      clearSessionStorage(storageOptions) {
        clearCalled += 1;
        clearStoredAdminAuthSession(storageOptions);
      },
    },
  );

  assert.equal(clearCalled, 1);
  assert.equal(result.persisted, true);
  assert.equal(result.authenticated, true);
  assert.equal(result.storageArea, "sessionStorage");
  assert.equal(result.mustChangeBootstrap, true);
  assert.equal(result.rememberMe, false);
  assert.equal(result.source, "qr");
  assert.equal(result.loginType, "password");
  assert.deepEqual(result.user, {
    id: "9",
    name: "Alice",
    phone: "13800138000",
    type: "super_admin",
    mustChangeBootstrap: true,
  });
  assert.equal(
    sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY),
    token,
  );
  assert.equal(localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY), null);
  assert.equal(
    localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY),
    "qr",
  );
  assert.equal(
    localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY),
    "false",
  );

  const storedUser = JSON.parse(
    sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY),
  );
  assert.equal(storedUser.mustChangeBootstrap, true);
  assert.equal(storedUser.type, "super_admin");

  const storedSession = JSON.parse(
    sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.SESSION_KEY),
  );
  assert.equal(storedSession.token, token);
  assert.equal(storedSession.source, "qr");
});

test("persistAdminAuthSessionFromAuthResult returns failures without mutating storage", () => {
  const localStorage = createStorage({
    [ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY]: "true",
  });
  const sessionStorage = createStorage();
  let clearCalled = 0;

  const result = persistAdminAuthSessionFromAuthResult(
    {
      success: false,
      message: "验证码错误",
    },
    {
      localStorage,
      sessionStorage,
      clearSessionStorage() {
        clearCalled += 1;
      },
    },
  );

  assert.deepEqual(result, {
    persisted: false,
    authenticated: false,
    message: "验证码错误",
    error: "验证码错误",
    session: null,
    user: null,
    mustChangeBootstrap: false,
    rememberMe: true,
    source: "",
    loginType: "password",
    sessionPayload: {
      request_id: "",
      code: "",
      message: "验证码错误",
      success: false,
      authenticated: false,
      token: "",
      refreshToken: "",
      expiresIn: 0,
      user: null,
      error: "验证码错误",
      needRegister: false,
      type: "",
      bindToken: "",
      nickname: "",
      avatarUrl: "",
    },
    storageArea: "",
  });
  assert.equal(clearCalled, 0);
  assert.equal(
    localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY),
    null,
  );
  assert.equal(
    sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY),
    null,
  );
});
