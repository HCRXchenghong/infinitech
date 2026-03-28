import { Server } from 'socket.io';
import { createServer } from 'http';
import { db, saveMessage, getMessages, clearMessages, replaceMessages, reconcileMessage, markAsRead, markAllRead, getUnreadCount } from './database.js';
import { authMiddleware, generateToken } from './auth.js';
import { getServerStats, addOnlineUser, removeOnlineUser, getOnlineCount, getOnlineUsers } from './monitor.js';
import Busboy from 'busboy';
import { mkdirSync, existsSync, createReadStream, createWriteStream, unlinkSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { logger } from './logger.js';
import { setupSupportNamespaces } from './supportNamespaces.js';
import { setupRiderNamespace } from './riderNamespace.js';
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

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SOCKET_HTTP_REQUEST_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_REQUEST_TIMEOUT_MS, 30_000);
const SOCKET_HTTP_HEADERS_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_HEADERS_TIMEOUT_MS, 35_000);
const SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000);
const SOCKET_JSON_BODY_LIMIT_BYTES = toPositiveInt(process.env.SOCKET_JSON_BODY_LIMIT_BYTES, 1024 * 1024);
const SOCKET_UPLOAD_LIMIT_BYTES = toPositiveInt(process.env.SOCKET_UPLOAD_LIMIT_BYTES, 12 * 1024 * 1024);
const SOCKET_HTTP_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.SOCKET_HTTP_RATE_LIMIT_WINDOW_MS, 60_000);
const SOCKET_HTTP_RATE_LIMIT_MAX = toPositiveInt(process.env.SOCKET_HTTP_RATE_LIMIT_MAX, 300);
const SOCKET_PING_TIMEOUT_MS = toPositiveInt(process.env.SOCKET_PING_TIMEOUT_MS, 20_000);
const SOCKET_PING_INTERVAL_MS = toPositiveInt(process.env.SOCKET_PING_INTERVAL_MS, 25_000);
const SOCKET_MAX_HTTP_BUFFER_BYTES = toPositiveInt(process.env.SOCKET_MAX_HTTP_BUFFER_BYTES, 4 * 1024 * 1024);
const SOCKET_READY_MAX_FALLBACK_MESSAGES = toPositiveInt(process.env.SOCKET_READY_MAX_FALLBACK_MESSAGES, 5_000);
const SOCKET_READY_MAX_FALLBACK_CHATS = toPositiveInt(process.env.SOCKET_READY_MAX_FALLBACK_CHATS, 200);
const SOCKET_HTTP_SLOW_REQUEST_WARN_MS = toPositiveInt(process.env.SOCKET_HTTP_SLOW_REQUEST_WARN_MS, 1_500);

let monitorNamespace;
let supportNamespace;
initRedisState();

