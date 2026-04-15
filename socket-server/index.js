import { Server } from 'socket.io';
import { createServer } from 'http';
import { authMiddleware, generateToken } from './auth.js';
import { getServerStats, addOnlineUser, removeOnlineUser, getOnlineCount, getOnlineUsers } from './monitor.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { getSupportHistoryFallbackConfig, setupSupportNamespaces } from './supportNamespaces.js';
import { setupRiderNamespace } from './riderNamespace.js';
import { publishRealtimeEvent, setupNotifyNamespace } from './notifyNamespace.js';
import { setupRTCNamespace } from './rtcNamespace.js';
import { validateSocketIdentity } from './socketIdentity.js';
import { REQUEST_ID_HEADER, attachRequestId, resolveRequestId } from './requestId.js';
import {
  allowFixedWindowRateLimit,
  attachSocketIoRedisAdapter,
  getRedisHealthSnapshot,
  initRedisState
} from './redisState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.SOCKET_PORT || 9898;
const TRUSTED_TOKEN_API_SECRET = String(process.env.TOKEN_API_SECRET || '').trim();
const ENV = String(process.env.ENV || process.env.NODE_ENV || 'development').trim().toLowerCase();
const PRODUCTION_LIKE = ['production', 'prod', 'staging'].includes(ENV);

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SOCKET_HTTP_REQUEST_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_REQUEST_TIMEOUT_MS, 30_000);
const SOCKET_HTTP_HEADERS_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_HEADERS_TIMEOUT_MS, 35_000);
const SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000);
const SOCKET_JSON_BODY_LIMIT_BYTES = toPositiveInt(process.env.SOCKET_JSON_BODY_LIMIT_BYTES, 1024 * 1024);
const SOCKET_HTTP_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.SOCKET_HTTP_RATE_LIMIT_WINDOW_MS, 60_000);
const SOCKET_HTTP_RATE_LIMIT_MAX = toPositiveInt(process.env.SOCKET_HTTP_RATE_LIMIT_MAX, 300);
const SOCKET_PING_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_PING_TIMEOUT_MS, 20_000);
const SOCKET_PING_INTERVAL_MS = toPositiveInt(process.env.SOCKET_PING_INTERVAL_MS, 25_000);
const SOCKET_MAX_HTTP_BUFFER_BYTES = toPositiveInt(process.env.SOCKET_MAX_HTTP_BUFFER_BYTES, 4 * 1024 * 1024);
const SOCKET_HTTP_SLOW_REQUEST_WARN_MS = toPositiveInt(process.env.SOCKET_HTTP_SLOW_REQUEST_WARN_MS, 1_500);
const SOCKET_RTC_RING_TIMEOUT_SECONDS = toPositiveInt(process.env.SOCKET_RTC_RING_TIMEOUT_SECONDS, 35);

let monitorNamespace;
let supportNamespace;
let notifyNamespace;
initRedisState();

function createPayloadTooLargeError(limitBytes) {
  const error = new Error(`Payload too large (max ${limitBytes} bytes)`);
  error.statusCode = 413;
  return error;
}

const DEFAULT_ALLOWED_ORIGINS = PRODUCTION_LIKE
  ? []
  : [
    'http://127.0.0.1:8888',
    'http://localhost:8888',
    'http://127.0.0.1:1788',
    'http://localhost:1788',
    'http://127.0.0.1:1798',
    'http://localhost:1798'
  ];

const ALLOWED_ORIGINS = Array.from(new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED_ORIGINS)
));

if (PRODUCTION_LIKE && ALLOWED_ORIGINS.length === 0) {
  throw new Error('ALLOWED_ORIGINS is required for socket-server in production-like environments');
}

function getCorsOrigin(reqOrigin) {
  const normalizedOrigin = String(reqOrigin || '').trim();
  if (!normalizedOrigin) return '';
  if (ALLOWED_ORIGINS.includes(normalizedOrigin)) return normalizedOrigin;
  return '';
}

function socketIoCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (getCorsOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Origin not allowed by socket-server CORS'));
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function logHttpRequest(req, res, pathname, requestId) {
  const startedAt = Date.now();
  res.on('finish', () => {
    const latencyMs = Date.now() - startedAt;
    const statusCode = Number(res.statusCode || 0);
    const slowRequest = latencyMs >= SOCKET_HTTP_SLOW_REQUEST_WARN_MS;
    const logLevel = statusCode >= 500
      ? 'error'
      : (statusCode >= 400 || slowRequest ? 'warn' : 'info');
    logger[logLevel](
      `HTTP ${req.method} ${pathname} ${statusCode} ${latencyMs}ms slow=${slowRequest} slow_threshold_ms=${SOCKET_HTTP_SLOW_REQUEST_WARN_MS} request_id=${requestId} ip=${getClientIp(req)}`
    );
  });
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        const error = createPayloadTooLargeError(maxBytes);
        req.destroy(error);
        fail(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;

      const body = Buffer.concat(chunks, totalBytes).toString('utf8');
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (_err) {
        const error = new Error('Invalid JSON body');
        error.statusCode = 400;
        fail(error);
      }
    });
    req.on('error', fail);
  });
}

function getClientIp(req) {
  const candidates = [
    req.headers['x-forwarded-for'],
    req.headers['x-real-ip'],
    req.socket?.remoteAddress,
    req.connection?.remoteAddress
  ];

  for (const candidate of candidates) {
    const value = Array.isArray(candidate) ? candidate[0] : candidate;
    const normalized = String(value || '').split(',')[0].trim();
    if (normalized) return normalized;
  }

  return 'unknown';
}

function shouldApplyHttpRateLimit(pathname) {
  return pathname === '/api/upload'
    || pathname === '/api/generate-token'
    || pathname === '/api/stats';
}

async function enforceHttpRateLimit(req, res, pathname) {
  if (req.method === 'OPTIONS' || !shouldApplyHttpRateLimit(pathname)) {
    return true;
  }

  const { allowed, retryAfterMs } = await allowFixedWindowRateLimit({
    prefix: 'ratelimit:socket:http',
    key: getClientIp(req),
    windowMs: SOCKET_HTTP_RATE_LIMIT_WINDOW_MS,
    maxRequests: SOCKET_HTTP_RATE_LIMIT_MAX
  });
  if (allowed) return true;

  res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  writeJson(res, 429, { error: 'Too many requests, please retry later' });
  return false;
}

function isTrustedSocketApiRequest(req) {
  if (!TRUSTED_TOKEN_API_SECRET) return false;

  const candidateValues = [
    req.headers['x-token-api-secret'],
    req.headers['x-api-secret'],
    req.headers.authorization
  ];

  return candidateValues.some((value) => {
    const normalized = String(value || '').trim();
    return normalized === TRUSTED_TOKEN_API_SECRET || normalized === `Bearer ${TRUSTED_TOKEN_API_SECRET}`;
  });
}

function buildRequestUrl(req) {
  return new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
}

function writeSocketStatus(res, statusCode, status, extra = {}) {
  writeJson(res, statusCode, {
    status,
    service: 'socket-server',
    timestamp: new Date().toISOString(),
    ...extra
  });
}

function getSocketOperationalStatus() {
  return {
    redis: getRedisHealthSnapshot(),
    supportHistoryFallback: getSupportHistoryFallbackConfig(),
    rtc: {
      ringTimeoutSeconds: SOCKET_RTC_RING_TIMEOUT_SECONDS
    }
  };
}

