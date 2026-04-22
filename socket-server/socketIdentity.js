import { REQUEST_ID_HEADER, resolveRequestId } from './requestId.js';
import {
  normalizeBearerToken,
  parseUnifiedTokenPayload,
} from '../packages/contracts/src/identity.js';
import { extractAuthVerifyResult } from '../packages/contracts/src/http.js';
import {
  buildRuntimePrincipalIdentity,
  resolveSocketSubjectId,
} from '../packages/domain-core/src/identity.js';
import { resolveSocketRuntimeConfig } from './runtimeConfig.js';

const runtimeConfig = resolveSocketRuntimeConfig(process.env);
const REQUEST_TIMEOUT_MS = runtimeConfig.authTimeoutMs;
const SOURCE_SERVICE_HEADER = 'X-Source-Service';

function stripBearerToken(value) {
  return normalizeBearerToken(value);
}

function buildBackendUrl(pathname) {
  const baseUrl = String(runtimeConfig.goApiUrl || '').replace(/\/+$/, '');
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
  return parseUnifiedTokenPayload(token);
}

export async function validateSocketIdentity({ role, claimedUserId, authHeader, requestId }) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedAuthHeader = normalizeAuthHeader(authHeader);
  const parsedPayload = parseTokenPayload(normalizedAuthHeader);
  const tokenIdentity = buildRuntimePrincipalIdentity(parsedPayload || {}, {
    expectedPrincipalType: normalizedRole,
    defaultRole: normalizedRole,
  }) || null;

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
        socketUserId: resolveSocketSubjectId(claimedUserId, tokenIdentity, {
          preferNumericId: true,
          fallbackId: 'admin',
        }),
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
      const verifyResult = extractAuthVerifyResult(verifyData);
      if (!verifyResult.valid) {
        throw createHttpError(401, verifyResult.message || 'Unable to verify user identity for socket auth', {
          pathname: '/api/auth/verify',
          data: verifyData,
          requestId,
        });
      }
      const verifyIdentity = buildRuntimePrincipalIdentity(verifyResult.identity || {}, {
        expectedPrincipalType: 'user',
        defaultRole: 'user',
      }) || null;

      const resolvedUserId = resolveSocketSubjectId(
        claimedUserId,
        [verifyIdentity, tokenIdentity, verifyResult.identity],
        { preferNumericId: true },
      );
      if (!resolvedUserId) {
        throw createHttpError(401, 'Unable to resolve user identity for socket auth');
      }

      return {
        role: 'user',
        socketUserId: resolvedUserId,
        authToken: normalizedAuthHeader,
        payload: parsedPayload || verifyResult.identity || verifyData,
        verifiedBy: '/api/auth/verify'
      };
    }

    case 'rider': {
      const riderId = resolveSocketSubjectId(claimedUserId, tokenIdentity, {
        preferNumericId: true,
      });
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
      const merchantId = resolveSocketSubjectId(claimedUserId, tokenIdentity, {
        preferNumericId: true,
      });
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
