/**
 * BFF configuration
 */

require("dotenv").config();

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
  const secret = String(process.env.ADMIN_TOKEN_SECRET || process.env.JWT_SECRET || "").trim();
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
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://localhost:8080"
  ];

  const adminWebBaseUrl = normalizeOrigin(process.env.ADMIN_WEB_BASE_URL || "");
  return uniqueValues([
    ...configured,
    ...defaults,
    adminWebBaseUrl
  ]);
}

const adminTokenSecret = requireSharedSecret();

module.exports = {
  port: process.env.BFF_PORT || 25500,
  goApiUrl: process.env.GO_API_URL || "http://127.0.0.1:1029",

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "yuexiang",
    dialect: process.env.DB_DIALECT || "mysql"
  },

  redis: {
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
  adminQrLoginSecret: String(process.env.ADMIN_QR_LOGIN_SECRET || adminTokenSecret).trim(),
  corsOrigins: buildCorsOrigins(),

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },

  logLevel: process.env.LOG_LEVEL || "info",
  env: process.env.NODE_ENV || "development"
};
