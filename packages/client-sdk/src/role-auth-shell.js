import {
  clearRoleAuthSession,
  ensureRoleAuthSession,
  persistRoleAuthSession,
  readRoleAuthSessionSnapshot,
} from "./role-auth-session.js";

function trimValue(value) {
  return String(value == null ? "" : value).trim();
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

function getUniApp(uniApp) {
  return uniApp || globalThis.uni;
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

function pickFirstText(values, fallback = "") {
  for (const value of values) {
    const normalized = trimValue(value);
    if (normalized) {
      return normalized;
    }
  }
  return trimValue(fallback);
}

function normalizeIdSources(idSources) {
  return Array.isArray(idSources) ? [...idSources] : [];
}

export function buildRoleAuthSessionOptions(options = {}) {
  return Object.freeze({
    role: trimValue(options.role),
    profileStorageKey: trimValue(options.profileStorageKey),
    tokenStorageKeys: Object.freeze(
      uniqueKeys(Array.isArray(options.tokenStorageKeys) ? options.tokenStorageKeys : []),
    ),
    allowLegacyAuthModeFallback: options.allowLegacyAuthModeFallback === true,
    idSources: Object.freeze(normalizeIdSources(options.idSources)),
  });
}

export function buildRoleStoredAuthResolverOptions(options = {}) {
  const sessionOptions =
    options.sessionOptions && typeof options.sessionOptions === "object"
      ? options.sessionOptions
      : buildRoleAuthSessionOptions(options);
  const role = trimValue(options.role || sessionOptions.role);
  const userType = trimValue(options.userType) || role;

  return Object.freeze({
    allowedAuthModes: Object.freeze(role ? [role] : []),
    tokenKeys: Object.freeze([...sessionOptions.tokenStorageKeys]),
    profileKey: trimValue(sessionOptions.profileStorageKey),
    idSources: Object.freeze([...sessionOptions.idSources]),
    role,
    userType,
  });
}

export function createRoleAuthSessionBindings(options = {}) {
  const sessionOptions = buildRoleAuthSessionOptions(options);
  const storedAuthResolverOptions = buildRoleStoredAuthResolverOptions({
    ...options,
    sessionOptions,
  });
  const clearStorageKeys = Object.freeze(
    uniqueKeys(Array.isArray(options.clearStorageKeys) ? options.clearStorageKeys : []),
  );
  const buildIdentity =
    typeof options.buildIdentity === "function"
      ? options.buildIdentity
      : ({ session }) => session;

  function resolveUniApp(uniApp) {
    return getUniApp(uniApp || options.uniApp);
  }

  function readRoleAuthSession(optionsOverride = {}) {
    return readRoleAuthSessionSnapshot({
      uniApp: resolveUniApp(optionsOverride.uniApp),
      ...sessionOptions,
      ...optionsOverride,
    });
  }

  function ensureBoundRoleAuthSession(optionsOverride = {}) {
    return ensureRoleAuthSession({
      uniApp: resolveUniApp(optionsOverride.uniApp),
      ...sessionOptions,
      ...optionsOverride,
    });
  }

  function persistBoundRoleAuthSession(optionsOverride = {}) {
    return persistRoleAuthSession({
      uniApp: resolveUniApp(optionsOverride.uniApp),
      ...sessionOptions,
      ...optionsOverride,
    });
  }

  function clearBoundRoleAuthSession(optionsOverride = {}) {
    return clearRoleAuthSession({
      uniApp: resolveUniApp(optionsOverride.uniApp),
      profileStorageKey: sessionOptions.profileStorageKey,
      ...optionsOverride,
      extraStorageKeys: uniqueKeys([
        ...clearStorageKeys,
        ...(Array.isArray(optionsOverride.extraStorageKeys)
          ? optionsOverride.extraStorageKeys
          : []),
      ]),
    });
  }

  function readRoleAuthIdentity(optionsOverride = {}) {
    const uniApp = resolveUniApp(optionsOverride.uniApp);
    const session = readRoleAuthSession({
      ...optionsOverride,
      uniApp,
    });
    const profile =
      session.profile && typeof session.profile === "object" && !Array.isArray(session.profile)
        ? session.profile
        : {};
    const identity = buildIdentity({
      uniApp,
      session,
      profile,
      readStorage(key) {
        return readStorage(uniApp, key);
      },
      pickFirstText,
      trimValue,
    });

    return identity && typeof identity === "object" ? identity : session;
  }

  return {
    sessionOptions,
    storedAuthResolverOptions,
    readRoleAuthSession,
    ensureRoleAuthSession: ensureBoundRoleAuthSession,
    persistRoleAuthSession: persistBoundRoleAuthSession,
    clearRoleAuthSession: clearBoundRoleAuthSession,
    readRoleAuthIdentity,
  };
}
