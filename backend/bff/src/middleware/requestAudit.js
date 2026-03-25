const {
  nextLogTsid,
  extractClientIp,
  inferActorTypeByPath,
  inferActionScene,
  extractSubject,
} = require("../utils/requestMeta");

function createRequestAuditMiddleware({ logger, parseOperatorFromAuthHeader }) {
  return function requestAudit(req, res, next) {
    const startAt = Date.now();
    const logTsid = nextLogTsid();
    const operator = parseOperatorFromAuthHeader(req.headers.authorization);
    const clientIp = extractClientIp(req);
    const actorType = inferActorTypeByPath(req.path);
    const actionScene = inferActionScene(req.method, req.path);
    const actionSubject = extractSubject(req, actionScene);

    req.operator = operator;
    req.logTsid = logTsid;

    res.on("finish", () => {
      logger.info(`${req.method} ${req.path}`, {
        logTsid,
        ip: clientIp,
        actorType,
        actionScene,
        actionSubject,
        status: res.statusCode,
        latencyMs: Date.now() - startAt,
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
