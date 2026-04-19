export const DEFAULT_ROLE_AUTH_TOKEN_STORAGE_KEY = "token";
export const DEFAULT_ROLE_AUTH_REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
export const DEFAULT_ROLE_AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY = "tokenExpiresAt";
export const DEFAULT_ROLE_AUTH_MODE_STORAGE_KEY = "authMode";

function trimValue(value) {
  return String(value || "").trim();
}

function readStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function writeStorage(uniApp, key, value) {
  if (!uniApp || typeof uniApp.setStorageSync !== "function") {
    return;
  }
  uniApp.setStorageSync(key, value);
}

function removeStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.removeStorageSync !== "function") {
    return;
  }
  uniApp.removeStorageSync(key);
}

function normalizeProfile(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readProfile(uniApp, key) {
  return normalizeProfile(readStorage(uniApp, key));
}

function normalizeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeSources(sources) {
  return Array.isArray(sources) ? sources : [];
}

function pickFirstValue(values) {
  for (const value of values) {
    const normalized = trimValue(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function resolveSourceValue(source, context) {
  if (typeof source === "function") {
    return source(context);
  }

  const normalizedSource = trimValue(source);
  if (!normalizedSource) {
    return "";
  }

  if (normalizedSource.startsWith("profile:")) {
    return context.profile?.[normalizedSource.slice("profile:".length)];
  }

  if (normalizedSource.startsWith("storage:")) {
    return readStorage(context.uniApp, normalizedSource.slice("storage:".length));
  }

  return normalizedSource;
}

function uniqueKeys(keys) {
  const deduped = [];
  const seen = new Set();
  for (const key of keys) {
    const normalizedKey = trimValue(key);
    if (!normalizedKey || seen.has(normalizedKey)) {
      continue;
    }
    seen.add(normalizedKey);
    deduped.push(normalizedKey);
  }
  return deduped;
}

function normalizeStorageKeys(primaryKey, storageKeys) {
  return uniqueKeys([
    primaryKey,
    ...(Array.isArray(storageKeys) ? storageKeys : []),
  ]);
}

function readFirstStorageValue(uniApp, storageKeys) {
  for (const key of storageKeys) {
    const value = trimValue(readStorage(uniApp, key));
    if (value) {
      return value;
    }
  }
  return "";
}

export function readRoleAuthSessionSnapshot(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const role = trimValue(options.role);
  const tokenStorageKey =
    trimValue(options.tokenStorageKey) || DEFAULT_ROLE_AUTH_TOKEN_STORAGE_KEY;
  const tokenStorageKeys = normalizeStorageKeys(
    tokenStorageKey,
    options.tokenStorageKeys,
  );
  const refreshTokenStorageKey =
    trimValue(options.refreshTokenStorageKey)
    || DEFAULT_ROLE_AUTH_REFRESH_TOKEN_STORAGE_KEY;
  const tokenExpiresAtStorageKey =
    trimValue(options.tokenExpiresAtStorageKey)
    || DEFAULT_ROLE_AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY;
  const authModeStorageKey =
    trimValue(options.authModeStorageKey) || DEFAULT_ROLE_AUTH_MODE_STORAGE_KEY;
  const profileStorageKey = trimValue(options.profileStorageKey);
  const profile = profileStorageKey ? readProfile(uniApp, profileStorageKey) : {};
  const authMode = trimValue(readStorage(uniApp, authModeStorageKey));
  const token = readFirstStorageValue(uniApp, tokenStorageKeys);
  const refreshToken = trimValue(readStorage(uniApp, refreshTokenStorageKey));
  const tokenExpiresAt = normalizeNumber(readStorage(uniApp, tokenExpiresAtStorageKey));
  const accountId = pickFirstValue(
    normalizeSources(options.idSources).map((source) => resolveSourceValue(source, {
      uniApp,
      profile,
      role,
      authMode,
      token,
    })),
  );
  const isAuthenticated = Boolean(token && role && authMode === role);

  return {
    role,
    token,
    refreshToken,
    tokenExpiresAt,
    authMode,
    profile,
    accountId,
    isAuthenticated,
    tokenStorageKey,
    refreshTokenStorageKey,
    tokenExpiresAtStorageKey,
    authModeStorageKey,
    profileStorageKey,
  };
}

export function hasRoleAuthSession(options = {}) {
  return readRoleAuthSessionSnapshot(options).isAuthenticated;
}

export function ensureRoleAuthSession(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const snapshot = readRoleAuthSessionSnapshot(options);
  if (snapshot.isAuthenticated) {
    return snapshot;
  }

  if (
    options.allowLegacyAuthModeFallback !== true
    || !snapshot.role
    || !snapshot.token
    || snapshot.authMode
    || !snapshot.accountId
  ) {
    return snapshot;
  }

  writeStorage(uniApp, snapshot.authModeStorageKey, snapshot.role);
  return {
    ...snapshot,
    authMode: snapshot.role,
    isAuthenticated: true,
  };
}

export function persistRoleAuthSession(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const role = trimValue(options.role);
  const token = trimValue(options.token);
  if (!role) {
    throw new Error("role auth session role is required");
  }
  if (!token) {
    throw new Error("role auth session token is required");
  }

  const tokenStorageKey =
    trimValue(options.tokenStorageKey) || DEFAULT_ROLE_AUTH_TOKEN_STORAGE_KEY;
  const refreshTokenStorageKey =
    trimValue(options.refreshTokenStorageKey)
    || DEFAULT_ROLE_AUTH_REFRESH_TOKEN_STORAGE_KEY;
  const tokenExpiresAtStorageKey =
    trimValue(options.tokenExpiresAtStorageKey)
    || DEFAULT_ROLE_AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY;
  const authModeStorageKey =
    trimValue(options.authModeStorageKey) || DEFAULT_ROLE_AUTH_MODE_STORAGE_KEY;
  const profileStorageKey = trimValue(options.profileStorageKey);
  const profile = normalizeProfile(options.profile);

  writeStorage(uniApp, tokenStorageKey, token);
  if (options.refreshToken === null || options.refreshToken === "") {
    removeStorage(uniApp, refreshTokenStorageKey);
  } else if (options.refreshToken !== undefined) {
    writeStorage(uniApp, refreshTokenStorageKey, trimValue(options.refreshToken));
  }

  if (options.tokenExpiresAt === null || options.tokenExpiresAt === "") {
    removeStorage(uniApp, tokenExpiresAtStorageKey);
  } else if (options.tokenExpiresAt !== undefined) {
    writeStorage(uniApp, tokenExpiresAtStorageKey, normalizeNumber(options.tokenExpiresAt));
  }

  if (profileStorageKey) {
    writeStorage(uniApp, profileStorageKey, profile);
  }
  writeStorage(uniApp, authModeStorageKey, role);

  const extraStorageValues =
    options.extraStorageValues && typeof options.extraStorageValues === "object"
      ? options.extraStorageValues
      : {};
  for (const [key, value] of Object.entries(extraStorageValues)) {
    const normalizedKey = trimValue(key);
    if (!normalizedKey) {
      continue;
    }
    if (value === null) {
      removeStorage(uniApp, normalizedKey);
      continue;
    }
    if (value === undefined) {
      continue;
    }
    writeStorage(uniApp, normalizedKey, value);
  }

  return readRoleAuthSessionSnapshot({
    ...options,
    role,
    tokenStorageKey,
    refreshTokenStorageKey,
    tokenExpiresAtStorageKey,
    authModeStorageKey,
    profileStorageKey,
  });
}

export function clearRoleAuthSession(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const keys = uniqueKeys([
    options.tokenStorageKey || DEFAULT_ROLE_AUTH_TOKEN_STORAGE_KEY,
    options.refreshTokenStorageKey || DEFAULT_ROLE_AUTH_REFRESH_TOKEN_STORAGE_KEY,
    options.tokenExpiresAtStorageKey || DEFAULT_ROLE_AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY,
    options.authModeStorageKey || DEFAULT_ROLE_AUTH_MODE_STORAGE_KEY,
    options.profileStorageKey,
    ...(Array.isArray(options.extraStorageKeys) ? options.extraStorageKeys : []),
  ]);

  for (const key of keys) {
    removeStorage(uniApp, key);
  }
}
