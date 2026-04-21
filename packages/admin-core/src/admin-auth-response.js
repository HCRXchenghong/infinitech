import { extractAuthSessionResult } from "../../contracts/src/http.js";

import {
  ADMIN_AUTH_STORAGE_KEYS,
  buildAdminAuthSession,
  normalizeAdminAuthSessionRecord,
} from "./admin-auth-session.js";

export const DEFAULT_ADMIN_LOGIN_TYPE = "password";

export const ADMIN_AUTH_RESPONSE_STORAGE_KEYS = Object.freeze({
  TOKEN_KEY: "admin_token",
  USER_KEY: "admin_user",
  LOGIN_TYPE_KEY: "admin_login_type",
  REMEMBER_ME_KEY: "admin_remember_me",
});

function trimText(value) {
  return String(value ?? "").trim();
}

function normalizePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveStorage(storage) {
  return storage &&
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function" &&
    typeof storage.removeItem === "function"
    ? storage
    : null;
}

function resolveStorages(options = {}) {
  return {
    localStorage: resolveStorage(options.localStorage ?? globalThis.localStorage),
    sessionStorage: resolveStorage(options.sessionStorage ?? globalThis.sessionStorage),
  };
}

function readStorageValue(storage, key) {
  if (!storage || typeof storage.getItem !== "function") {
    return "";
  }
  return trimText(storage.getItem(key));
}

function writeStorageValue(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }
  storage.setItem(key, String(value));
}