async function convertHeicIfNeeded(filePath, ext) {
  if (ext.toLowerCase() !== '.heic' && ext.toLowerCase() !== '.heif') return filePath;
  try {
    const absPath = join(dirname(fileURLToPath(import.meta.url)), filePath.startsWith('.') ? filePath : filePath);
    const outPath = absPath.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
    const heicConverterUrl = process.env.HEIC_CONVERTER_URL || 'http://127.0.0.1:9899';
    const resp = await fetch(`${heicConverterUrl}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputPath: absPath, outputPath: outPath })
    });
    const result = await resp.json();
    if (result.success) {
      logger.info(`HEIC 转码成功: ${filePath} -> ${result.filename}`);
      return outPath;
    }
  } catch (err) {
    logger.error('HEIC 转码失败:', err.message);
  }
  return filePath;
}

const UPLOAD_DIR = join(__dirname, 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

function createPayloadTooLargeError(limitBytes) {
  const error = new Error(`Payload too large (max ${limitBytes} bytes)`);
  error.statusCode = 413;
  return error;
}

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function resolveUploadExtension(filename, mimeType = '') {
  const explicitExt = extname(String(filename || '')).toLowerCase();
  if (explicitExt) return explicitExt;

  const mime = String(mimeType || '').trim().toLowerCase();
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/amr': '.amr'
  };
  return mimeMap[mime] || '.bin';
}

function parseMultipart(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: maxBytes,
          fields: 16,
          parts: 32
        }
      });
    } catch (_err) {
      reject(createBadRequestError('Invalid multipart upload'));
      return;
    }

    let settled = false;
    let fileFound = false;
    let tempFilePath = '';
    let writer = null;

    const cleanup = () => {
      if (!tempFilePath) return;
      try {
        if (existsSync(tempFilePath)) {
          unlinkSync(tempFilePath);
        }
      } catch (_err) {
        // ignore cleanup failure
      }
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
       try {
        if (writer) {
          writer.destroy();
        }
      } catch (_destroyError) {
        // ignore
      }
      cleanup();
      reject(err);
    };

    busboy.on('file', (_fieldName, file, info = {}) => {
      if (fileFound) {
        file.resume();
        fail(createBadRequestError('Only one file upload is supported'));
        return;
      }
      fileFound = true;

      const originalName = String(info.filename || '').trim() || 'upload.bin';
      const ext = resolveUploadExtension(originalName, info.mimeType);
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      tempFilePath = join(UPLOAD_DIR, filename);
      writer = createWriteStream(tempFilePath, { flags: 'wx' });

      file.on('limit', () => {
        fail(createPayloadTooLargeError(maxBytes));
      });
      file.on('error', (err) => fail(err));
      writer.on('error', (err) => fail(err));
      writer.on('finish', () => {
        if (settled) return;
        settled = true;
        resolve({ filename, originalName });
      });

      file.pipe(writer);
    });

    busboy.on('filesLimit', () => {
      fail(createBadRequestError('Only one file upload is supported'));
    });
    busboy.on('partsLimit', () => {
      fail(createBadRequestError('Too many multipart parts'));
    });
    busboy.on('error', (err) => fail(err));
    busboy.on('finish', () => {
      if (settled || fileFound) return;
      fail(createBadRequestError('No file found'));
    });
    req.on('error', fail);
    req.pipe(busboy);
  });
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:8888',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://localhost:8080'
];

const ALLOWED_ORIGINS = Array.from(new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED_ORIGINS)
));

function getCorsOrigin(reqOrigin) {
  const normalizedOrigin = String(reqOrigin || '').trim();
  if (!normalizedOrigin) return '';
  if (ALLOWED_ORIGINS.includes(normalizedOrigin)) return normalizedOrigin;
  return '';
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
  const stats = getServerStats();
  return {
    redis: getRedisHealthSnapshot(),
    fallbackBuffer: stats.fallbackBuffer || null,
    fallbackRuntime: stats.fallbackRuntime || null
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
    const fallbackBuffer = readiness.fallbackBuffer || {};
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
    if (Number.isFinite(Number(fallbackBuffer.messageCount)) && Number(fallbackBuffer.messageCount) > SOCKET_READY_MAX_FALLBACK_MESSAGES) {
      writeSocketStatus(res, 503, 'degraded', {
        error: 'fallback buffer too large',
        maxFallbackMessages: SOCKET_READY_MAX_FALLBACK_MESSAGES,
        ...readiness
      });
      return;
    }
    if (Number.isFinite(Number(fallbackBuffer.chatCount)) && Number(fallbackBuffer.chatCount) > SOCKET_READY_MAX_FALLBACK_CHATS) {
      writeSocketStatus(res, 503, 'degraded', {
        error: 'fallback chat count too large',
        maxFallbackChats: SOCKET_READY_MAX_FALLBACK_CHATS,
        ...readiness
      });
      return;
    }

    writeSocketStatus(res, 200, 'ready', readiness);
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const { filename } = await parseMultipart(req, SOCKET_UPLOAD_LIMIT_BYTES);
      const ext = extname(filename).toLowerCase();
      let finalFilename = filename;

      if (ext === '.heic' || ext === '.heif') {
        const filePath = join(UPLOAD_DIR, filename);
        const converted = await convertHeicIfNeeded(filePath, ext);
        finalFilename = converted.split(/[/\\]/).pop();
      }

      const host = req.headers.host || `0.0.0.0:${PORT}`;
      const url = `http://${host}/uploads/${finalFilename}`;
      writeJson(res, 200, { url, filename: finalFilename });
    } catch (err) {
      logger.error('上传失败:', err);
      writeJson(res, Number(err?.statusCode || 500), { error: err?.message || '上传失败' });
    }
    return;
  }

  if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    const filename = pathname.replace('/uploads/', '');
    const filePath = join(UPLOAD_DIR, filename);
    if (existsSync(filePath)) {
      const ext = extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.amr': 'audio/amr'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    const stats = getServerStats();
    stats.onlineUsers = await getOnlineCount();
    stats.onlinePresenceSample = await getOnlineUsers(20);
    stats.redis = getRedisHealthSnapshot();
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

  res.writeHead(404);
  res.end();
});

httpServer.requestTimeout = SOCKET_HTTP_REQUEST_TIMEOUT_MS;
httpServer.headersTimeout = SOCKET_HTTP_HEADERS_TIMEOUT_MS;
httpServer.keepAliveTimeout = SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS;

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*',
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
  removeOnlineUser,
  db,
  getMessages,
  saveMessage,
  reconcileMessage,
  clearMessages,
  replaceMessages,
  markAsRead,
  markAllRead,
  getUnreadCount
}));

setupRiderNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  saveMessage,
  reconcileMessage
});

setInterval(async () => {
  try {
    const stats = getServerStats();
    stats.onlineUsers = await getOnlineCount();
    stats.onlinePresenceSample = await getOnlineUsers(20);
    stats.redis = getRedisHealthSnapshot();
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
});
