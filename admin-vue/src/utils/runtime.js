export function getToken() {
  return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
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

function normalizeNumericId(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return '';
  }
  return raw;
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

function normalizeBase64Url(value) {
  const raw = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = raw.length % 4;
  if (!remainder) {
    return raw;
  }
  return raw + '='.repeat(4 - remainder);
}

function decodeBase64UrlToJSON(value) {
  const normalized = normalizeBase64Url(value);
  if (!normalized) {
    return null;
  }

  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const text = typeof TextDecoder !== 'undefined'
      ? new TextDecoder('utf-8').decode(bytes)
      : binary;
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function parseTokenPayload(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return null;
  }

  const parts = rawToken.split('.');
  const payloadPart = parts.length === 2 ? parts[0] : (parts.length >= 3 ? parts[1] : '');
  if (!payloadPart) {
    return null;
  }

  return decodeBase64UrlToJSON(payloadPart);
}

function normalizeAdminType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAdminUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const uid = String(user.uid || user.id || user.adminId || user.admin_id || '').trim();
  const numericId = normalizeNumericId(user.userId || user.numericId || user.legacyId);

  return {
    id: uid || numericId || '',
    uid,
    numericId,
    phone: String(user.phone || ''),
    name: String(user.name || user.username || '管理员'),
    type: normalizeAdminType(user.type || user.role)
  };
}

export function getAdminSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (localStorage.getItem('admin_token')) {
    return localStorage;
  }
  if (sessionStorage.getItem('admin_token')) {
    return sessionStorage;
  }
  return localStorage;
}

export function getStoredAdminUser() {
  const raw = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user') || '';
  return normalizeAdminUser(safeJsonParse(raw));
}

export function getCurrentAdminIdentity() {
  const payload = parseTokenPayload(getToken()) || {};
  const storedUser = getStoredAdminUser();
  const type = normalizeAdminType(storedUser?.type || payload.type || payload.role);

  if (type !== 'admin' && type !== 'super_admin') {
    return null;
  }

  const uid = String(
    storedUser?.uid
      || storedUser?.id
      || payload.id
      || payload.sub
      || payload.adminId
      || payload.admin_id
      || ''
  ).trim();
  const numericId = normalizeNumericId(
    storedUser?.numericId
      || payload.userId
  );
  const id = uid || numericId || String(payload.phone || '').trim();

  if (!id) {
    return null;
  }

  return {
    id,
    uid,
    numericId,
    phone: String(storedUser?.phone || payload.phone || '').trim(),
    name: String(storedUser?.name || payload.name || payload.phone || '管理员').trim() || '管理员',
    type
  };
}

export function getCurrentAdminSocketIdentity() {
  const identity = getCurrentAdminIdentity();
  if (!identity) {
    return null;
  }

  const socketUserId = String(identity.numericId || identity.id || '').trim();
  if (!socketUserId) {
    return null;
  }

  return {
    userId: socketUserId,
    role: 'admin',
    cacheKey: `admin:${socketUserId}`
  };
}

export function clearCachedSocketToken() {
  localStorage.removeItem('socket_token');
  localStorage.removeItem('socket_token_account_key');
  sessionStorage.removeItem('socket_token');
  sessionStorage.removeItem('socket_token_account_key');
}

export function clearAdminSessionStorage() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_user');
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
