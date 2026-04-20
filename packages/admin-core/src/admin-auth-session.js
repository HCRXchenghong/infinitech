import {
  PrincipalTypes,
  normalizeBearerToken,
  parseUnifiedTokenPayload,
  extractUnifiedPrincipalIdentity,
  isUnifiedSessionClaimsShape,
} from "../../contracts/src/identity.js";
import { normalizeRuntimeNumericId } from "../../domain-core/src/identity.js";

export const ADMIN_AUTH_SESSION_VERSION = 2;
export const DEFAULT_ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_ADMIN_VERIFY_MAX_AGE_MS = 2 * 60 * 1000;
export const DEFAULT_ADMIN_TOKEN_EXPIRE_SKEW_MS = 60 * 1000;

export const ADMIN_AUTH_STORAGE_KEYS = Object.freeze({
  SESSION_KEY: "admin_session_v2",
  BIO_CONFIG_KEY: "admin_bio_config_v2",
  BIO_FAIL_STATE_KEY: "admin_bio_fail_state_v1",
  BIO_APP_LOCK_KEY: "admin_bio_lock_required_v1",
});

function trimText(value) {
  return String(value ?? "").trim();
}

function normalizeAdminType(value) {
  const normalized = trimText(value).toLowerCase();
  return normalized === "admin" || normalized === "super_admin"
    ? normalized
    : "";
}

function normalizeClaimsAdminType(source) {
  const treatAsTokenPayload = isUnifiedSessionClaimsShape(source);
  const claims = extractUnifiedPrincipalIdentity(source, {
    normalizeType: true,
    allowLegacyFallback: !treatAsTokenPayload,
  });
  if (!claims) {
    return "";
  }

  const normalizedRole = normalizeAdminType(claims.role);
  if (normalizedRole) {
    return normalizedRole;
  }

  return claims.principalType === PrincipalTypes.ADMIN ? "admin" : "";
}

function resolveExplicitAdminType(source) {
  if (!source || typeof source !== "object") {
    return "";
  }

  if (isUnifiedSessionClaimsShape(source)) {
    return normalizeAdminType(source.role) || normalizeClaimsAdminType(source);
  }

  return (
    normalizeAdminType(source.type || source.role || source.userType)
    || normalizeClaimsAdminType(source)
  );
}

function normalizeSources(sources) {
  return Array.isArray(sources) ? sources : [sources];
}

function resolveTokenTimestampMs(claims, key) {
  const numericValue = Number(claims?.[key] || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }
  return numericValue * 1000;
}

function normalizeAdminPrincipalId(source, claims, directId, phone) {
  const sourceUid = trimText(source?.uid);
  if (sourceUid) {
    return sourceUid;
  }

  const principalId = trimText(claims?.principalId);
  if (!principalId || principalId === directId || principalId === phone) {
    return "";
  }
  return principalId;
}

function collectAdminIdentityEntry(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const treatAsTokenPayload = isUnifiedSessionClaimsShape(source);
  const claims = extractUnifiedPrincipalIdentity(source, {
    normalizeType: true,
    allowLegacyFallback: !treatAsTokenPayload,
  });
  const directId = trimText(
    !treatAsTokenPayload
      ? source.id
        || source.adminId
        || source.admin_id
        || source.userId
        || source.user_id
      : "",
  );
  const phone = trimText(source.phone || claims?.phone);
  const principalId = normalizeAdminPrincipalId(source, claims, directId, phone);

  return {
    explicitType: resolveExplicitAdminType(source),
    directId,
    numericId: normalizeRuntimeNumericId(
      source.numericId
        || source.legacyId
        || (!treatAsTokenPayload ? directId : "")
        || claims?.legacyId
        || principalId,
    ),
    principalId,
    phone,
    name: trimText(source.name || source.username || claims?.name),
    sessionId: trimText(source.sessionId || source.session_id || claims?.sessionId),
  };
}

function resolveStrictAdminType(entries) {
  const normalizedEntries = Array.isArray(entries) ? entries : [entries];
  for (const entry of normalizedEntries) {
    if (entry?.explicitType === "super_admin") {
      return "super_admin";
    }
  }
  for (const entry of normalizedEntries) {
    if (entry?.explicitType === "admin") {
      return "admin";
    }
  }
  return "";
}

