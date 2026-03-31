const { logger } = require("../utils/logger");
const {
  extractVerifiedAdminIdentity,
  verifyAdminTokenSignature
} = require("../utils/authIdentity");

function normalizeAdminType(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedAdminType(type) {
  const normalized = normalizeAdminType(type);
  return normalized === "admin" || normalized === "super_admin" || normalized === "";
}

function validateAdminToken(token) {
  return verifyAdminTokenSignature(token).valid;
}

function isBootstrapAllowedPath(pathname) {
  const path = String(pathname || "").trim();
  return path === "/admins/complete-bootstrap"
    || path === "/verify-token"
    || path === "/qr-login/scan"
    || path === "/qr-login/confirm";
}

async function requireAdminAuth(req, res, next) {
  const identity = extractVerifiedAdminIdentity(req, { normalizeType: true });
  if (!identity || !identity.token) {
    return res.status(401).json({
      success: false,
      error: "\u672a\u6388\u6743\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55"
    });
  }

  if (!identity.verification?.valid) {
    logger.warn("Require admin auth verify failed", {
      reason: identity.verification?.reason || "unknown"
    });
    return res.status(401).json({
      success: false,
      error: "\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55"
    });
  }

  if (!identity.id) {
    return res.status(401).json({
      success: false,
      error: "\u65e0\u6548\u51ed\u8bc1\uff0c\u7f3a\u5c11\u8eab\u4efd\u6807\u8bc6"
    });
  }

  if (!isAllowedAdminType(identity.type)) {
    return res.status(403).json({
      success: false,
      error: "\u6743\u9650\u4e0d\u8db3"
    });
  }

  const bootstrapPending = Boolean(
    identity.payload?.bootstrapPending || identity.payload?.mustChangeBootstrap
  );
  if (bootstrapPending && !isBootstrapAllowedPath(req.path)) {
    return res.status(403).json({
      success: false,
      code: "ADMIN_BOOTSTRAP_REQUIRED",
      error: "\u8bf7\u5148\u5b8c\u6210\u9996\u6b21\u7ba1\u7406\u5458\u521d\u59cb\u5316"
    });
  }

  req.adminAuth = identity;
  return next();
}

module.exports = {
  requireAdminAuth,
  isAllowedAdminType,
  normalizeAdminType,
  validateAdminToken
};
