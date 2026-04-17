function trimValue(value) {
  return String(value || "").trim();
}

function readStorage(uniApp, key) {
  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function readProfile(uniApp, profileKey) {
  const rawProfile = readStorage(uniApp, profileKey);
  return rawProfile && typeof rawProfile === "object" ? rawProfile : {};
}

function normalizeModes(modes) {
  return Array.isArray(modes)
    ? modes.map((mode) => trimValue(mode)).filter(Boolean)
    : [];
}

function resolveSourceValue(source, context) {
  if (typeof source === "function") {
    return source(context);
  }

  const rawSource = trimValue(source);
  if (!rawSource) {
    return "";
  }

  if (rawSource.startsWith("profile:")) {
    return context.profile[rawSource.slice("profile:".length)];
  }

  if (rawSource.startsWith("storage:")) {
    return readStorage(context.uniApp, rawSource.slice("storage:".length));
  }

  return rawSource;
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

function matchesAuthMode(authMode, allowedAuthModes, allowEmptyAuthMode) {
  if (!allowedAuthModes.length) {
    return authMode ? true : allowEmptyAuthMode === true;
  }

  if (!authMode) {
    return allowEmptyAuthMode === true;
  }

  return allowedAuthModes.includes(authMode);
}

export function resolveStoredAuthIdentity(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const allowedAuthModes = normalizeModes(options.allowedAuthModes);
  const authMode = trimValue(readStorage(uniApp, options.authModeStorageKey || "authMode"));

  if (!matchesAuthMode(authMode, allowedAuthModes, options.allowEmptyAuthMode === true)) {
    return null;
  }

  const tokenKeys = Array.isArray(options.tokenKeys) && options.tokenKeys.length > 0
    ? options.tokenKeys
    : ["token"];
  const authToken = pickFirstValue(tokenKeys.map((key) => readStorage(uniApp, key)));
  if (!authToken) {
    return null;
  }

  const profileKey = trimValue(options.profileKey);
  const profile = profileKey ? readProfile(uniApp, profileKey) : {};
  const idSources = Array.isArray(options.idSources) && options.idSources.length > 0
    ? options.idSources
    : ["profile:id"];
  const userId = pickFirstValue(idSources.map((source) => resolveSourceValue(source, {
    uniApp,
    profile,
    authMode,
    authToken,
  })));

  if (!userId) {
    return null;
  }

  const role = trimValue(options.role);
  const userType = trimValue(options.userType);

  return {
    userId,
    authToken,
    ...(role ? { role } : {}),
    ...(userType ? { userType } : {}),
  };
}

export function createStoredAuthIdentityResolver(options = {}) {
  return () => resolveStoredAuthIdentity(options);
}
