const axios = require("axios");
const { logger } = require("../../utils/logger");
const { buildNormalizedErrorPayload } = require("../../utils/goProxy");
const { buildForwardHeaders } = require("../../utils/forwardAuth");
const { BACKEND_URL } = require("./constants");

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}`;
}

function normalizePublicAssetUrl(req, value) {
  if (!value) {
    return value;
  }
  const raw = String(value);
  if (raw.startsWith("/")) {
    return `${getRequestOrigin(req)}${raw}`;
  }
  const uploadPathMatch = raw.match(/\/uploads\/.+$/);
  if (uploadPathMatch) {
    return `${getRequestOrigin(req)}${uploadPathMatch[0]}`;
  }
  return value;
}

function resolveFallbackProxyErrorMessage(fallbackPayload, error) {
  if (fallbackPayload && typeof fallbackPayload === "object") {
    return String(fallbackPayload.error || fallbackPayload.message || "").trim() || error.message;
  }
  return error.message || "请求后端服务失败，请稍后重试";
}

function normalizeSettingsProxyPayload(req, response, defaultErrorMessage = "请求后端服务失败，请稍后重试") {
  if (Number(response?.status || 200) < 400) {
    return response?.data;
  }

  return buildNormalizedErrorPayload(
    req,
    {
      message:
        response?.data?.error ||
        response?.data?.message ||
        defaultErrorMessage,
      response,
    },
    response.status,
    defaultErrorMessage,
  );
}

function handleProxyError(req, res, error, context, fallbackPayload = null) {
  logger.error(context, {
    code: error.code,
    message: error.message,
    status: error.response?.status || null,
  });

  if (error.response) {
    return res.status(error.response.status).json(
      buildNormalizedErrorPayload(
        req,
        error,
        error.response.status,
        resolveFallbackProxyErrorMessage(fallbackPayload, error),
      ),
    );
  }

  return res.status(502).json(
    buildNormalizedErrorPayload(
      req,
      error,
      502,
      resolveFallbackProxyErrorMessage(fallbackPayload, error),
    ),
  );
}

function buildSettingsHeaders(req, options = {}) {
  const baseHeaders = buildForwardHeaders(req, {
    includeClientIp: Boolean(options.includeClientIp)
  });
  return {
    ...baseHeaders,
    ...(options.extraHeaders || {})
  };
}

async function requestSettingsRaw(req, method, path, options = {}) {
  const requestConfig = {
    method,
    url: `${BACKEND_URL}${path}`,
    params: options.params,
    data: options.body,
    headers: buildSettingsHeaders(req, {
      includeClientIp: options.includeClientIp,
      extraHeaders: options.headers
    }),
    validateStatus: options.validateStatus || ((status) => status < 600)
  };

  if (Number.isFinite(options.timeout) && options.timeout > 0) {
    requestConfig.timeout = options.timeout;
  }

  return axios(requestConfig);
}

async function proxySettingsRequest(req, res, method, path, options = {}) {
  try {
    const response = await requestSettingsRaw(req, method, path, {
      params: options.params,
      body: options.body,
      includeClientIp: options.includeClientIp,
      validateStatus(status) {
        return status < 600;
      }
    });
    return res.status(response.status).json(
      normalizeSettingsProxyPayload(
        req,
        response,
        options.defaultErrorMessage || "请求后端服务失败，请稍后重试",
      ),
    );
  } catch (error) {
    return handleProxyError(req, res, error, "proxySettingsRequest");
  }
}

module.exports = {
  normalizePublicAssetUrl,
  normalizeSettingsProxyPayload,
  handleProxyError,
  requestSettingsRaw,
  proxySettingsRequest,
};
