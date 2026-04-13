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

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function requireSharedSecret() {
  const secret = String(process.env.JWT_SECRET || process.env.ADMIN_TOKEN_SECRET || "").trim();
  if (!secret) {
    throw new Error("BFF requires ADMIN_TOKEN_SECRET or JWT_SECRET");
  }
  return secret;
}

function buildCorsOrigins() {
  const configured = String(process.env.BFF_CORS_ORIGINS || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

  const defaults = [
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

const adminTokenSecret = requireSharedSecret();
const env = process.env.NODE_ENV || process.env.ENV || "development";
const productionLike = ["production", "prod", "staging"].includes(String(env).trim().toLowerCase());

module.exports = {
  port: process.env.BFF_PORT || 25500,
  goApiUrl: process.env.GO_API_URL || "http://127.0.0.1:1029",
  socketServerUrl: process.env.SOCKET_SERVER_URL || "http://127.0.0.1:9898",
  socketServerApiSecret: String(process.env.SOCKET_SERVER_API_SECRET || process.env.TOKEN_API_SECRET || "").trim(),

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "yuexiang",
    dialect: process.env.DB_DIALECT || "mysql"
  },

  redis: {
    enabled: toBoolean(process.env.REDIS_ENABLED, true),
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 2550,
    password: process.env.REDIS_PASSWORD || "",
    db: process.env.REDIS_DB || 0
  },

  jwt: {
    secret: adminTokenSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },

  jwtSecret: adminTokenSecret,
  adminTokenSecret,
  adminWebBaseUrl: process.env.ADMIN_WEB_BASE_URL || "",
  siteWebBaseUrl: process.env.SITE_WEB_BASE_URL || "",
  adminQrLoginSecret: String(process.env.ADMIN_QR_LOGIN_SECRET || adminTokenSecret).trim(),
  corsOrigins: buildCorsOrigins(),

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
  env
};
