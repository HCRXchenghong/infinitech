const axios = require('axios');
const config = require('../config');
const { buildErrorEnvelopePayload } = require('./apiEnvelope');
const { withForwardAuth } = require('./forwardAuth');
const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'pragma', 'expires', 'x-content-type-options'];

function goUrl(path) {
  return `${config.goApiUrl}/api${path}`;
}

function shouldUseFallback(options, status) {
  if (options.fallbackPayload === undefined) {
    return false;
  }
  if (!Array.isArray(options.fallbackStatuses) || options.fallbackStatuses.length === 0) {
    return false;
  }
  return options.fallbackStatuses.includes(Number(status));
}

function sendFallback(res, options) {
  return res.status(Number(options.fallbackStatus || 200)).json(options.fallbackPayload);
}

function buildNormalizedErrorPayload(req, error, status, defaultErrorMessage) {
  const responseData = error.response?.data;

  if (responseData && typeof responseData === 'object') {
    if (
      responseData.request_id !== undefined &&
      responseData.code !== undefined &&
      responseData.message !== undefined &&
      responseData.data !== undefined
    ) {
      return responseData;
    }

    return buildErrorEnvelopePayload(
      req,
      status,
      responseData.error || responseData.message || defaultErrorMessage || error.message,
      {
        code: responseData.code,
        data: responseData.data,
        upstreamPayload: responseData,
        legacy: responseData,
      },
    );
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    return buildErrorEnvelopePayload(req, status, responseData, {
      upstreamPayload: error.response?.data,
    });
  }

  return buildErrorEnvelopePayload(
    req,
    status,
    error.message || defaultErrorMessage || 'Request failed',
  );
}

function sendNormalizedError(req, res, error, options, statusOverride) {
  const status = Number(statusOverride || options.normalizeErrorStatus || 500);
  return res.status(status).json(buildNormalizedErrorPayload(req, error, status, options.defaultErrorMessage));
}

function applyResponseHeaders(res, responseHeaders = {}, explicitHeaders = {}) {
  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const headerValue = responseHeaders?.[headerName];
    if (headerValue) {
      res.setHeader(headerName, headerValue);
    }
  }

  for (const [headerName, headerValue] of Object.entries(explicitHeaders || {})) {
    if (headerValue !== undefined && headerValue !== null && headerValue !== '') {
      res.setHeader(headerName, headerValue);
    }
  }
}

function pickDeleteBody(options, req) {
  if (options.data !== undefined) {
    return options.data;
  }
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  return Object.keys(body).length > 0 ? body : undefined;
}

function buildGoRequestOptions(req, options = {}) {
  const method = (options.method || 'get').toLowerCase();
  const requestOptions = {
    method,
    url: goUrl(options.path),
    timeout: Number(options.timeout || 8000),
    validateStatus: options.validateStatus || ((status) => status < 500),
  };

  if (options.params !== undefined) {
    requestOptions.params = options.params;
  }
  if (options.data !== undefined) {
    requestOptions.data = options.data;
  }
  if (options.responseType !== undefined) {
    requestOptions.responseType = options.responseType;
  }

  const withAuth = withForwardAuth(req, {
    headers: options.headers || {}
  }, {
    includeClientIp: true,
    preferExtraHeaders: Boolean(options.preferExtraHeaders)
  });

  if (withAuth.headers && Object.keys(withAuth.headers).length > 0) {
    requestOptions.headers = withAuth.headers;
  }

  return requestOptions;
}

async function requestGoRaw(req, options = {}) {
  const requestOptions = buildGoRequestOptions(req, options);
  return axios(requestOptions);
}

async function proxyToGo(req, res, next, options) {
  try {
    const response = await requestGoRaw(req, options);

    if (shouldUseFallback(options, response.status)) {
      return sendFallback(res, options);
    }

    applyResponseHeaders(res, response.headers, options.responseHeaders);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' && options.fallbackOnConnectionRefused && options.fallbackPayload !== undefined) {
      return sendFallback(res, options);
    }

    if (error.response) {
      if (shouldUseFallback(options, error.response.status)) {
        return sendFallback(res, options);
      }
      if (options.normalizeErrorResponse) {
        return sendNormalizedError(req, res, error, options, error.response.status);
      }
      applyResponseHeaders(res, error.response.headers, options.responseHeaders);
      return res.status(error.response.status).json(error.response.data);
    }

    if (options.normalizeErrorResponse) {
      return sendNormalizedError(req, res, error, options);
    }

    return next(error);
  }
}

async function proxyGet(req, res, next, path, options = {}) {
  return proxyToGo(req, res, next, {
    ...options,
    method: 'get',
    path,
    params: options.params !== undefined ? options.params : (req.query || {})
  });
}

async function proxyPost(req, res, next, path, options = {}) {
  return proxyToGo(req, res, next, {
    ...options,
    method: 'post',
    path,
    data: options.data !== undefined ? options.data : (req.body || {})
  });
}

async function proxyPut(req, res, next, path, options = {}) {
  return proxyToGo(req, res, next, {
    ...options,
    method: 'put',
    path,
    data: options.data !== undefined ? options.data : (req.body || {})
  });
}

async function proxyDelete(req, res, next, path, options = {}) {
  return proxyToGo(req, res, next, {
    ...options,
    method: 'delete',
    path,
    params: options.params !== undefined ? options.params : (req.query || {}),
    data: pickDeleteBody(options, req)
  });
}

module.exports = {
  goUrl,
  requestGoRaw,
  proxyToGo,
  proxyGet,
  proxyPost,
  proxyPut,
  proxyDelete
};
