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
import {
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
} from '../packages/contracts/src/http.js';
import {
  isTrustedSocketApiRequest,
  validateTrustedSocketStatsRequest,
  validateTrustedSocketTokenRequest,
} from './trustedApi.js';
import { resolveSocketRuntimeConfig } from './runtimeConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const runtimeConfig = resolveSocketRuntimeConfig(process.env);
const {
  port: PORT,
  trustedSocketApiSecret: TRUSTED_SOCKET_API_SECRET,
  allowedOrigins: ALLOWED_ORIGINS,
  http: {
    requestTimeoutMs: SOCKET_HTTP_REQUEST_TIMEOUT_MS,
    headersTimeoutMs: SOCKET_HTTP_HEADERS_TIMEOUT_MS,
    keepAliveTimeoutMs: SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS,
    jsonBodyLimitBytes: SOCKET_JSON_BODY_LIMIT_BYTES,
    rateLimitWindowMs: SOCKET_HTTP_RATE_LIMIT_WINDOW_MS,
    rateLimitMax: SOCKET_HTTP_RATE_LIMIT_MAX,
    maxHttpBufferBytes: SOCKET_MAX_HTTP_BUFFER_BYTES,
    slowRequestWarnMs: SOCKET_HTTP_SLOW_REQUEST_WARN_MS,
  },
  socketIo: {
    pingTimeoutMs: SOCKET_PING_TIMEOUT_MS,
    pingIntervalMs: SOCKET_PING_INTERVAL_MS,
    transportMode: SOCKET_TRANSPORT_MODE,
    transports: SOCKET_IO_TRANSPORTS,
    stickySessionsConfirmed: SOCKET_STICKY_SESSIONS_CONFIRMED,
  },
  rtc: {
    ringTimeoutSeconds: SOCKET_RTC_RING_TIMEOUT_SECONDS,
  },
  capacity: SOCKET_CAPACITY,
} = runtimeConfig;

let monitorNamespace;
let supportNamespace;
let notifyNamespace;
initRedisState();

