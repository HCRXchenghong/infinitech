function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function normalizePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
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

function resolveOptionValue(option, context) {
  if (typeof option === "function") {
    return option(context);
  }
  return option;
}

export function resolveRoleSessionTokenExpiresAt(expiresIn, options = {}) {
  const now = normalizeNumber(
    options.now === undefined ? Date.now() : options.now,
  );
  const expiresInSeconds = normalizeNumber(expiresIn);
  if (expiresInSeconds > 0) {
    return now + expiresInSeconds * 1000;
  }

  const fallbackTokenExpiresAt = normalizeNumber(options.fallbackTokenExpiresAt);
  return fallbackTokenExpiresAt > 0 ? fallbackTokenExpiresAt : null;
}

export function buildRoleAuthSessionPersistOptions(options = {}) {
  const response = normalizePlainObject(options.response);
  const currentSession = normalizePlainObject(options.currentSession);
  const responseUser = normalizePlainObject(response.user);
  const context = {
    response,
    currentSession,
    responseUser,
    trimValue,
    pickFirstText,
    normalizePlainObject,
  };

  const explicitProfile = normalizePlainObject(
    resolveOptionValue(options.profile, context),
  );
  const profileFallback = normalizePlainObject(
    resolveOptionValue(options.profileFallback, context),
  );
  const profile =
    Object.keys(explicitProfile).length > 0
      ? explicitProfile
      : Object.keys(responseUser).length > 0
        ? responseUser
        : profileFallback;

  const extraStorageValues = normalizePlainObject(
    resolveOptionValue(options.extraStorageValues, {
      ...context,
      profile,
    }),
  );
  const token = trimValue(
    options.token === undefined ? response.token : options.token,
  );
  const refreshToken = pickFirstText(
    [
      options.refreshToken,
      response.refreshToken,
      currentSession.refreshToken,
    ],
    "",
  );
  const tokenExpiresAt =
    options.tokenExpiresAt === undefined
      ? resolveRoleSessionTokenExpiresAt(response.expiresIn, {
          now: options.now,
          fallbackTokenExpiresAt: currentSession.tokenExpiresAt,
        })
      : resolveRoleSessionTokenExpiresAt(undefined, {
          fallbackTokenExpiresAt: options.tokenExpiresAt,
        });

  return {
    uniApp: options.uniApp,
    token,
    refreshToken: refreshToken || null,
    tokenExpiresAt,
    profile,
    extraStorageValues,
  };
}

export function persistRoleAuthSessionFromAuthResult(options = {}) {
  const persistRoleAuthSession = options.persistRoleAuthSession;
  if (typeof persistRoleAuthSession !== "function") {
    throw new Error("persistRoleAuthSession function is required");
  }

  const persistOptions = buildRoleAuthSessionPersistOptions(options);
  if (!persistOptions.token) {
    throw new Error("auth response token is required");
  }

  return persistRoleAuthSession(persistOptions);
}
