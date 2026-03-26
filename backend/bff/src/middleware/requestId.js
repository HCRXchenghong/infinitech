const { randomUUID } = require("crypto");

const REQUEST_ID_HEADER = "X-Request-ID";

function createRequestIdMiddleware() {
  return function requestId(req, res, next) {
    const incoming = String(req.get(REQUEST_ID_HEADER) || "").trim();
    const requestId = incoming || randomUUID();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  };
}

module.exports = {
  REQUEST_ID_HEADER,
  createRequestIdMiddleware,
};
