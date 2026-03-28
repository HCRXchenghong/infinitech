import { REQUEST_ID_HEADER, resolveRequestId } from './requestId.js';

const DEFAULT_GO_API_URL = 'http://127.0.0.1:1029';
const REQUEST_TIMEOUT_MS = Number(process.env.SOCKET_AUTH_TIMEOUT_MS || 8000);
const SOURCE_SERVICE_HEADER = 'X-Source-Service';

function stripBearerToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^bearer\s+/i.test(raw)) {
    return raw.replace(/^bearer\s+/i, '').trim();
  }
  return raw;
}

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  if (!normalized) return '';

  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function buildBackendUrl(pathname) {
  const baseUrl = String(process.env.GO_API_URL || DEFAULT_GO_API_URL).replace(/\/+$/, '');
  const normalizedPath = String(pathname || '').startsWith('/') ? pathname : `/${pathname}`;
  return `${baseUrl}${normalizedPath}`;
}

export async function requestBackend(pathname, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  const requestIdHeader = headers[REQUEST_ID_HEADER] || headers[REQUEST_ID_HEADER.toLowerCase()];
  const requestId = resolveRequestId(
    options.requestId || requestIdHeader,
    'sc-backend'
  );
  headers[REQUEST_ID_HEADER] = requestId;
  if (!headers[SOURCE_SERVICE_HEADER] && !headers[SOURCE_SERVICE_HEADER.toLowerCase()]) {
    headers[SOURCE_SERVICE_HEADER] = 'socket-server';
  }
  const requestInit = {
    method: options.method || 'GET',
    headers
  };

  if (options.body !== undefined) {
    requestInit.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (!requestInit.headers['Content-Type'] && !requestInit.headers['content-type']) {
      requestInit.headers['Content-Type'] = 'application/json';
    }
  }

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    requestInit.signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }

  let response;
  try {
    response = await fetch(buildBackendUrl(pathname), requestInit);
  } catch (err) {
    throw createHttpError(503, `Socket auth backend unavailable: ${err.message}`, {
      cause: err,
      pathname,
      requestId
    });
  }

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (_err) {
      data = { raw: rawText };
    }
  }

  return {
    response,
    data,
    requestId
  };
}

export async function expectBackendOk(pathname, options = {}) {
  const { response, data, requestId } = await requestBackend(pathname, options);
  if (!response.ok) {
    throw createHttpError(
      response.status,
      data?.error || data?.message || `Socket auth check failed: ${response.status}`,
      { pathname, data, requestId }
    );
  }
  return data;
}

function normalizeUserId(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function createHttpError(statusCode, message, details = {}) {
  const err = new Error(String(message || 'Socket auth error'));
  err.statusCode = Number(statusCode || 500);
  err.details = details;
  return err;
}

export function normalizeAuthHeader(value) {
  const token = stripBearerToken(value);
  if (!token) return '';
  return `Bearer ${token}`;
}

export function parseTokenPayload(token) {
  const raw = stripBearerToken(token);
  if (!raw) return null;

  const parts = raw.split('.');
  const payloadPart = parts.length === 2 ? parts[0] : (parts.length >= 3 ? parts[1] : '');
  if (!payloadPart) return null;

  try {
    const payloadText = decodeBase64Url(payloadPart);
    return JSON.parse(payloadText);
  } catch (_err) {
    return null;
  }
}

export async function validateSocketIdentity({ role, claimedUserId, authHeader, requestId }) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedAuthHeader = normalizeAuthHeader(authHeader);
  const parsedPayload = parseTokenPayload(normalizedAuthHeader);

  if (!normalizedAuthHeader) {
    throw createHttpError(401, 'Missing business authorization for socket token');
  }

  switch (normalizedRole) {
    case 'admin': {
      await expectBackendOk('/api/stats', {
        headers: { Authorization: normalizedAuthHeader },
        requestId
      });

      return {
        role: 'admin',
        socketUserId: normalizeUserId(claimedUserId || parsedPayload?.adminId || parsedPayload?.id || 'admin'),
        authToken: normalizedAuthHeader,
        payload: parsedPayload,
        verifiedBy: '/api/stats'
      };
    }

    case 'user': {
      const verifyData = await expectBackendOk('/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: normalizedAuthHeader },
        requestId
      });

      const resolvedUserId = normalizeUserId(
        verifyData?.userId || verifyData?.id || parsedPayload?.userId || claimedUserId
      );
      if (!resolvedUserId) {
        throw createHttpError(401, 'Unable to resolve user identity for socket auth');
      }

      return {
        role: 'user',
        socketUserId: resolvedUserId,
        authToken: normalizedAuthHeader,
        payload: parsedPayload || verifyData,
        verifiedBy: '/api/auth/verify'
      };
    }

    case 'rider': {
      const riderId = normalizeUserId(claimedUserId || parsedPayload?.userId);
      if (!riderId) {
        throw createHttpError(400, 'Missing rider identity for socket auth');
      }

      await expectBackendOk(`/api/riders/${encodeURIComponent(riderId)}/profile`, {
        headers: { Authorization: normalizedAuthHeader },
        requestId
      });

      return {
        role: 'rider',
        socketUserId: riderId,
        authToken: normalizedAuthHeader,
        payload: parsedPayload,
        verifiedBy: `/api/riders/${riderId}/profile`
      };
    }

    case 'merchant': {
      const merchantId = normalizeUserId(claimedUserId || parsedPayload?.userId);
      if (!merchantId) {
        throw createHttpError(400, 'Missing merchant identity for socket auth');
      }

      await expectBackendOk(`/api/merchants/${encodeURIComponent(merchantId)}/shops`, {
        headers: { Authorization: normalizedAuthHeader },
        requestId
      });

      return {
        role: 'merchant',
        socketUserId: merchantId,
        authToken: normalizedAuthHeader,
        payload: parsedPayload,
        verifiedBy: `/api/merchants/${merchantId}/shops`
      };
    }

    default:
      throw createHttpError(400, `Unsupported socket role: ${normalizedRole || 'unknown'}`);
  }
}

export async function fetchOrderDetailWithAuth(orderId, authToken, requestId) {
  const normalizedOrderId = normalizeUserId(orderId);
  const normalizedAuthHeader = normalizeAuthHeader(authToken);

  if (!normalizedOrderId) {
    throw createHttpError(400, 'Missing order id for socket room auth');
  }
  if (!normalizedAuthHeader) {
    throw createHttpError(401, 'Missing business authorization for order room auth');
  }

  return expectBackendOk(`/api/orders/${encodeURIComponent(normalizedOrderId)}`, {
    headers: { Authorization: normalizedAuthHeader },
    requestId
  });
}
