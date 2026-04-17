const { extractVerifiedAuthIdentity } = require("../utils/authIdentity");

function requireRequestAuth(req, res, next) {
  const identity = extractVerifiedAuthIdentity(req, { normalizeType: true });
  if (!identity || !identity.verification?.valid) {
    res.status(401).json({
      success: false,
      error: "未授权，请先登录",
    });
    return;
  }

  if (String(identity.tokenKind || "").trim().toLowerCase() === "refresh") {
    res.status(401).json({
      success: false,
      error: "未授权，请先登录",
    });
    return;
  }

  if (!String(identity.id || "").trim() || !String(identity.principalType || "").trim()) {
    res.status(401).json({
      success: false,
      error: "未授权，请先登录",
    });
    return;
  }

  req.authIdentity = identity;
  next();
}

module.exports = {
  requireRequestAuth,
};
