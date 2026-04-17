import {
  PrincipalTypes,
  extractUnifiedPrincipalIdentity,
  normalizePrincipalType,
} from "../../contracts/src/identity.js";

function trimText(value) {
  return String(value ?? "").trim();
}

function normalizeRole(value, fallback = "") {
  const normalized = trimText(value || fallback).toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "super_admin") {
    return "super_admin";
  }
  return Object.values(PrincipalTypes).includes(normalized) ? normalized : "";
}

export function normalizeRuntimeNumericId(value) {
  const normalized = trimText(value);
  return /^\d+$/.test(normalized) ? normalized : "";
}

export function createSessionDescriptor(claims = {}) {
  const identity = extractUnifiedPrincipalIdentity(claims, {
    normalizeType: true,
  }) || {
    principalType: "",
    principalId: "",
    role: "",
    sessionId: "",
    tokenKind: "",
  };
  const principalType = normalizePrincipalType(identity.principalType);
  return {
    subject: trimText(claims.sub || identity.principalId),
    principalType,
    principalId: trimText(identity.principalId),
    role: trimText(identity.role),
    sessionId: trimText(identity.sessionId),
    tokenKind: trimText(identity.tokenKind),
    scope: Array.isArray(claims.scope)
      ? claims.scope.map((item) => trimText(item)).filter(Boolean)
      : trimText(claims.scope)
          .split(/[,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean),
  };
}

export function hasEnterpriseSessionShape(claims = {}) {
  const descriptor = createSessionDescriptor(claims);
  return Boolean(
    descriptor.subject && descriptor.principalType && descriptor.principalId,
  );
}

export function buildRuntimePrincipalIdentity(source = {}, options = {}) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const identity = extractUnifiedPrincipalIdentity(source, {
    normalizeType: true,
  }) || {
    principalType: "",
    principalId: "",
    legacyId: "",
    role: "",
    sessionId: "",
    phone: "",
    name: "",
  };

  const expectedPrincipalType = normalizePrincipalType(
    options.expectedPrincipalType,
  );
  const principalType = normalizePrincipalType(
    identity.principalType || expectedPrincipalType,
  );
  if (
    expectedPrincipalType &&
    principalType &&
    principalType !== expectedPrincipalType
  ) {
    return null;
  }

  const numericId = normalizeRuntimeNumericId(
    source.numericId
      || source.legacyId
      || source.userId
      || source.adminId
      || source.admin_id
      || identity.legacyId,
  );
  const phone = trimText(source.phone || identity.phone);
  const principalId = trimText(identity.principalId);
  const directId = trimText(source.id);
  let uid = trimText(source.uid);
  if (!uid && directId && directId !== numericId && directId !== phone) {
    uid = directId;
  }
  if (!uid && principalId && principalId !== numericId && principalId !== phone) {
    uid = principalId;
  }

  const role = normalizeRole(
    source.type
      || source.role
      || identity.role
      || (principalType === PrincipalTypes.ADMIN ? "admin" : principalType)
      || options.defaultRole,
  );
  const id = trimText(directId || uid || numericId || phone || principalId);
  if (!id && !trimText(options.allowEmptyId)) {
    return null;
  }

  return {
    id,
    uid,
    numericId,
    principalType: principalType || normalizePrincipalType(role),
    role,
    phone,
    name: trimText(
      source.name || source.username || identity.name || options.defaultName,
    ),
    sessionId: trimText(
      source.sessionId || source.session_id || identity.sessionId,
    ),
  };
}

export function mergeRuntimePrincipalIdentity(sources = [], options = {}) {
  const normalizedSources = Array.isArray(sources) ? sources : [sources];
  const entries = normalizedSources
    .map((source) => buildRuntimePrincipalIdentity(source, options))
    .filter(Boolean);

  if (entries.length === 0) {
    return null;
  }

  const merged = {
    id: "",
    uid: "",
    numericId: "",
    principalType: "",
    role: "",
    phone: "",
    name: "",
    sessionId: "",
  };

  for (const entry of entries) {
    if (!merged.id && entry.id) merged.id = entry.id;
    if (!merged.uid && entry.uid) merged.uid = entry.uid;
    if (!merged.numericId && entry.numericId) merged.numericId = entry.numericId;
    if (!merged.principalType && entry.principalType) {
      merged.principalType = entry.principalType;
    }
    if (!merged.role && entry.role) merged.role = entry.role;
    if (!merged.phone && entry.phone) merged.phone = entry.phone;
    if (!merged.name && entry.name) merged.name = entry.name;
    if (!merged.sessionId && entry.sessionId) merged.sessionId = entry.sessionId;
  }

  if (!merged.id) {
    merged.id = trimText(merged.uid || merged.numericId || merged.phone);
  }

  return merged.id ? merged : null;
}

export function createAdminRuntimeIdentity(sources = [], options = {}) {
  const merged = mergeRuntimePrincipalIdentity(sources, {
    expectedPrincipalType: PrincipalTypes.ADMIN,
    defaultRole: "admin",
    defaultName: "管理员",
    ...options,
  });
  if (!merged) {
    return null;
  }

  const type = normalizeRole(merged.role, "admin") || "admin";
  if (type !== "admin" && type !== "super_admin") {
    return null;
  }

  return {
    ...merged,
    type,
  };
}

export function resolveSocketSubjectId(
  claimedUserId,
  identities = [],
  options = {},
) {
  const claimed = trimText(claimedUserId);
  if (claimed) {
    return claimed;
  }

  const normalizedIdentities = Array.isArray(identities)
    ? identities
    : [identities];
  const preferNumericId = options.preferNumericId !== false;

  for (const entry of normalizedIdentities) {
    const identity = entry && typeof entry === "object" && "id" in entry
      ? entry
      : buildRuntimePrincipalIdentity(entry, options);
    if (!identity) {
      continue;
    }
    const nextId = preferNumericId
      ? trimText(identity.numericId || identity.id || identity.uid)
      : trimText(identity.id || identity.uid || identity.numericId);
    if (nextId) {
      return nextId;
    }
  }

  return trimText(options.fallbackId);
}

export function createSocketSessionIdentity(identity, options = {}) {
  const runtimeIdentity = identity && typeof identity === "object" && "id" in identity
    ? identity
    : buildRuntimePrincipalIdentity(identity, options);
  if (!runtimeIdentity) {
    return null;
  }

  const role = normalizeRole(
    options.role || runtimeIdentity.role || runtimeIdentity.principalType,
  );
  if (!role) {
    return null;
  }

  const userId = resolveSocketSubjectId("", runtimeIdentity, {
    preferNumericId: options.preferNumericId !== false,
  });
  if (!userId) {
    return null;
  }

  return {
    userId,
    role: role === "super_admin" ? "admin" : role,
    cacheKey: `${role === "super_admin" ? "admin" : role}:${userId}`,
  };
}
