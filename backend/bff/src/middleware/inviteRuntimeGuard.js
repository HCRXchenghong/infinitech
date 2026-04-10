const {
  extractSourcePort,
  getPublicRuntimeGuardMessage,
  isPublicRuntimeAllowedApiRequest,
  isPublicRuntimePort,
  normalizeRequestPath,
} = require("../utils/requestMeta");

function createInviteRuntimeGuard({ logger }) {
  return function inviteRuntimeGuard(req, res, next) {
    const sourcePort = extractSourcePort(req);
    if (!isPublicRuntimePort(sourcePort)) {
      next();
      return;
    }

    if (isPublicRuntimeAllowedApiRequest(sourcePort, req.method, req.path)) {
      next();
      return;
    }

    logger.warn("Blocked invite runtime API access", {
      sourcePort,
      method: req.method,
      path: normalizeRequestPath(req.path),
      origin: String(req.headers.origin || ""),
      referer: String(req.headers.referer || "")
    });
    res.status(403).json({
      success: false,
      error: getPublicRuntimeGuardMessage(sourcePort)
    });
  };
}

module.exports = {
  createInviteRuntimeGuard,
};
