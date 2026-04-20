const crypto = require("crypto");
const config = require("../config");
const {
  decodeBase64UrlToJSON,
  extractUnifiedPrincipalIdentity,
  normalizeBearerToken,
  parseUnifiedTokenPayload,
} = require("../../../../packages/contracts/src/identity.cjs");
const {
  buildRuntimePrincipalIdentity,
  createSessionDescriptor,
} = require("../../../../packages/domain-core/src/identity.cjs");

function decodeBase64Url(value) {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, "base64");
  } catch (_error) {
    return null;
  }
}

function parseTokenPayload(token) {
  return parseUnifiedTokenPayload(token);
}

function extractPayloadIdentity(payload, options = {}) {
  const session = createSessionDescriptor(payload || {});
  const contractIdentity = extractUnifiedPrincipalIdentity(payload, options) || {};
  const runtimeIdentity = buildRuntimePrincipalIdentity(payload, {
    defaultRole: session.role || contractIdentity.role,
    defaultName: contractIdentity.name || "",
  }) || null;
  return {
    principalType: String(
      runtimeIdentity?.principalType
      || session.principalType
      || contractIdentity.principalType
      || "",
    ),
    legacyId: String(runtimeIdentity?.numericId || contractIdentity.legacyId || ""),
    id: String(
      runtimeIdentity?.id
      || session.principalId
      || session.subject
      || contractIdentity.principalId
      || "",
    ),
    uid: String(runtimeIdentity?.uid || contractIdentity.principalId || session.subject || ""),
    name: String(runtimeIdentity?.name || contractIdentity.name || ""),
    phone: String(runtimeIdentity?.phone || contractIdentity.phone || ""),
    type: String(runtimeIdentity?.role || session.role || contractIdentity.role || ""),
    sessionId: String(runtimeIdentity?.sessionId || session.sessionId || contractIdentity.sessionId || ""),
    tokenKind: String(session.tokenKind || contractIdentity.tokenKind || "")
  };
}

function extractAuthIdentity(req, options = {}) {
  const token = normalizeBearerToken(req?.headers?.authorization);
  if (!token) {
    return null;
  }

  const payload = parseTokenPayload(token) || {};
  const identity = extractPayloadIdentity(payload, options);

  return {
    token,
    id: identity.id || identity.legacyId,
    uid: identity.uid,
    legacyId: identity.legacyId,
    name: identity.name,
    phone: identity.phone,
    type: identity.type,
    principalType: identity.principalType,
    sessionId: identity.sessionId,
    tokenKind: identity.tokenKind,
    payload
  };
}

function parseOperatorFromAuthHeader(authorization) {
  const token = normalizeBearerToken(authorization);
  if (!token) {
    return { operatorId: "", operatorName: "" };
  }

  const payload = parseTokenPayload(token);
  if (!payload || typeof payload !== "object") {
    return { operatorId: "", operatorName: "" };
  }

  const identity = extractPayloadIdentity(payload, { normalizeType: true });
  return {
    operatorId: String(identity.id || identity.legacyId || ""),
    operatorName: String(identity.name || "")
  };
}

function verifySignedTokenSignature(token, secret = config.jwt.secret) {
  const rawToken = normalizeBearerToken(token);
  const resolvedSecret = String(secret || "").trim();
  if (!rawToken || !resolvedSecret) {
    return { valid: false, reason: "missing_token_or_secret" };
  }

  const parts = rawToken.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "invalid_format" };
  }

  const [payloadPart, signaturePart] = parts;
  const providedSignature = decodeBase64Url(signaturePart);
  if (!providedSignature || providedSignature.length === 0) {
    return { valid: false, reason: "invalid_signature_encoding" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", resolvedSecret)
    .update(payloadPart)
    .digest();

  if (providedSignature.length !== expectedSignature.length) {
    return { valid: false, reason: "signature_mismatch" };
  }

  if (!crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  const payload = decodeBase64UrlToJSON(payloadPart);
  if (!payload || typeof payload !== "object") {
    return { valid: false, reason: "invalid_payload" };
  }

  const exp = Number(payload.exp || 0);
  if (Number.isFinite(exp) && exp > 0 && Date.now() >= exp * 1000) {
    return { valid: false, reason: "token_expired", payload };
  }

  return { valid: true, payload };
}

function verifyAdminTokenSignature(token, secret = config.adminTokenSecret) {
  return verifySignedTokenSignature(token, secret);
}

function extractVerifiedAuthIdentity(req, options = {}) {
  const identity = extractAuthIdentity(req, options);
  if (!identity || !identity.token) {
    return null;
  }

  const verificationSecret = String(options.verificationSecret || config.jwt.secret || "").trim();
  const verification = verifySignedTokenSignature(identity.token, verificationSecret);
  if (!verification.valid) {
    return {
      ...identity,
      verification
    };
  }

  const payload = verification.payload || identity.payload || {};
  const normalized = extractPayloadIdentity(payload, options);

  return {
    ...identity,
    id: String(normalized.id || normalized.legacyId || identity.id || ""),
    uid: String(normalized.uid || identity.uid || ""),
    legacyId: String(normalized.legacyId || identity.legacyId || ""),
    name: String(normalized.name || identity.name || ""),
    phone: String(normalized.phone || identity.phone || ""),
    type: normalized.type || identity.type || "",
    principalType: normalized.principalType || identity.principalType || "",
    sessionId: normalized.sessionId || identity.sessionId || "",
    tokenKind: normalized.tokenKind || identity.tokenKind || "",
    payload,
    verification
  };
}

function extractVerifiedAdminIdentity(req, options = {}) {
  return extractVerifiedAuthIdentity(req, {
    ...options,
    verificationSecret: config.adminTokenSecret,
  });
}

module.exports = {
  normalizeBearerToken,
  decodeBase64UrlToJSON,
  parseTokenPayload,
  extractAuthIdentity,
  parseOperatorFromAuthHeader,
  verifySignedTokenSignature,
  verifyAdminTokenSignature,
  extractVerifiedAuthIdentity,
  extractVerifiedAdminIdentity
};
