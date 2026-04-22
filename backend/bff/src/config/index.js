/**
 * BFF configuration
 */

require("dotenv").config();

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
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

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    const pathname = parsed.pathname === "/"
      ? ""
      : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch (_error) {
    return "";
  }
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function requireSecret(name) {
  const secret = String(process.env[name] || "").trim();
  if (!secret) {
    throw new Error(`BFF requires ${name}`);
  }
  return secret;
}

function requireBaseUrl(name, fallback, productionLike) {
  const explicit = normalizeBaseUrl(process.env[name] || "");
  if (explicit) {
    return explicit;
  }
  if (productionLike) {
    throw new Error(`BFF requires ${name} in production-like environments`);
  }
  return normalizeBaseUrl(fallback);
}

function buildCorsOrigins(productionLike) {
  const configured = String(process.env.BFF_CORS_ORIGINS || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

  const defaults = productionLike
    ? []
    : [
      "http://127.0.0.1:8888",
      "http://localhost:8888",
      "http://127.0.0.1:1888",
      "http://localhost:1888",
      "http://127.0.0.1:1788",
      "http://localhost:1788"
    ];

  const adminWebBaseUrl = normalizeOrigin(process.env.ADMIN_WEB_BASE_URL || "");
  const siteWebBaseUrl = normalizeOrigin(process.env.SITE_WEB_BASE_URL || "");
  return uniqueValues([
    ...configured,
    ...defaults,
    adminWebBaseUrl,
    siteWebBaseUrl
  ]);
}

const requestTokenSecret = requireSecret("JWT_SECRET");
const adminTokenSecret = requireSecret("ADMIN_TOKEN_SECRET");
const adminQrLoginSecret = requireSecret("ADMIN_QR_LOGIN_SECRET");
const env = process.env.NODE_ENV || process.env.ENV || "development";
const productionLike = ["production", "prod", "staging"].includes(String(env).trim().toLowerCase());
const corsOrigins = buildCorsOrigins(productionLike);
const socketServerApiSecret = String(process.env.SOCKET_SERVER_API_SECRET || "").trim();
const goApiUrl = requireBaseUrl("GO_API_URL", "http://127.0.0.1:1029", productionLike);
const socketServerUrl = requireBaseUrl("SOCKET_SERVER_URL", "http://127.0.0.1:9898", productionLike);

if (productionLike && !socketServerApiSecret) {
  throw new Error("BFF requires SOCKET_SERVER_API_SECRET in production-like environments");
}
if (productionLike && corsOrigins.length === 0) {
  throw new Error("BFF requires BFF_CORS_ORIGINS or explicit ADMIN_WEB_BASE_URL/SITE_WEB_BASE_URL in production-like environments");
}

module.exports = {
  port: process.env.BFF_PORT || 25500,
  goApiUrl,
  socketServerUrl,
  socketServerApiSecret,
  adminDebugModeSettingsEnabled: toBoolean(process.env.ENABLE_ADMIN_DEBUG_MODE_SETTINGS, false),

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "yuexiang_user",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "yuexiang",
    dialect: process.env.DB_DIALECT || "postgres"
  },

  redis: {
    enabled: toBoolean(process.env.REDIS_ENABLED, true),
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 2550,
    password: process.env.REDIS_PASSWORD || "",
    db: process.env.REDIS_DB || 0
  },

  jwt: {
    secret: requestTokenSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },

  jwtSecret: requestTokenSecret,
  requestTokenSecret,
  adminTokenSecret,
  adminQrLoginSecret,
  adminWebBaseUrl: process.env.ADMIN_WEB_BASE_URL || "",
  siteWebBaseUrl: process.env.SITE_WEB_BASE_URL || "",
  corsOrigins,

  http: {
    requestTimeoutMs: toPositiveInt(process.env.BFF_REQUEST_TIMEOUT_MS, 30000),
    headersTimeoutMs: toPositiveInt(process.env.BFF_HEADERS_TIMEOUT_MS, 35000),
    keepAliveTimeoutMs: toPositiveInt(process.env.BFF_KEEP_ALIVE_TIMEOUT_MS, 5000),
    slowRequestWarnMs: toPositiveInt(process.env.BFF_SLOW_REQUEST_WARN_MS, productionLike ? 1200 : 2500)
  },

  bodyLimits: {
    jsonBytes: toPositiveInt(process.env.BFF_JSON_LIMIT_BYTES, 1024 * 1024),
    urlencodedBytes: toPositiveInt(process.env.BFF_URLENCODED_LIMIT_BYTES, 1024 * 1024)
  },

  uploads: {
    fileSizeBytes: toPositiveInt(process.env.BFF_UPLOAD_MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024),
    fieldSizeBytes: toPositiveInt(process.env.BFF_UPLOAD_MAX_FIELD_SIZE_BYTES, 64 * 1024),
    files: toPositiveInt(process.env.BFF_UPLOAD_MAX_FILES, 1)
  },

  rateLimit: {
    windowMs: toPositiveInt(process.env.BFF_API_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: toPositiveInt(process.env.BFF_API_RATE_LIMIT_MAX, productionLike ? 600 : 3000),
    redisEnabled: toBoolean(process.env.BFF_REDIS_RATE_LIMIT_ENABLED, productionLike && toBoolean(process.env.REDIS_ENABLED, true)),
    redisPrefix: String(process.env.BFF_REDIS_RATE_LIMIT_PREFIX || "ratelimit:bff:api").trim() || "ratelimit:bff:api",
    redisConnectTimeoutMs: toPositiveInt(process.env.BFF_REDIS_RATE_LIMIT_CONNECT_TIMEOUT_MS, 1000)
  },

  readiness: {
    requireSocket: toBoolean(process.env.BFF_READY_REQUIRE_SOCKET, true)
  },

  logLevel: process.env.LOG_LEVEL || "info",
  env,
  productionLike
};
