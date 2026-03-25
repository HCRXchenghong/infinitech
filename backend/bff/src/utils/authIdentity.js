const crypto = require("crypto");
const config = require("../config");

function normalizeBearerToken(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return raw.toLowerCase().startsWith("bearer ")
    ? raw.slice(7).trim()
    : raw;
}

function decodeBase64Url(value) {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, "base64");
  } catch (_error) {
    return null;
  }
}

function decodeBase64UrlToJSON(value) {
  try {
    const buffer = decodeBase64Url(value);
    if (!buffer) {
      return null;
    }
    return JSON.parse(buffer.toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function parseTokenPayload(token) {
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

function extractAuthIdentity(req, options = {}) {
  const token = normalizeBearerToken(req?.headers?.authorization);
  if (!token) {
    return null;
  }

  const payload = parseTokenPayload(token) || {};
  const idRaw = payload.userId || payload.sub || payload.id || payload.adminId || payload.admin_id || payload.phone || "";
  const nameRaw = payload.name || payload.adminName || payload.username || payload.phone || "";
  const typeRaw = payload.type || payload.role || payload.userType || "";
  const type = options.normalizeType
    ? String(typeRaw || "").trim().toLowerCase()
    : String(typeRaw || "");

  return {
    token,
    id: String(idRaw || ""),
    name: String(nameRaw || ""),
    type,
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

  const operatorIdRaw = payload.userId || payload.sub || payload.id || payload.adminId || payload.admin_id || payload.phone || "";
  const operatorNameRaw = payload.name || payload.adminName || payload.username || payload.phone || "";
  return {
    operatorId: String(operatorIdRaw || ""),
    operatorName: String(operatorNameRaw || "")
  };
}

function verifyAdminTokenSignature(token, secret = config.adminTokenSecret) {
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

function extractVerifiedAdminIdentity(req, options = {}) {
  const identity = extractAuthIdentity(req, options);
  if (!identity || !identity.token) {
    return null;
  }

  const verification = verifyAdminTokenSignature(identity.token);
  if (!verification.valid) {
    return {
      ...identity,
      verification
    };
  }

  const payload = verification.payload || identity.payload || {};
  const typeRaw = payload.type || payload.role || payload.userType || identity.type || "";
  const type = options.normalizeType
    ? String(typeRaw || "").trim().toLowerCase()
    : String(typeRaw || "");

  return {
    ...identity,
    id: String(payload.id || payload.sub || payload.adminId || payload.admin_id || payload.userId || identity.id || ""),
    name: String(payload.name || payload.adminName || payload.username || payload.phone || identity.name || ""),
    type,
    payload,
    verification
  };
}

module.exports = {
  normalizeBearerToken,
  decodeBase64UrlToJSON,
  parseTokenPayload,
  extractAuthIdentity,
  parseOperatorFromAuthHeader,
  verifyAdminTokenSignature,
  extractVerifiedAdminIdentity
};
