const crypto = require("crypto");
const config = require("../../config");
const { logger } = require("../../utils/logger");
const {
  extractVerifiedAdminIdentity,
  verifyAdminTokenSignature
} = require("../../utils/authIdentity");

const QR_LOGIN_SESSION_TTL_MS = 2 * 60 * 1000;
const QR_LOGIN_POLL_INTERVAL_MS = 2000;
const QR_LOGIN_FINAL_KEEP_MS = 5 * 60 * 1000;
const QR_LOGIN_ENCRYPTION_VERSION = "v1";
const QR_LOGIN_ENCRYPTION_ALGORITHM = "aes-256-gcm";
const QR_LOGIN_PURPOSE = "admin_web_login";
const QR_LOGIN_DOWNLOAD_PATH = "/download";
const QR_LOGIN_PAYLOAD_PARAM = "login";
const QR_LOGIN_AAD = Buffer.from("yuexiang:admin:qr-login");

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getQrLoginEncryptionKey() {
  const secret = String(config.adminQrLoginSecret || config.adminTokenSecret || "").trim();
  return crypto.createHash("sha256").update(secret).digest();
}

function buildQrLoginEncryptedPayload(ticket, expiresAt) {
  const payload = {
    version: QR_LOGIN_ENCRYPTION_VERSION,
    purpose: QR_LOGIN_PURPOSE,
    ticket: String(ticket || "").trim(),
    expiresAt: Number(expiresAt || 0),
    nonce: crypto.randomBytes(8).toString("hex")
  };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(QR_LOGIN_ENCRYPTION_ALGORITHM, getQrLoginEncryptionKey(), iv);
  cipher.setAAD(QR_LOGIN_AAD);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    QR_LOGIN_ENCRYPTION_VERSION,
    toBase64Url(iv),
    toBase64Url(encrypted),
    toBase64Url(authTag)
  ].join(".");
}

function parseQrLoginEncryptedPayload(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split(".");
  if (parts.length !== 4 || parts[0] !== QR_LOGIN_ENCRYPTION_VERSION) {
    return null;
  }

  try {
    const iv = fromBase64Url(parts[1]);
    const encrypted = fromBase64Url(parts[2]);
    const authTag = fromBase64Url(parts[3]);
    const decipher = crypto.createDecipheriv(QR_LOGIN_ENCRYPTION_ALGORITHM, getQrLoginEncryptionKey(), iv);
    decipher.setAAD(QR_LOGIN_AAD);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function extractEncryptedPayloadFromScanText(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith(`${QR_LOGIN_ENCRYPTION_VERSION}.`)) {
    return raw;
  }

  try {
    const parsed = new URL(
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `http://localhost${raw.startsWith("/") ? "" : "/"}${raw}`
    );
    return String(
      parsed.searchParams.get(QR_LOGIN_PAYLOAD_PARAM) ||
      parsed.searchParams.get("payload") ||
      parsed.searchParams.get("qr") ||
      parsed.searchParams.get("p") ||
      ""
    ).trim();
  } catch (_error) {
    return "";
  }
}

function nowMs() {
  return Date.now();
}

function resolveQrTicketFromInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const encryptedPayload = raw.startsWith(`${QR_LOGIN_ENCRYPTION_VERSION}.`)
    ? raw
    : extractEncryptedPayloadFromScanText(raw);
  if (!encryptedPayload) {
    return "";
  }

  const decoded = parseQrLoginEncryptedPayload(encryptedPayload);
  if (!decoded || typeof decoded !== "object") {
    return "";
  }

  if (String(decoded.purpose || "") !== QR_LOGIN_PURPOSE) {
    return "";
  }

  const expiresAt = Number(decoded.expiresAt || 0);
  if (Number.isFinite(expiresAt) && expiresAt > 0 && nowMs() > expiresAt) {
    return "";
  }

  return String(decoded.ticket || "").trim();
}

function resolveQrTicketFromRequest(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const candidates = [
    body.ticket,
    body.encryptedPayload,
    body.payload,
    body.scanText,
    body.scanResult,
    body.qrText,
    body.result,
    body.content
  ];

  for (const candidate of candidates) {
    const ticket = resolveQrTicketFromInput(candidate);
    if (ticket) {
      return ticket;
    }
  }

  return "";
}

