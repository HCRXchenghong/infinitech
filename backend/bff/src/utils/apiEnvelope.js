function trimText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeErrorCode(status, explicitCode = '') {
  const code = trimText(explicitCode);
  if (code) {
    return code;
  }

  switch (Number(status)) {
    case 400:
      return 'INVALID_ARGUMENT';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 410:
      return 'GONE';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 502:
    case 503:
      return 'UPSTREAM_UNAVAILABLE';
    case 504:
      return 'UPSTREAM_TIMEOUT';
    default:
      return Number(status) >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
  }
}

function resolveRequestId(req, upstreamPayload = {}) {
  return trimText(
    upstreamPayload?.request_id ||
      upstreamPayload?.requestId ||
      req?.headers?.['x-request-id'],
  );
}

function normalizeDataPayload(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  return {};
}

function buildErrorEnvelopePayload(req, status, message, options = {}) {
  const normalizedMessage = trimText(message) || 'Request failed';
  const payload = {
    request_id: resolveRequestId(req, options.upstreamPayload),
    code: normalizeErrorCode(status, options.code),
    message: normalizedMessage,
    data: normalizeDataPayload(options.data),
    success: false,
    error: normalizedMessage,
  };

  const legacy = options.legacy;
  if (legacy && typeof legacy === 'object') {
    for (const [key, value] of Object.entries(legacy)) {
      if (payload[key] === undefined) {
        payload[key] = value;
      }
    }
  }

  return payload;
}

module.exports = {
  buildErrorEnvelopePayload,
  normalizeErrorCode,
};
