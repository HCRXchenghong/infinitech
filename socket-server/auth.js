import crypto from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createSocketSessionRecord, getSocketSessionRecord, initRedisState } from './redisState.js';

function loadLocalEnvFile() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();
initRedisState();

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required for socket-server');
}

const AES_KEY = crypto.scryptSync(JWT_SECRET, 'salt', 32);
const SOCKET_ACCESS_TOKEN_KIND = 'socket_access';
const SUPPORTED_SOCKET_ROLES = new Set(['user', 'merchant', 'rider', 'admin', 'site_visitor']);

function trimText(value) {
  return String(value ?? '').trim();
}

function normalizeSocketRole(value) {
  const normalized = trimText(value).toLowerCase();
  return SUPPORTED_SOCKET_ROLES.has(normalized) ? normalized : '';
}

function toBase64Url(value) {
  return Buffer.from(String(value || ''), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = trimText(value)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  if (!normalized) return '';
  const remainder = normalized.length % 4;
  const padded = remainder ? normalized + '='.repeat(4 - remainder) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function buildSocketScope(role) {
  const normalizedRole = normalizeSocketRole(role);
  if (!normalizedRole) {
    return ['socket', `token:${SOCKET_ACCESS_TOKEN_KIND}`];
  }
  return [
    'socket',
    `principal:${normalizedRole}`,
    `token:${SOCKET_ACCESS_TOKEN_KIND}`,
    `role:${normalizedRole}`,
  ];
}

function normalizeSocketScope(scope, role) {
  if (Array.isArray(scope)) {
    const normalized = scope
      .map((item) => trimText(item))
      .filter(Boolean);
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return buildSocketScope(role);
}

function buildSocketPayloadSignature(payloadBase64, secret = JWT_SECRET) {
  return crypto
    .createHmac('sha256', String(secret || '').trim())
    .update(payloadBase64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function isTimingSafeMatch(left, right) {
  const leftBuffer = Buffer.from(trimText(left));
  const rightBuffer = Buffer.from(trimText(right));
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseNumericLegacyId(userId) {
  if (!/^\d+$/.test(trimText(userId))) {
    return undefined;
  }
  const parsed = Number.parseInt(trimText(userId), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function buildSocketTokenPayload(userId, role, sessionId, expiresAt, options = {}) {
  const normalizedUserId = trimText(userId);
  const normalizedRole = normalizeSocketRole(role);
  const normalizedSessionId = trimText(sessionId);
  const expiresAtMs = Number(expiresAt || 0);
  const nowMs = Math.max(1, Number(options.nowMs || Date.now()));

  if (!normalizedUserId || !normalizedRole || !normalizedSessionId || !Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
    throw new Error('invalid socket token payload');
  }

  const payload = {
    sub: normalizedUserId,
    principal_type: normalizedRole,
    principal_id: normalizedUserId,
    role: normalizedRole,
    session_id: normalizedSessionId,
    scope: buildSocketScope(normalizedRole),
    token_kind: SOCKET_ACCESS_TOKEN_KIND,
    exp: Math.floor(expiresAtMs / 1000),
    iat: Math.floor(nowMs / 1000),
  };

  const principalLegacyID = parseNumericLegacyId(normalizedUserId);
  if (principalLegacyID !== undefined) {
    payload.principal_legacy_id = principalLegacyID;
  }

  return payload;
}

export function signSocketTokenPayload(payload, secret = JWT_SECRET) {
  const resolvedSecret = trimText(secret);
  if (!resolvedSecret) {
    throw new Error('JWT_SECRET is required for socket-server');
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = buildSocketPayloadSignature(payloadBase64, resolvedSecret);
  return `${payloadBase64}.${signature}`;
}

export function verifyUnifiedSocketToken(token, secret = JWT_SECRET) {
  try {
    const resolvedSecret = trimText(secret);
    const rawToken = trimText(token);
    if (!resolvedSecret || !rawToken) {
      return null;
    }

    const parts = rawToken.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const payloadBase64 = trimText(parts[0]);
    const providedSignature = trimText(parts[1]);
    const expectedSignature = buildSocketPayloadSignature(payloadBase64, resolvedSecret);
    if (!isTimingSafeMatch(providedSignature, expectedSignature)) {
      return null;
    }

    const decoded = JSON.parse(fromBase64Url(payloadBase64));
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    const userId = trimText(
      decoded.principal_id || decoded.principalId || decoded.sub || decoded.userId,
    );
    const role = normalizeSocketRole(
      decoded.role || decoded.principal_type || decoded.principalType,
    );
    const sessionId = trimText(decoded.session_id || decoded.sessionId);
    const tokenKind = trimText(
      decoded.token_kind || decoded.tokenKind || decoded.type,
    ).toLowerCase();
    const exp = Number(decoded.exp || 0);

    if (
      !userId
      || !role
      || !sessionId
      || tokenKind !== SOCKET_ACCESS_TOKEN_KIND
      || !Number.isFinite(exp)
      || exp <= 0
      || Math.floor(Date.now() / 1000) > exp
    ) {
      return null;
    }

    return {
      ...decoded,
      sub: userId,
      principal_type: trimText(decoded.principal_type || role),
      principal_id: userId,
      role,
      session_id: sessionId,
      scope: normalizeSocketScope(decoded.scope, role),
      token_kind: SOCKET_ACCESS_TOKEN_KIND,
      exp,
      iat: Number(decoded.iat || 0) || undefined,
    };
  } catch (_err) {
    return null;
  }
}

export async function generateToken(userId, role, options = {}) {
  const normalizedUserId = trimText(userId);
  const normalizedRole = normalizeSocketRole(role);
  if (!normalizedUserId || !normalizedRole) {
    throw new Error('socket token userId and role are required');
  }

  const session = await createSocketSessionRecord(normalizedUserId, normalizedRole, options);
  return signSocketTokenPayload(
    buildSocketTokenPayload(
      normalizedUserId,
      normalizedRole,
      session.sessionId,
      session.expiresAt,
      { nowMs: options.nowMs },
    ),
  );
}

export function verifyToken(token) {
  return verifyUnifiedSocketToken(token);
}

export function encryptMessage(content) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(content), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptMessage(encrypted) {
  try {
    const [ivHex, encryptedData] = String(encrypted || '').split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (_err) {
    return null;
  }
}

export async function authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1a\u7f3a\u5c11 token'));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.session_id) {
      return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1atoken \u65e0\u6548\u6216\u5df2\u8fc7\u671f'));
    }

    const session = await getSocketSessionRecord(decoded.session_id);
    if (!session) {
      return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1asocket \u4f1a\u8bdd\u4e0d\u5b58\u5728\u6216\u5df2\u8fc7\u671f'));
    }

    socket.userId = session.userId;
    socket.userRole = session.role;
    socket.sessionId = decoded.session_id;
    socket.authToken = session.authToken;
    socket.authPayload = session.authPayload;
    socket.socketAuthMetadata = session.metadata || {};
    socket.authenticated = true;
    next();
  } catch (err) {
    next(err);
  }
}
