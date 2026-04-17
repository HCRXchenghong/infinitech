"use strict";

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeErrorCode(status, explicitCode = "") {
  const code = trimText(explicitCode);
  if (code) {
    return code;
  }

  switch (Number(status)) {
    case 400:
      return "INVALID_ARGUMENT";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 410:
      return "GONE";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 429:
      return "TOO_MANY_REQUESTS";
    case 502:
    case 503:
      return "UPSTREAM_UNAVAILABLE";
    case 504:
      return "UPSTREAM_TIMEOUT";
    default:
      return Number(status) >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED";
  }
}

function resolveEnvelopeRequestIdSource(source, upstreamPayload = {}) {
  if (!source || typeof source !== "object") {
    return trimText(upstreamPayload?.request_id || upstreamPayload?.requestId);
  }

  return trimText(
    upstreamPayload?.request_id ||
      upstreamPayload?.requestId ||
      source?.requestId ||
      source?.headers?.["x-request-id"] ||
      source?.headers?.["X-Request-ID"],
  );
}

function normalizeDataPayload(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  return {};
}

function normalizeSuccessData(data) {
  if (data === undefined || data === null) {
    return {};
  }
  return data;
}

function buildSuccessEnvelopePayload(source, message, data, options = {}) {
  const normalizedMessage = trimText(message) || "ok";
  const payload = {
    request_id: resolveEnvelopeRequestIdSource(source, options.upstreamPayload),
    code: trimText(options.code) || "OK",
    message: normalizedMessage,
    data: normalizeSuccessData(data),
    success: true,
  };

  const legacy = options.legacy;
  if (legacy && typeof legacy === "object") {
    for (const [key, value] of Object.entries(legacy)) {
      if (payload[key] === undefined) {
        payload[key] = value;
      }
    }
  }

  return payload;
}

function buildErrorEnvelopePayload(source, status, message, options = {}) {
  const normalizedMessage = trimText(message) || "Request failed";
  const payload = {
    request_id: resolveEnvelopeRequestIdSource(source, options.upstreamPayload),
    code: normalizeErrorCode(status, options.code),
    message: normalizedMessage,
    data: normalizeDataPayload(options.data),
    success: false,
    error: normalizedMessage,
  };

  const legacy = options.legacy;
  if (legacy && typeof legacy === "object") {
    for (const [key, value] of Object.entries(legacy)) {
      if (payload[key] === undefined) {
        payload[key] = value;
      }
    }
  }

  return payload;
}

function extractEnvelopeData(payload) {
  if (
    payload &&
    typeof payload === "object" &&
    payload.data !== undefined
  ) {
    return payload.data;
  }
  return payload;
}

function extractEnvelopeRequestId(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  return trimText(payload.request_id || payload.requestId);
}

function extractEnvelopeCode(payload, fallback = "OK") {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return trimText(payload.code) || fallback;
}

function extractEnvelopeMessage(payload, fallback = "") {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return trimText(payload.message || payload.error) || fallback;
}

function extractPaginatedItems(payload, options = {}) {
  const data = extractEnvelopeData(payload);
  const listKeys = Array.isArray(options.listKeys) && options.listKeys.length > 0
    ? options.listKeys
    : ["items", "records", "list"];
  const pagination = data && typeof data === "object" && data.pagination && typeof data.pagination === "object"
    ? data.pagination
    : {};
  const normalized = {
    items: [],
    total: 0,
    page: 0,
    limit: 0,
  };

  if (Array.isArray(data)) {
    normalized.items = data;
    normalized.total = data.length;
    return normalized;
  }

  if (!data || typeof data !== "object") {
    return normalized;
  }

  for (const key of listKeys) {
    if (Array.isArray(data[key])) {
      normalized.items = data[key];
      break;
    }
  }

  normalized.total = Number(
    data.total ?? pagination.total ?? payload?.total ?? normalized.items.length ?? 0,
  );
  normalized.page = Number(data.page ?? pagination.page ?? payload?.page ?? 0);
  normalized.limit = Number(
    data.limit ??
      data.pageSize ??
      data.page_size ??
      pagination.limit ??
      pagination.pageSize ??
      pagination.page_size ??
      payload?.limit ??
      payload?.pageSize ??
      payload?.page_size ??
      0,
  );
  return normalized;
}

function resolveCredentialSource(payload = {}) {
  if (payload?.temporaryCredential && typeof payload.temporaryCredential === "object") {
    return payload.temporaryCredential;
  }
  if (payload?.data?.temporaryCredential && typeof payload.data.temporaryCredential === "object") {
    return payload.data.temporaryCredential;
  }
  return null;
}

function extractTemporaryCredential(payload = {}) {
  const source = resolveCredentialSource(payload);
  const temporaryPassword = trimText(source?.temporaryPassword);

  if (!temporaryPassword) {
    return null;
  }

  return {
    temporaryPassword,
    deliveryMode: trimText(source?.deliveryMode || "operator_receipt") || "operator_receipt",
    subjectHint: trimText(source?.subjectHint),
  };
}

function extractUploadAsset(payload) {
  const data = extractEnvelopeData(payload);
  if (!data || typeof data !== "object") {
    return null;
  }
  const assetId = String(data.asset_id || data.assetId || data.assetRef || "").trim();
  const url = String(data.asset_url || data.assetUrl || data.previewUrl || data.url || "").trim();
  if (!url && !assetId) {
    return null;
  }
  return {
    ...data,
    asset_id: assetId,
    url,
    filename: String(data.filename || "").trim(),
  };
}

function extractSMSResult(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const data = extractEnvelopeData(payload);
  const source = data && typeof data === "object" ? data : payload;
  const successValue =
    source.success !== undefined ? source.success : payload.success;
  const success =
    successValue === undefined ? undefined : Boolean(successValue);
  const message = trimText(
    source.message || payload.message || payload.error,
  );
  const explicitError = trimText(payload.error || source.error);
  const smsCode = trimText(
    source.code ||
      source.sms_code ||
      source.smsCode ||
      source.verification_code ||
      source.verificationCode ||
      payload.sms_code ||
      payload.smsCode ||
      payload.verification_code ||
      payload.verificationCode,
  );

  return {
    ...payload,
    success,
    message,
    error: explicitError || (success === false ? message : ""),
    needCaptcha: Boolean(
      source.needCaptcha ??
        source.need_captcha ??
        payload.needCaptcha ??
        payload.need_captcha,
    ),
    sessionId: trimText(
      source.sessionId ||
        source.session_id ||
        payload.sessionId ||
        payload.session_id,
    ),
    code: smsCode,
    smsCode,
  };
}

function extractErrorMessage(payload, fallback = "请求失败") {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === "string") {
    return payload.trim() || fallback;
  }

  if (payload.error && typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.message && typeof payload.message === "string") {
    return payload.message;
  }

  if (payload.response?.data) {
    return extractErrorMessage(payload.response.data, fallback);
  }

  return fallback;
}

module.exports = {
  normalizeErrorCode,
  buildSuccessEnvelopePayload,
  buildErrorEnvelopePayload,
  extractEnvelopeData,
  extractEnvelopeRequestId,
  extractEnvelopeCode,
  extractEnvelopeMessage,
  extractPaginatedItems,
  extractTemporaryCredential,
  extractUploadAsset,
  extractSMSResult,
  extractErrorMessage,
};