function createPayloadTooLargeError(limitBytes) {
  const error = new Error(`Payload too large (max ${limitBytes} bytes)`);
  error.statusCode = 413;
  return error;
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

function writeSuccessEnvelope(req, res, statusCode, message, data, options = {}) {
  writeJson(res, statusCode, buildSuccessEnvelopePayload(req, message, data, options));
}

function writeErrorEnvelope(req, res, statusCode, message, options = {}) {
  writeJson(res, statusCode, buildErrorEnvelopePayload(req, statusCode, message, options));
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
  writeErrorEnvelope(req, res, 429, 'Too many requests, please retry later');
  return false;
}

function buildRequestUrl(req) {
  return new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
}

function writeSocketStatus(req, res, statusCode, status, extra = {}) {
  const payload = {
    status,
    service: 'socket-server',
    timestamp: new Date().toISOString(),
    ...extra,
  };
  const message = statusCode >= 400
    ? String(extra.error || `socket server ${status}`)
    : `socket server ${status}`;
  if (statusCode >= 400) {
    writeErrorEnvelope(req, res, statusCode, message, {
      data: payload,
      legacy: payload,
    });
    return;
  }
  writeSuccessEnvelope(req, res, statusCode, message, payload, {
    legacy: payload,
  });
}

function getSocketOperationalStatus() {
  const redis = getRedisHealthSnapshot();
  const capacityMode = redis.enabled && (!redis.connected || !redis.adapterEnabled)
    ? 'degraded'
    : 'normal';
  return {
    redis,
    capacityMode,
    capacity: SOCKET_CAPACITY,
    socketIo: {
      transportMode: SOCKET_TRANSPORT_MODE,
      transports: SOCKET_IO_TRANSPORTS,
      stickySessionsConfirmed: SOCKET_STICKY_SESSIONS_CONFIRMED,
    },
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
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Socket-Server-Secret',
  );

  if (origin && !corsOrigin) {
    writeErrorEnvelope(req, res, 403, 'Origin not allowed');
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
    writeSocketStatus(req, res, 200, 'ok', getSocketOperationalStatus());
    return;
  }

  if ((pathname === '/ready' || pathname === '/api/ready') && req.method === 'GET') {
    const readiness = getSocketOperationalStatus();
    const redis = readiness.redis;
    if (redis.enabled && !redis.connected) {
      writeSocketStatus(req, res, 503, 'degraded', {
        error: 'redis not ready',
        ...readiness
      });
      return;
    }
    if (redis.enabled && redis.connected && !redis.adapterEnabled) {
      writeSocketStatus(req, res, 503, 'degraded', {
        error: 'socket adapter not ready',
        ...readiness
      });
      return;
    }

    writeSocketStatus(req, res, 200, 'ready', readiness);
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    writeErrorEnvelope(
      req,
      res,
      403,
      'Socket server direct upload is disabled. Use the authenticated BFF upload endpoint instead.',
    );
    return;
  }

  if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    writeErrorEnvelope(
      req,
      res,
      403,
      'Socket server public upload hosting is disabled. Use authenticated API asset routes instead.',
    );
    return;
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    try {
      validateTrustedSocketStatsRequest(req, TRUSTED_SOCKET_API_SECRET);

      const stats = getServerStats();
      stats.onlineUsers = await getOnlineCount();
      stats.onlinePresenceSample = await getOnlineUsers(20);
      stats.redis = getRedisHealthSnapshot();
      stats.supportHistoryFallback = getSupportHistoryFallbackConfig();
      writeSuccessEnvelope(req, res, 200, 'Socket server stats loaded successfully', stats, {
        legacy: stats,
      });
    } catch (err) {
      writeErrorEnvelope(
        req,
        res,
        Number(err?.statusCode || 500),
        err?.message || 'Failed to load socket server stats',
      );
    }
    return;
  }

  if (pathname === '/api/generate-token' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req, SOCKET_JSON_BODY_LIMIT_BYTES);
      let identity;

      if (isTrustedSocketApiRequest(req, TRUSTED_SOCKET_API_SECRET)) {
        const trustedRequest = validateTrustedSocketTokenRequest(body);

        identity = {
          role: trustedRequest.role,
          socketUserId: trustedRequest.userId,
          authToken: '',
          payload: null,
          verifiedBy: 'socket-service-secret'
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

      writeSuccessEnvelope(req, res, 200, 'Socket token issued successfully', {
        token,
        userId: identity.socketUserId,
        role: identity.role
      }, {
        legacy: {
          token,
          userId: identity.socketUserId,
          role: identity.role,
        },
      });
    } catch (err) {
      const statusCode = Number(err?.statusCode || 500);
      writeErrorEnvelope(req, res, statusCode, err?.message || 'Failed to generate socket token');
    }
    return;
  }

  if (pathname === '/api/realtime/publish' && req.method === 'POST') {
    if (!isTrustedSocketApiRequest(req, TRUSTED_SOCKET_API_SECRET)) {
      writeErrorEnvelope(req, res, 403, '未授权访问');
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
      writeSuccessEnvelope(req, res, 200, 'Realtime notification published successfully', result, {
        legacy: result,
      });
    } catch (err) {
      writeErrorEnvelope(
        req,
        res,
        Number(err?.statusCode || 500),
        err?.message || 'Failed to publish realtime notification',
      );
    }
    return;
  }

  writeErrorEnvelope(req, res, 404, `Socket route not found: ${req.method} ${pathname}`);
});

httpServer.requestTimeout = SOCKET_HTTP_REQUEST_TIMEOUT_MS;
httpServer.headersTimeout = SOCKET_HTTP_HEADERS_TIMEOUT_MS;
httpServer.keepAliveTimeout = SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS;

const io = new Server(httpServer, {
  cors: {
    origin: socketIoCorsOrigin,
    methods: ['GET', 'POST']
  },
  transports: SOCKET_IO_TRANSPORTS,
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
  logger.info('Socket auth now requires validated business auth or SOCKET_SERVER_API_SECRET');
  logger.info('监控端点: /api/stats');
  logger.info('生成 token: POST /api/generate-token');
  logger.info('实时广播: POST /api/realtime/publish');
});
