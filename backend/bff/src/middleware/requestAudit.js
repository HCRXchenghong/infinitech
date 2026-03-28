const {
  nextLogTsid,
  extractClientIp,
  inferActorTypeByPath,
  inferActionScene,
  extractSubject,
} = require("../utils/requestMeta");

function resolveLogMethod(logger, statusCode, slowRequest) {
  if (statusCode >= 500 && typeof logger.error === "function") {
    return "error";
  }
  if ((statusCode >= 400 || slowRequest) && typeof logger.warn === "function") {
    return "warn";
  }
  return "info";
}

function createRequestAuditMiddleware({ logger, parseOperatorFromAuthHeader, slowRequestWarnMs = 1500 }) {
  return function requestAudit(req, res, next) {
    const startAt = Date.now();
    const logTsid = nextLogTsid();
    const operator = parseOperatorFromAuthHeader(req.headers.authorization);
    const clientIp = extractClientIp(req);
    const actorType = inferActorTypeByPath(req.path);
    const actionScene = inferActionScene(req.method, req.path);
    const actionSubject = extractSubject(req, actionScene);
    const requestId = String(req.requestId || req.get?.("X-Request-ID") || "").trim();

    req.operator = operator;
    req.logTsid = logTsid;

    res.on("finish", () => {
      const latencyMs = Date.now() - startAt;
      const slowRequest = latencyMs >= slowRequestWarnMs;
      const logMethod = resolveLogMethod(logger, res.statusCode, slowRequest);
      logger[logMethod](`${req.method} ${req.path}`, {
        requestId,
        logTsid,
        ip: clientIp,
        actorType,
        actionScene,
        actionSubject,
        status: res.statusCode,
        latencyMs,
        slowRequest,
        slowThresholdMs: slowRequestWarnMs,
        entityUid: "",
        entityTsid: "",
        legacyHit: false,
        idVersion: "unified_v1",
        operatorId: operator.operatorId,
        operatorName: operator.operatorName
      });
    });

    next();
  };
}

module.exports = {
  createRequestAuditMiddleware,
};