function normalizeOrigin(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return "";
  }
}

function normalizeWebHost(rawHost) {
  let host = String(rawHost || "").trim();
  if (!host) {
    return "";
  }
  if (host.endsWith(":25500")) {
    host = `${host.slice(0, -6)}:8888`;
  }
  return host;
}

function resolveWebBaseUrl(req) {
  const configuredOrigin = normalizeOrigin(config.adminWebBaseUrl);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const bodyOrigin = normalizeOrigin(req.body?.webOrigin || req.body?.origin || "");
  if (bodyOrigin) {
    return bodyOrigin;
  }

  const headerOrigin = normalizeOrigin(req.headers["x-web-origin"] || req.headers.origin || "");
  if (headerOrigin) {
    return headerOrigin;
  }

  const protoRaw = String(req.headers["x-forwarded-proto"] || req.protocol || "http");
  const protocol = protoRaw.split(",")[0].trim() === "https" ? "https" : "http";
  const hostRaw = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:8888");
  const host = normalizeWebHost(hostRaw.split(",")[0].trim()) || "localhost:8888";
  return `${protocol}://${host}`;
}

function buildFallbackAdminUser(identity, providedUser) {
  const input = providedUser && typeof providedUser === "object" ? providedUser : {};
  const id = input.id || input.userId || identity?.id || "";
  const name = input.name || input.username || identity?.name || "\u7ba1\u7406\u5458";
  const type = input.type || input.role || identity?.type || "";
  return {
    id: String(id || ""),
    name: String(name || ""),
    type: String(type || "")
  };
}

function normalizeAdminType(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedAdminType(type) {
  const normalized = normalizeAdminType(type);
  return normalized === "admin" || normalized === "super_admin" || normalized === "";
}

function getTokenExpiresAt(payload) {
  const exp = Number(payload && payload.exp ? payload.exp : 0);
  if (!Number.isFinite(exp) || exp <= 0) {
    return 0;
  }
  return exp * 1000;
}

function validateAdminToken(token) {
  const verification = verifyAdminTokenSignature(token);
  if (!verification.valid) {
    logger.warn("Validate admin token failed", {
      reason: verification.reason || "unknown"
    });
  }
  return verification.valid;
}

function buildVerifiedAdminUser(identity) {
  return {
    id: String(identity?.id || ""),
    name: String(identity?.name || "\u7ba1\u7406\u5458"),
    type: normalizeAdminType(identity?.type || ""),
    mustChangeBootstrap: Boolean(
      identity?.payload?.bootstrapPending || identity?.payload?.mustChangeBootstrap
    )
  };
}

async function verifyToken(req, res, next) {
  const identity = extractVerifiedAdminIdentity(req, { normalizeType: true });
  if (!identity || !identity.token) {
    return res.status(401).json({
      valid: false,
      error: "\u7f3a\u5c11\u9274\u6743\u4fe1\u606f"
    });
  }

  if (!isAllowedAdminType(identity.type)) {
    return res.status(403).json({
      valid: false,
      error: "\u6743\u9650\u4e0d\u8db3"
    });
  }

  if (!identity.id) {
    return res.status(401).json({
      valid: false,
      error: "\u65e0\u6548\u51ed\u8bc1\uff0c\u7f3a\u5c11\u8eab\u4efd\u6807\u8bc6"
    });
  }

  try {
    const valid = validateAdminToken(identity.token);
    if (!valid) {
      return res.status(401).json({
        valid: false,
        error: "\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55"
      });
    }

    const user = buildVerifiedAdminUser(identity);
    return res.json({
      valid: true,
      user,
      expiresAt: getTokenExpiresAt(identity.payload),
      checkedAt: nowMs()
    });
  } catch (error) {
    logger.error("Verify admin token error:", error);
    return next(error);
  }
}

module.exports = {
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_POLL_INTERVAL_MS,
  QR_LOGIN_FINAL_KEEP_MS,
  QR_LOGIN_DOWNLOAD_PATH,
  QR_LOGIN_PAYLOAD_PARAM,
  buildQrLoginEncryptedPayload,
  resolveQrTicketFromRequest,
  resolveWebBaseUrl,
  nowMs,
  buildFallbackAdminUser,
  isAllowedAdminType,
  validateAdminToken,
  buildVerifiedAdminUser,
  verifyToken,
};
