"use strict";

const PrincipalTypes = Object.freeze({
  USER: "user",
  MERCHANT: "merchant",
  RIDER: "rider",
  ADMIN: "admin",
});

const UnifiedSessionClaimKeys = Object.freeze([
  "sub",
  "principal_type",
  "principal_id",
  "role",
  "session_id",
  "scope",
  "exp",
  "iat",
]);

function normalizePrincipalType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return Object.values(PrincipalTypes).includes(normalized) ? normalized : "";
}

function isUnifiedSessionClaimsShape(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return UnifiedSessionClaimKeys.every((key) => key in value);
}

function normalizeBearerToken(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  return raw.toLowerCase().startsWith("bearer ")
    ? raw.slice(7).trim()
    : raw;
}

function normalizeBase64Url(value) {
  const raw = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (!raw) {
    return "";
  }
  const remainder = raw.length % 4;
  return remainder ? raw + "=".repeat(4 - remainder) : raw;
}

function decodeBase64UrlToJSON(value) {
  const normalized = normalizeBase64Url(value);
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function parseUnifiedTokenPayload(token) {
  const rawToken = normalizeBearerToken(token);
  if (!rawToken) {
    return null;
  }

  const parts = rawToken.split(".");
  const payloadPart = parts.length === 2 ? parts[0] : (parts.length >= 3 ? parts[1] : "");
  if (!payloadPart) {
    return null;
  }

  return decodeBase64UrlToJSON(payloadPart);
}

function claimString(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key];
    if (value === undefined || value === null) {
      continue;
    }
    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function claimNumericString(payload, keys) {
  const raw = claimString(payload, keys);
  return /^\d+$/.test(raw) ? raw : "";
}

function extractUnifiedPrincipalIdentity(payload, options = {}) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const normalizeType = options.normalizeType !== false;
  const principalTypeRaw = claimString(payload, ["principal_type", "principalType"]);
  const roleRaw = claimString(payload, ["role", "type", "userType"]);
  const tokenKindRaw = claimString(payload, ["token_kind", "tokenKind"]);
  const normalizedRole = normalizeType ? roleRaw.toLowerCase() : roleRaw;
  let normalizedPrincipalType = normalizeType ? principalTypeRaw.toLowerCase() : principalTypeRaw;
  if (!normalizedPrincipalType) {
    if (normalizedRole === "admin" || normalizedRole === "super_admin") {
      normalizedPrincipalType = PrincipalTypes.ADMIN;
    } else if (
      normalizedRole === PrincipalTypes.USER
      || normalizedRole === PrincipalTypes.MERCHANT
      || normalizedRole === PrincipalTypes.RIDER
    ) {
      normalizedPrincipalType = normalizedRole;
    }
  }

  let tokenKind = normalizeType ? tokenKindRaw.toLowerCase() : tokenKindRaw;
  if (!tokenKind) {
    const legacyType = normalizeType
      ? claimString(payload, ["type"]).toLowerCase()
      : claimString(payload, ["type"]);
    if (legacyType === "access" || legacyType === "refresh") {
      tokenKind = legacyType;
    }
  }

  return {
    principalType: normalizedPrincipalType,
    principalId: claimString(payload, [
      "principal_id",
      "principalId",
      "id",
      "sub",
      "adminId",
      "admin_id",
      "userId",
      "phone",
    ]),
    legacyId: claimNumericString(payload, [
      "principal_legacy_id",
      "userId",
      "numericId",
      "legacyId",
    ]),
    role: normalizedRole,
    sessionId: claimString(payload, ["session_id", "sessionId"]),
    tokenKind,
    phone: claimString(payload, ["phone"]),
    name: claimString(payload, ["name", "adminName", "username", "phone"]),
  };
}

module.exports = {
  PrincipalTypes,
  UnifiedSessionClaimKeys,
  normalizePrincipalType,
  isUnifiedSessionClaimsShape,
  normalizeBearerToken,
  decodeBase64UrlToJSON,
  parseUnifiedTokenPayload,
  extractUnifiedPrincipalIdentity,
};