const httpServer = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const requestUrl = buildRequestUrl(req);
  const pathname = requestUrl.pathname;
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER] || req.headers[REQUEST_ID_HEADER.toLowerCase()], 'sc-http');

  req.requestId = requestId;
  attachRequestId(res, requestId);
  logHttpRequest(req, res, pathname, requestId);

  const corsOrigin = getCorsOrigin(origin);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Token-Api-Secret, X-Api-Secret');

  if (origin && !corsOrigin) {
    writeJson(res, 403, { success: false, error: 'Origin not allowed' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (!(await enforceHttpRateLimit(req, res, pathname))) {
    return;
  }

  if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
    writeSocketStatus(res, 200, 'ok', getSocketOperationalStatus());
    return;
  }

  if ((pathname === '/ready' || pathname === '/api/ready') && req.method === 'GET') {
    const readiness = getSocketOperationalStatus();
    const redis = readiness.redis;
    if (redis.enabled && !redis.connected) {
      writeSocketStatus(res, 503, 'degraded', {
        error: 'redis not ready',
        ...readiness
      });
      return;
    }
    if (redis.enabled && redis.connected && !redis.adapterEnabled) {
      writeSocketStatus(res, 503, 'degraded', {
        error: 'socket adapter not ready',
        ...readiness
      });
      return;
    }

    writeSocketStatus(res, 200, 'ready', readiness);
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    writeJson(res, 403, {
      success: false,
      error: 'Socket server direct upload is disabled. Use the authenticated BFF upload endpoint instead.',
    });
    return;
  }

  if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    writeJson(res, 403, {
      success: false,
      error: 'Socket server public upload hosting is disabled. Use authenticated API asset routes instead.',
    });
    return;
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    const stats = getServerStats();
    stats.onlineUsers = await getOnlineCount();
    stats.onlinePresenceSample = await getOnlineUsers(20);
    stats.redis = getRedisHealthSnapshot();
    stats.supportHistoryFallback = getSupportHistoryFallbackConfig();
    writeJson(res, 200, stats);
    return;
  }

  if (pathname === '/api/generate-token' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req, SOCKET_JSON_BODY_LIMIT_BYTES);
      let identity;

      if (isTrustedSocketApiRequest(req)) {
        const userId = String(body?.userId || '').trim();
        const role = String(body?.role || '').trim().toLowerCase();
        if (!userId || !role) {
          writeJson(res, 400, { error: 'userId and role are required for trusted socket token issuance' });
          return;
        }

        identity = {
          role,
          socketUserId: userId,
          authToken: '',
          payload: null,
          verifiedBy: 'trusted-secret'
        };
      } else {
        identity = await validateSocketIdentity({
          role: body?.role,
          claimedUserId: body?.userId,
          authHeader: req.headers.authorization || '',
          requestId
        });
      }

      const token = await generateToken(identity.socketUserId, identity.role, {
        authToken: identity.authToken,
        authPayload: identity.payload,
        metadata: {
          issuer: 'api.generate-token',
          verifiedBy: identity.verifiedBy || ''
        }
      });

      writeJson(res, 200, {
        token,
        userId: identity.socketUserId,
        role: identity.role
      });
    } catch (err) {
      const statusCode = Number(err?.statusCode || 500);
      writeJson(res, statusCode, {
        error: err?.message || 'Failed to generate socket token'
      });
    }
    return;
  }

  if (pathname === '/api/realtime/publish' && req.method === 'POST') {
    if (!isTrustedSocketApiRequest(req)) {
      writeJson(res, 403, { error: '未授权访问' });
      return;
    }
    try {
      const body = await readJsonBody(req, SOCKET_JSON_BODY_LIMIT_BYTES);
      const result = publishRealtimeEvent(
        notifyNamespace,
        body?.eventName,
        Array.isArray(body?.recipients) ? body.recipients : [],
        body?.payload && typeof body.payload === 'object' ? body.payload : {}
      );
      writeJson(res, 200, {
        success: true,
        ...result
      });
    } catch (err) {
      writeJson(res, Number(err?.statusCode || 500), {
        error: err?.message || 'Failed to publish realtime notification'
      });
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

httpServer.requestTimeout = SOCKET_HTTP_REQUEST_TIMEOUT_MS;
httpServer.headersTimeout = SOCKET_HTTP_HEADERS_TIMEOUT_MS;
httpServer.keepAliveTimeout = SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS;

const io = new Server(httpServer, {
  cors: {
    origin: socketIoCorsOrigin,
    methods: ['GET', 'POST']
  },
  pingTimeout: SOCKET_PING_TIMEOUT_MS,
  pingInterval: SOCKET_PING_INTERVAL_MS,
  maxHttpBufferSize: SOCKET_MAX_HTTP_BUFFER_BYTES
});
await attachSocketIoRedisAdapter(io);

({
  monitorNamespace,
  supportNamespace
} = setupSupportNamespaces({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
}));

({
  notifyNamespace
} = setupNotifyNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
}));

setupRiderNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
});

setupRTCNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  ringTimeoutMs: SOCKET_RTC_RING_TIMEOUT_SECONDS * 1000
});

setInterval(async () => {
  try {
    const stats = getServerStats();
    stats.onlineUsers = await getOnlineCount();
    stats.onlinePresenceSample = await getOnlineUsers(20);
    stats.redis = getRedisHealthSnapshot();
    stats.supportHistoryFallback = getSupportHistoryFallbackConfig();
    monitorNamespace.to('monitor_all').emit('server_stats', stats);
  } catch (err) {
    logger.warn('server stats broadcast failed:', err?.message || err);
  }
}, 5000);

httpServer.listen(PORT, () => {
  logger.info(`Socket.IO 服务运行在端口 ${PORT}`);
  logger.info('Socket auth now requires validated business auth or TOKEN_API_SECRET');
  logger.info('监控端点: /api/stats');
  logger.info('生成 token: POST /api/generate-token');
  logger.info('实时广播: POST /api/realtime/publish');
});