function removeStorageValue(storage, key) {
  if (!storage || typeof storage.removeItem !== "function") {
    return;
  }
  storage.removeItem(key);
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function normalizeBooleanStorageValue(value, fallback) {
  const normalized = trimText(value).toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return Boolean(fallback);
}

function readSessionRecord(storage) {
  return normalizeAdminAuthSessionRecord(
    safeJsonParse(readStorageValue(storage, ADMIN_AUTH_STORAGE_KEYS.SESSION_KEY)),
  );
}

export function normalizeAdminLoginType(
  value,
  fallback = DEFAULT_ADMIN_LOGIN_TYPE,
) {
  const normalized = trimText(value).toLowerCase();
  if (normalized === "code") {
    return "code";
  }
  if (normalized === "password") {
    return "password";
  }

  return fallback === "code" ? "code" : DEFAULT_ADMIN_LOGIN_TYPE;
}

export function readStoredAdminLoginType(options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  return normalizeAdminLoginType(
    readStorageValue(localStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY) ||
      readStorageValue(sessionStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY),
  );
}

export function writeStoredAdminLoginType(loginType, options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  const normalizedLoginType =
    trimText(loginType).toLowerCase() || DEFAULT_ADMIN_LOGIN_TYPE;
  const preferenceStorage = localStorage || sessionStorage;
  if (!preferenceStorage) {
    return normalizedLoginType;
  }

  writeStorageValue(
    preferenceStorage,
    ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY,
    normalizedLoginType,
  );
  if (sessionStorage && sessionStorage !== preferenceStorage) {
    removeStorageValue(
      sessionStorage,
      ADMIN_AUTH_RESPONSE_STORAGE_KEYS.LOGIN_TYPE_KEY,
    );
  }

  return normalizedLoginType;
}

export function readStoredAdminRememberMe(options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  return normalizeBooleanStorageValue(
    readStorageValue(localStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY) ||
      readStorageValue(sessionStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY),
    true,
  );
}

export function writeStoredAdminRememberMe(rememberMe, options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  const normalizedRememberMe = Boolean(rememberMe);
  const preferenceStorage = localStorage || sessionStorage;
  if (!preferenceStorage) {
    return normalizedRememberMe;
  }

  writeStorageValue(
    preferenceStorage,
    ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY,
    String(normalizedRememberMe),
  );
  if (sessionStorage && sessionStorage !== preferenceStorage) {
    removeStorageValue(
      sessionStorage,
      ADMIN_AUTH_RESPONSE_STORAGE_KEYS.REMEMBER_ME_KEY,
    );
  }

  return normalizedRememberMe;
}

export function clearStoredAdminAuthSession(options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  for (const storage of [localStorage, sessionStorage]) {
    removeStorageValue(storage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY);
    removeStorageValue(storage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY);
    removeStorageValue(storage, ADMIN_AUTH_STORAGE_KEYS.SESSION_KEY);
  }
}

export function readStoredAdminAuthToken(options = {}) {
  const { localStorage, sessionStorage } = resolveStorages(options);
  const persistedSession =
    readSessionRecord(localStorage) || readSessionRecord(sessionStorage);
  if (persistedSession?.token) {
    return persistedSession.token;
  }

  return (
    readStorageValue(localStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY) ||
    readStorageValue(sessionStorage, ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY)
  );
}

export function hasStoredAdminAuthToken(options = {}) {
  return Boolean(readStoredAdminAuthToken(options));
}

export function persistAdminAuthSessionFromAuthResult(response, options = {}) {
  const sessionPayload = extractAuthSessionResult(response);
  const failureMessage =
    trimText(sessionPayload.error || sessionPayload.message) ||
    "登录失败，缺少有效凭证";
  const resolvedRememberMe =
    options.rememberMe === undefined
      ? readStoredAdminRememberMe(options)
      : Boolean(options.rememberMe);

  if (!sessionPayload.authenticated) {
    return {
      persisted: false,
      authenticated: false,
      message: failureMessage,
      error: failureMessage,
      session: null,
      user: null,
      mustChangeBootstrap: false,
      rememberMe: resolvedRememberMe,
      source: trimText(options.source || options.loginType),
      loginType: readStoredAdminLoginType(options),
      sessionPayload,
      storageArea: "",
    };
  }

  const source =
    trimText(options.source || options.loginType).toLowerCase() ||
    DEFAULT_ADMIN_LOGIN_TYPE;
  const session = buildAdminAuthSession(
    sessionPayload.token,
    sessionPayload.user || {},
    {
      source,
      nowFn: options.nowFn,
      defaultName: options.defaultName,
    },
  );
  const { localStorage, sessionStorage } = resolveStorages(options);
  const rememberMe = resolvedRememberMe;
  const targetStorage = rememberMe
    ? localStorage || sessionStorage
    : sessionStorage || localStorage;

  if (!targetStorage) {
    throw new Error("管理员会话存储不可用");
  }

  const clearSessionStorage =
    typeof options.clearSessionStorage === "function"
      ? options.clearSessionStorage
      : clearStoredAdminAuthSession;
  clearSessionStorage({ localStorage, sessionStorage });

  const rawUser = normalizePlainObject(sessionPayload.user);
  const mustChangeBootstrap = Boolean(
    rawUser.mustChangeBootstrap ?? rawUser.bootstrapPending,
  );
  const persistedUser = {
    ...rawUser,
    ...session.user,
    mustChangeBootstrap,
  };
  const storedLoginType =
    trimText(options.loginType === undefined ? source : options.loginType).toLowerCase() ||
    source;

  writeStorageValue(
    targetStorage,
    ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY,
    session.token,
  );
  writeStorageValue(
    targetStorage,
    ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY,
    JSON.stringify(persistedUser),
  );
  writeStorageValue(
    targetStorage,
    ADMIN_AUTH_STORAGE_KEYS.SESSION_KEY,
    JSON.stringify(session),
  );
  writeStoredAdminLoginType(storedLoginType, {
    localStorage,
    sessionStorage,
  });
  writeStoredAdminRememberMe(rememberMe, {
    localStorage,
    sessionStorage,
  });

  return {
    persisted: true,
    authenticated: true,
    message: "",
    error: "",
    session,
    user: persistedUser,
    mustChangeBootstrap,
    rememberMe,
    source,
    loginType: readStoredAdminLoginType({ localStorage, sessionStorage }),
    sessionPayload,
    storageArea: targetStorage === localStorage ? "localStorage" : "sessionStorage",
  };
}
