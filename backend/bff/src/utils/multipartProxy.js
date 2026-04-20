const fs = require("fs");
const FormData = require("form-data");
const {
  buildRejectedProxyErrorPayload,
  buildResolvedProxyPayload,
  requestGoRaw,
} = require("./goProxy");
const { buildErrorEnvelopePayload } = require("./apiEnvelope");
const { logger } = require("./logger");

const PROTECTED_LEGACY_UPLOAD_PREFIXES = [
  "/uploads/certs/",
  "/uploads/merchant_document/",
  "/uploads/medical_document/",
  "/uploads/onboarding-invite/",
];

function appendForwardedPort(host, port, protocol) {
  const normalizedHost = String(host || "").trim();
  const normalizedPort = String(port || "").trim();
  if (!normalizedHost || !normalizedPort) {
    return normalizedHost;
  }

  const defaultPort = protocol === "https" ? "443" : "80";
  if (normalizedPort === defaultPort) {
    return normalizedHost;
  }

  if (normalizedHost.startsWith("[")) {
    return normalizedHost.includes("]:")
      ? normalizedHost
      : `${normalizedHost}:${normalizedPort}`;
  }

  const colonCount = (normalizedHost.match(/:/g) || []).length;
  if (colonCount === 0) {
    return `${normalizedHost}:${normalizedPort}`;
  }

  return normalizedHost;
}

function getRequestOrigin(req) {
  const headerOrigin = String(req.headers.origin || "").trim();
  if (/^https?:\/\//i.test(headerOrigin)) {
    return headerOrigin;
  }

  const referer = String(req.headers.referer || "").trim();
  if (/^https?:\/\//i.test(referer)) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.origin;
    } catch (_error) {
      // ignore invalid referer and continue fallback
    }
  }

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const forwardedPort = String(req.headers["x-forwarded-port"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = appendForwardedPort(
    forwardedHost || req.get("host"),
    forwardedPort,
    protocol,
  );
  return `${protocol}://${host}`;
}

function extractUploadPath(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  const raw = String(url).trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("/uploads/")) {
    return raw;
  }

  const uploadPathMatch = raw.match(/\/uploads\/.+$/);
  if (uploadPathMatch) {
    return uploadPathMatch[0];
  }
  return "";
}

function isProtectedLegacyUploadUrl(url) {
  const uploadPath = extractUploadPath(url);
  if (!uploadPath) {
    return false;
  }
  return PROTECTED_LEGACY_UPLOAD_PREFIXES.some((prefix) =>
    uploadPath.startsWith(prefix),
  );
}

function normalizeUploadUrl(url, req, options = {}) {
  if (!url || typeof url !== "string") {
    return url;
  }

  const accessPolicy = String(options.accessPolicy || "").trim().toLowerCase();
  if (accessPolicy === "private" || isProtectedLegacyUploadUrl(url)) {
    return url;
  }

  const uploadPath = extractUploadPath(url);
  if (uploadPath) {
    return `${getRequestOrigin(req)}${uploadPath}`;
  }

  return url;
}

function normalizeUploadPayload(payload, req, context = {}) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeUploadPayload(item, req, context));
  }

  if (!payload || typeof payload !== "object") {
    if (typeof payload === "string") {
      return normalizeUploadUrl(payload, req, context);
    }
    return payload;
  }

  const accessPolicy =
    typeof payload.access_policy === "string" && payload.access_policy.trim()
      ? payload.access_policy
      : context.accessPolicy;

  const next = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      next[key] = normalizeUploadUrl(value, req, { accessPolicy });
      continue;
    }
    if (Array.isArray(value) || (value && typeof value === "object")) {
      next[key] = normalizeUploadPayload(value, req, { accessPolicy });
      continue;
    }
    next[key] = value;
  }
  return next;
}

function appendBodyFields(form, body, fieldNames = []) {
  for (const fieldName of fieldNames) {
    const value = body?.[fieldName];
    if (value === undefined || value === null) {
      continue;
    }
    form.append(fieldName, String(value));
  }
}

function buildMultipartProxyResponseOptions() {
  return {
    transformPayload(payload, context) {
      return normalizeUploadPayload(payload, context.req);
    },
  };
}

async function proxyMultipartUpload(req, res, next, options = {}) {
  if (!req.file) {
    res
      .status(400)
      .json(buildErrorEnvelopePayload(req, 400, options.missingFileMessage || "没有上传文件"));
    return;
  }

  try {
    const defaultErrorMessage = options.defaultErrorMessage || "上传请求失败";
    const form = new FormData();
    form.append(
      options.targetFieldName || "file",
      fs.createReadStream(req.file.path),
      req.file.originalname,
    );
    appendBodyFields(form, req.body, options.forwardFields);

    const response = await requestGoRaw(req, {
      method: "post",
      path: options.path,
      data: form,
      headers: form.getHeaders(),
      timeout: Number(options.timeout || 20000),
      validateStatus: options.validateStatus || ((status) => status < 500),
      preferExtraHeaders: true,
    });

    const payload = options.normalizePayload === false
      ? response.data
      : buildResolvedProxyPayload(
        req,
        response,
        defaultErrorMessage,
        buildMultipartProxyResponseOptions(),
      );

    res.status(response.status).json(payload);
  } catch (error) {
    if (error.response) {
      res
        .status(error.response.status)
        .json(buildRejectedProxyErrorPayload(
          req,
          error,
          options.defaultErrorMessage || "上传请求失败",
          buildMultipartProxyResponseOptions(),
        ));
      return;
    }
    logger.error("Multipart upload proxy error:", {
      path: options.path,
      message: error.message,
    });
    next(error);
  } finally {
    fs.unlink(req.file.path, () => {});
  }
}

module.exports = {
  getRequestOrigin,
  normalizeUploadUrl,
  normalizeUploadPayload,
  proxyMultipartUpload,
};
