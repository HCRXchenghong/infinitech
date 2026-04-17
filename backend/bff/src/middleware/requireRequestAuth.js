const { buildErrorEnvelopePayload } = require("../utils/apiEnvelope");
const { extractVerifiedAuthIdentity } = require("../utils/authIdentity");

function respondUnauthorized(req, res) {
  res.status(401).json(buildErrorEnvelopePayload(req, 401, "未授权，请先登录"));
}

function requireRequestAuth(req, res, next) {
  const identity = extractVerifiedAuthIdentity(req, { normalizeType: true });
  if (!identity || !identity.verification?.valid) {
    respondUnauthorized(req, res);
    return;
  }

  if (String(identity.tokenKind || "").trim().toLowerCase() === "refresh") {
    respondUnauthorized(req, res);
    return;
  }

  if (!String(identity.id || "").trim() || !String(identity.principalType || "").trim()) {
    respondUnauthorized(req, res);
    return;
  }

  req.authIdentity = identity;
  next();
}

module.exports = {
  requireRequestAuth,
};