function pickFirstEntryValue(entries, key) {
  const normalizedEntries = Array.isArray(entries) ? entries : [entries];
  for (const entry of normalizedEntries) {
    const value = trimText(entry?.[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

export function createAdminSessionIdentity(sources = [], options = {}) {
  const entries = normalizeSources(sources)
    .map((source) => collectAdminIdentityEntry(source))
    .filter(Boolean);
  const explicitType = resolveStrictAdminType(entries);
  if (!explicitType) {
    return null;
  }

  const directId = pickFirstEntryValue(entries, "directId");
  const numericId = pickFirstEntryValue(entries, "numericId");
  const phone = pickFirstEntryValue(entries, "phone");
  const principalId = pickFirstEntryValue(entries, "principalId");
  const id = trimText(directId || numericId || phone || principalId);
  if (!id) {
    return null;
  }

  const uid = trimText(
    principalId
      || (
        directId && directId !== numericId && directId !== phone
          ? directId
          : ""
      ),
  );

  return {
    id,
    uid,
    numericId,
    principalType: PrincipalTypes.ADMIN,
    role: explicitType,
    phone,
    name: pickFirstEntryValue(entries, "name") || trimText(options.defaultName) || "管理员",
    sessionId: pickFirstEntryValue(entries, "sessionId"),
    type: explicitType,
  };
}

export function normalizeAdminSessionUser(sources = [], options = {}) {
  const identity = createAdminSessionIdentity(sources, options);
  if (!identity) {
    return null;
  }

  return {
    id: trimText(identity.id || identity.uid || identity.numericId || identity.phone),
    phone: trimText(identity.phone),
    name: trimText(identity.name || options.defaultName || "管理员") || "管理员",
    type: normalizeAdminType(identity.type || identity.role),
  };
}

export function isAdminSessionUser(sources = [], options = {}) {
  return Boolean(normalizeAdminSessionUser(sources, options));
}

export function getAdminSessionAccountId(sources = [], options = {}) {
  const user = normalizeAdminSessionUser(sources, options);
  if (!user) {
    return "";
  }
  return trimText(user.id || user.phone);
}

export function buildAdminAuthSession(token, user, options = {}) {
  const tokenValue = normalizeBearerToken(token);
  if (!tokenValue) {
    throw new Error("登录令牌缺失");
  }

  const claims = parseUnifiedTokenPayload(tokenValue) || {};
  const hasUserSource = normalizeSources(user).some(
    (source) => source && typeof source === "object",
  );
  if (!hasUserSource) {
    throw new Error("用户信息无效");
  }
  const normalizedUser = normalizeAdminSessionUser([user, claims], options);
  if (!normalizedUser) {
    throw new Error("权限不足，仅支持管理员账号");
  }

  const nowFn = typeof options.nowFn === "function" ? options.nowFn : () => Date.now();
  const now = nowFn();
  const expiresAt =
    resolveTokenTimestampMs(claims, "exp") || now + DEFAULT_ADMIN_SESSION_TTL_MS;
  const issuedAt = resolveTokenTimestampMs(claims, "iat") || now;

  return {
    version: ADMIN_AUTH_SESSION_VERSION,
    token: tokenValue,
    user: normalizedUser,
    source: trimText(options.source || "password") || "password",
    issuedAt,
    expiresAt,
    lastVerifiedAt: 0,
    updatedAt: now,
  };
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function normalizeAdminAuthSessionRecord(session = {}, options = {}) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const token = normalizeBearerToken(session.token);
  if (!token) {
    return null;
  }

  const claims = parseUnifiedTokenPayload(token) || {};
  const user = normalizeAdminSessionUser([session.user, claims], options);
  if (!user) {
    return null;
  }

  return {
    ...session,
    version: normalizeNumber(session.version) || ADMIN_AUTH_SESSION_VERSION,
    token,
    user,
    source: trimText(session.source),
    expiresAt:
      normalizeNumber(session.expiresAt) || resolveTokenTimestampMs(claims, "exp"),
    issuedAt:
      normalizeNumber(session.issuedAt) || resolveTokenTimestampMs(claims, "iat"),
    lastVerifiedAt: normalizeNumber(session.lastVerifiedAt),
    updatedAt: normalizeNumber(session.updatedAt),
  };
}

export function isAdminAuthSessionExpired(
  session,
  skewMs = DEFAULT_ADMIN_TOKEN_EXPIRE_SKEW_MS,
) {
  const normalizedSession = normalizeAdminAuthSessionRecord(session);
  if (!normalizedSession) {
    return true;
  }

  const expiresAt = normalizeNumber(normalizedSession.expiresAt);
  if (!expiresAt) {
    return true;
  }

  return Date.now() + Math.max(0, normalizeNumber(skewMs)) >= expiresAt;
}

export function isAdminAuthSessionValid(
  session,
  options = {},
) {
  const normalizedSession = normalizeAdminAuthSessionRecord(session, options);
  if (!normalizedSession) {
    return false;
  }
  return !isAdminAuthSessionExpired(
    normalizedSession,
    options.skewMs === undefined
      ? DEFAULT_ADMIN_TOKEN_EXPIRE_SKEW_MS
      : options.skewMs,
  );
}

export function mergeAdminVerifiedSession(session, user, options = {}) {
  const normalizedSession = normalizeAdminAuthSessionRecord(session, options);
  if (!normalizedSession) {
    return null;
  }

  const claims = parseUnifiedTokenPayload(normalizedSession.token) || {};
  const verifiedUser =
    normalizeAdminSessionUser([user, claims], options)
    || normalizedSession.user;
  const nowFn = typeof options.nowFn === "function" ? options.nowFn : () => Date.now();
  const now = nowFn();

  return {
    ...normalizedSession,
    user: verifiedUser,
    lastVerifiedAt: now,
    updatedAt: now,
  };
}
