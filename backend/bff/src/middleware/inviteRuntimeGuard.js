const {
  INVITE_RUNTIME_PORT,
  extractSourcePort,
  normalizeRequestPath,
  isInviteRuntimeAllowedApiRequest,
} = require("../utils/requestMeta");

function createInviteRuntimeGuard({ logger }) {
  return function inviteRuntimeGuard(req, res, next) {
    const sourcePort = extractSourcePort(req);
    if (sourcePort !== INVITE_RUNTIME_PORT) {
      next();
      return;
    }

    if (isInviteRuntimeAllowedApiRequest(req.method, req.path)) {
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
      error: "1788 仅开放邀请页相关接口"
    });
  };
}

module.exports = {
  createInviteRuntimeGuard,
};
