const { buildErrorEnvelopePayload } = require("../utils/apiEnvelope");
const {
  extractVerifiedAdminIdentity,
  extractVerifiedAuthIdentity,
} = require("../utils/authIdentity");
const { isAllowedAdminType } = require("./requireAdminAuth");

function respondUnauthorized(req, res) {
  res.status(401).json(buildErrorEnvelopePayload(req, 401, "未授权，请先登录"));
}

function isRequestIdentityValid(identity) {
  if (!identity || !identity.verification?.valid) {
    return false;
  }

  if (String(identity.tokenKind || "").trim().toLowerCase() === "refresh") {
    return false;
  }

  return Boolean(
    String(identity.id || "").trim() &&
      String(identity.principalType || "").trim(),
  );
}

function requireUploadAuth(req, res, next) {
  const requestIdentity = extractVerifiedAuthIdentity(req, {
    normalizeType: true,
  });
  if (isRequestIdentityValid(requestIdentity)) {
    req.authIdentity = requestIdentity;
    next();
    return;
  }

  const adminIdentity = extractVerifiedAdminIdentity(req, {
    normalizeType: true,
  });
  if (!adminIdentity || !adminIdentity.verification?.valid) {
    respondUnauthorized(req, res);
    return;
  }

  if (!String(adminIdentity.id || "").trim()) {
    res.status(401).json(
      buildErrorEnvelopePayload(req, 401, "无效凭证，缺少身份标识"),
    );
    return;
  }

  if (!isAllowedAdminType(adminIdentity.type)) {
    res.status(403).json(buildErrorEnvelopePayload(req, 403, "权限不足"));
    return;
  }

  const bootstrapPending = Boolean(
    adminIdentity.payload?.bootstrapPending ||
      adminIdentity.payload?.mustChangeBootstrap,
  );
  if (bootstrapPending) {
    res.status(403).json(
      buildErrorEnvelopePayload(req, 403, "请先完成首次管理员初始化", {
        code: "ADMIN_BOOTSTRAP_REQUIRED",
      }),
    );
    return;
  }

  req.adminAuth = adminIdentity;
  req.authIdentity = adminIdentity;
  next();
}

module.exports = {
  requireUploadAuth,
};
