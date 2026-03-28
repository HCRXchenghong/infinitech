import crypto from 'crypto';

export const REQUEST_ID_HEADER = 'X-Request-ID';
const SOCKET_REQUEST_PREFIX = 'sc';

function compactSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function createRequestId(prefix = SOCKET_REQUEST_PREFIX) {
  const normalizedPrefix = compactSegment(prefix) || SOCKET_REQUEST_PREFIX;
  if (typeof crypto.randomUUID === 'function') {
    return `${normalizedPrefix}_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `${normalizedPrefix}_${crypto.randomBytes(16).toString('hex')}`;
}

export function resolveRequestId(value, prefix = SOCKET_REQUEST_PREFIX) {
  const normalized = compactSegment(value);
  if (normalized) return normalized;
  return createRequestId(prefix);
}

export function attachRequestId(res, requestId) {
  if (!res || !requestId || typeof res.setHeader !== 'function') return;
  res.setHeader(REQUEST_ID_HEADER, requestId);
}

export function getRequestIdFromHeaders(headers) {
  if (!headers) return '';
  const directValue = headers[REQUEST_ID_HEADER] || headers[REQUEST_ID_HEADER.toLowerCase()];
  if (Array.isArray(directValue)) {
    return compactSegment(directValue[0]);
  }
  return compactSegment(directValue);
}

export function buildSocketRequestId(socket, action, target = '') {
  const role = compactSegment(socket?.userRole || 'anonymous') || 'anonymous';
  const userId = compactSegment(socket?.userId || socket?.sessionId || socket?.id || 'unknown') || 'unknown';
  const normalizedAction = compactSegment(action || 'event') || 'event';
  const normalizedTarget = compactSegment(target || '');
  const prefix = normalizedTarget
    ? `${SOCKET_REQUEST_PREFIX}-${role}-${normalizedAction}-${normalizedTarget}`
    : `${SOCKET_REQUEST_PREFIX}-${role}-${normalizedAction}`;
  return createRequestId(`${prefix}-${userId}`);
}
