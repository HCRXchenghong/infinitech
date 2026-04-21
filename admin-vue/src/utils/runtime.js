import {
  ADMIN_AUTH_RESPONSE_STORAGE_KEYS,
  ADMIN_AUTH_STORAGE_KEYS,
  clearStoredAdminAuthSession,
  readStoredAdminAuthToken,
  createAdminSessionIdentity,
  normalizeAdminAuthSessionRecord,
  normalizeAdminSessionUser,
} from '@infinitech/admin-core';
import {
  parseUnifiedTokenPayload
} from '@infinitech/contracts/identity';
import {
  createSocketSessionIdentity,
} from '@infinitech/domain-core';

function getSessionStorageRecord(storage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return null;
  }

  return normalizeAdminAuthSessionRecord(
    safeJsonParse(storage.getItem(ADMIN_AUTH_STORAGE_KEYS.SESSION_KEY)),
  );
}

function getStoredRawAdminUser() {
  return safeJsonParse(
    localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY) ||
      sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.USER_KEY) ||
      '',
  );
}

export function getToken() {
  return readStoredAdminAuthToken({ localStorage, sessionStorage });
}

export const ADMIN_WEB_PORT = '8888';
export const SITE_WEB_PORT = '1888';
export const INVITE_WEB_PORT = '1788';

function normalizeOrigin(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return '';
  }
}

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

export function getAdminSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (getSessionStorageRecord(localStorage)) {
    return localStorage;
  }
  if (getSessionStorageRecord(sessionStorage)) {
    return sessionStorage;
  }
  if (localStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY)) {
    return localStorage;
  }
  if (sessionStorage.getItem(ADMIN_AUTH_RESPONSE_STORAGE_KEYS.TOKEN_KEY)) {
    return sessionStorage;
  }
  return localStorage;
}

export function getStoredAdminUser() {
  const rawUser = getStoredRawAdminUser();
  const session =
    getSessionStorageRecord(localStorage) || getSessionStorageRecord(sessionStorage);
  const normalizedUser = normalizeAdminSessionUser([
    rawUser,
    session?.user,
  ]);
  if (!normalizedUser) {
    return null;
  }

  return rawUser && typeof rawUser === 'object'
    ? { ...rawUser, ...normalizedUser }
    : normalizedUser;
}

export function getCurrentAdminIdentity() {
  const payload = parseUnifiedTokenPayload(getToken()) || {};
  const rawUser = getStoredRawAdminUser();
  const session =
    getSessionStorageRecord(localStorage) || getSessionStorageRecord(sessionStorage);
  return createAdminSessionIdentity([rawUser, session?.user, payload], {
    defaultName: '管理员',
  });
}

export function getCurrentAdminSocketIdentity() {
  const identity = getCurrentAdminIdentity();
  if (!identity) {
    return null;
  }
  return createSocketSessionIdentity(identity, {
    role: 'admin',
    preferNumericId: true,
  });
}

export function clearCachedSocketToken() {
  localStorage.removeItem('socket_token');
  localStorage.removeItem('socket_token_account_key');
  sessionStorage.removeItem('socket_token');
  sessionStorage.removeItem('socket_token_account_key');
}

export function clearAdminSessionStorage() {
  clearStoredAdminAuthSession({ localStorage, sessionStorage });
  clearCachedSocketToken();
}

export function getCurrentPort() {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }
  const port = window.location.port;
  if (port) {
    return port;
  }
  return window.location.protocol === 'https:' ? '443' : '80';
}

function normalizeRuntime(value) {
  const runtime = String(value || '').trim().toLowerCase();
  if (runtime === 'download') {
    return 'site';
  }
  if (runtime === 'invite' || runtime === 'admin' || runtime === 'site') {
    return runtime;
  }
  return '';
}

function getRuntimeConfig() {
  if (typeof window === 'undefined') {
    return {};
  }
  const config = window.__INFINITECH_RUNTIME_CONFIG__;
  return config && typeof config === 'object' ? config : {};
}

function getConfiguredRuntimeOrigin(runtime) {
  const config = getRuntimeConfig();
  const normalizedRuntime = normalizeRuntime(runtime) || 'admin';
  if (normalizedRuntime === 'site') {
    return normalizeOrigin(config.siteOrigin);
  }
  if (normalizedRuntime === 'invite') {
    return normalizeOrigin(config.inviteOrigin);
  }
  return normalizeOrigin(config.adminOrigin);
}

function inferRuntimeFromConfiguredOrigins() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return '';
  }
  const currentOrigin = normalizeOrigin(window.location.origin);
  if (!currentOrigin) {
    return '';
  }

  const entries = [
    ['site', getConfiguredRuntimeOrigin('site')],
    ['invite', getConfiguredRuntimeOrigin('invite')],
    ['admin', getConfiguredRuntimeOrigin('admin')],
  ];

  for (const [runtime, configuredOrigin] of entries) {
    if (configuredOrigin && configuredOrigin === currentOrigin) {
      return runtime;
    }
  }

  return '';
}

function inferRuntimeFromPort(port) {
  const currentPort = String(port || '').trim();
  if (currentPort === SITE_WEB_PORT) {
    return 'site';
  }
  if (currentPort === INVITE_WEB_PORT) {
    return 'invite';
  }
  return 'admin';
}

export function getAppRuntime() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envRuntime = normalizeRuntime(import.meta.env.VITE_APP_RUNTIME);
    if (envRuntime) {
      return envRuntime;
    }
    if (import.meta.env.VITE_INVITE_ONLY === 'true') {
      return 'invite';
    }
  }

  const configuredRuntime = inferRuntimeFromConfiguredOrigins();
  if (configuredRuntime) {
    return configuredRuntime;
  }

  return inferRuntimeFromPort(getCurrentPort());
}

export function isInviteRuntime() {
  return getAppRuntime() === 'invite';
}

export function isSiteRuntime() {
  return getAppRuntime() === 'site';
}

export function isPublicRuntime() {
  return getAppRuntime() !== 'admin';
}

export function getPortForRuntime(runtime) {
  const normalized = normalizeRuntime(runtime) || 'admin';
  if (normalized === 'site') {
    return SITE_WEB_PORT;
  }
  if (normalized === 'invite') {
    return INVITE_WEB_PORT;
  }
  return ADMIN_WEB_PORT;
}

export function buildRuntimeUrl(runtime, pathname = '/') {
  const normalizedRuntime = normalizeRuntime(runtime) || 'admin';
  const normalizedPath = String(pathname || '/').startsWith('/')
    ? String(pathname || '/')
    : `/${String(pathname || '')}`;

  const configuredOrigin = getConfiguredRuntimeOrigin(normalizedRuntime);
  if (configuredOrigin) {
    return `${configuredOrigin}${normalizedPath}`;
  }

  if (typeof window === 'undefined' || !window.location) {
    const port = getPortForRuntime(normalizedRuntime);
    return `http://127.0.0.1:${port}${normalizedPath}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || '127.0.0.1';
  return `${protocol}//${hostname}:${getPortForRuntime(normalizedRuntime)}${normalizedPath}`;
}

export function getPublicRuntimeGuardMessage() {
  if (isSiteRuntime()) {
    return '当前官网运行时仅允许官网相关接口访问';
  }
  if (isInviteRuntime()) {
    return '当前邀请页运行时仅允许邀请 / 领券页接口访问';
  }
  return '';
}
