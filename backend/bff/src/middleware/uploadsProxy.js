const axios = require("axios");
const { buildErrorEnvelopePayload } = require("../utils/apiEnvelope");
const { sendStreamProxyResponse } = require("../utils/goProxy");

function joinUrl(base, path) {
  const normalizedBase = String(base || "").replace(/\/+$/, "");
  if (!path.startsWith("/")) {
    return `${normalizedBase}/${path}`;
  }
  return `${normalizedBase}${path}`;
}

function createUploadsProxy({ goApiUrl, logger }) {
  return async function uploadsProxy(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).json(buildErrorEnvelopePayload(req, 405, "Method not allowed"));
      return;
    }

    const targetUrl = joinUrl(goApiUrl, req.originalUrl);
    try {
      const upstream = await axios({
        method: req.method,
        url: targetUrl,
        responseType: "stream",
        timeout: 15000,
        validateStatus: () => true,
        headers: {
          accept: req.headers.accept,
          "if-none-match": req.headers["if-none-match"],
          "if-modified-since": req.headers["if-modified-since"],
          range: req.headers.range
        }
      });
      return sendStreamProxyResponse(req, res, upstream);
    } catch (error) {
      logger.error("Proxy uploads error", { targetUrl, message: error.message });
      next(error);
    }
  };
}

module.exports = {
  createUploadsProxy,
};
