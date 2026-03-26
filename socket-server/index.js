import { Server } from 'socket.io';
import { createServer } from 'http';
import { db, saveMessage, getMessages, clearMessages, markAsRead, markAllRead, getUnreadCount } from './database.js';
import { authMiddleware, generateToken } from './auth.js';
import { getServerStats, addOnlineUser, removeOnlineUser, getOnlineCount } from './monitor.js';
import { writeFileSync, mkdirSync, existsSync, createReadStream } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';
import { setupSupportNamespaces } from './supportNamespaces.js';
import { setupRiderNamespace } from './riderNamespace.js';
import { setupAiStaffNamespace } from './aiStaffNamespace.js';
import { setupAiNamespace } from './aiNamespace.js';
import { validateSocketIdentity } from './socketIdentity.js';

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

let monitorNamespace;
let supportNamespace;

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

function parseMultipart(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return reject(new Error('No boundary'));

    const boundary = boundaryMatch[1];
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

      const buffer = Buffer.concat(chunks, totalBytes);
      const str = buffer.toString('binary');
      const parts = str.split(`--${boundary}`);

      for (const part of parts) {
        if (!part.includes('filename=')) continue;

        const filenameMatch = part.match(/filename="(.+?)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'upload.jpg';
        const ext = extname(filename) || '.jpg';
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        let fileData = part.substring(headerEnd + 4);
        if (fileData.endsWith('\r\n')) {
          fileData = fileData.substring(0, fileData.length - 2);
        }

        const newFilename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
        const filePath = join(UPLOAD_DIR, newFilename);
        writeFileSync(filePath, fileData, 'binary');
        return resolve({ filename: newFilename, originalName: filename });
      }

      fail(new Error('No file found'));
    });
    req.on('error', fail);
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

function createFixedWindowLimiter(windowMs, maxRequests) {
  const records = new Map();
  let lastCleanupAt = Date.now();

  return {
    allow(key) {
      const now = Date.now();
      if (now - lastCleanupAt >= windowMs * 2) {
        for (const [recordKey, record] of records.entries()) {
          if (now - record.windowStart >= windowMs * 2) {
            records.delete(recordKey);
          }
        }
        lastCleanupAt = now;
      }

      const existing = records.get(key);
      if (!existing || now - existing.windowStart >= windowMs) {
        records.set(key, { windowStart: now, count: 1 });
        return { allowed: true, retryAfterMs: 0 };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterMs: Math.max(windowMs - (now - existing.windowStart), 0)
        };
      }

      existing.count += 1;
      records.set(key, existing);
      return { allowed: true, retryAfterMs: 0 };
    }
  };
}

const httpRateLimiter = createFixedWindowLimiter(
  SOCKET_HTTP_RATE_LIMIT_WINDOW_MS,
  SOCKET_HTTP_RATE_LIMIT_MAX
);

function shouldApplyHttpRateLimit(pathname) {
  return pathname === '/api/upload'
    || pathname === '/api/generate-token'
    || pathname === '/api/messages'
    || pathname === '/api/stats';
}

function enforceHttpRateLimit(req, res, pathname) {
  if (req.method === 'OPTIONS' || !shouldApplyHttpRateLimit(pathname)) {
    return true;
  }

  const { allowed, retryAfterMs } = httpRateLimiter.allow(getClientIp(req));
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

const httpServer = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const requestUrl = buildRequestUrl(req);
  const pathname = requestUrl.pathname;

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

  if (!enforceHttpRateLimit(req, res, pathname)) {
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
    stats.onlineUsers = getOnlineCount();
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
          authHeader: req.headers.authorization || ''
        });
      }

      const token = generateToken(identity.socketUserId, identity.role, {
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

  if (pathname === '/api/messages' && req.method === 'GET') {
    if (!isTrustedSocketApiRequest(req)) {
      writeJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const chatId = requestUrl.searchParams.get('chatId') || '1';
    const lastId = Number.parseInt(requestUrl.searchParams.get('lastId') || '0', 10);
    const allMessages = getMessages('support', chatId);
    const newMessages = allMessages.filter((msg) => Number(msg.legacyId || msg.id || 0) > lastId);
    writeJson(res, 200, { messages: newMessages });
    return;
  }

  if (pathname === '/api/messages' && req.method === 'POST') {
    if (!isTrustedSocketApiRequest(req)) {
      writeJson(res, 403, { error: 'Forbidden' });
      return;
    }

    try {
      const data = await readJsonBody(req, SOCKET_JSON_BODY_LIMIT_BYTES);
      const messageData = normalizeMessageData(data);
      const result = saveMessage('support', data.chatId, messageData);
      const message = {
        id: result.lastInsertRowid,
        chatId: data.chatId,
        ...messageData,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      if (supportNamespace) {
        supportNamespace.emit('new_message', message);
      }

      writeJson(res, 200, { success: true, message });
    } catch (err) {
      writeJson(res, Number(err?.statusCode || 500), {
        error: err?.message || 'Failed to sync message'
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
  clearMessages,
  markAsRead,
  markAllRead,
  getUnreadCount
}));

setupRiderNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  saveMessage
});

setupAiStaffNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
});

setupAiNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  getMessages,
  saveMessage,
  clearMessages,
  normalizeMessageData
});

setInterval(() => {
  const stats = getServerStats();
  stats.onlineUsers = getOnlineCount();
  monitorNamespace.to('monitor_all').emit('server_stats', stats);
}, 5000);

httpServer.listen(PORT, () => {
  logger.info(`Socket.IO 服务运行在端口 ${PORT}`);
  logger.info('Socket auth now requires validated business auth or TOKEN_API_SECRET');
  logger.info('监控端点: /api/stats');
  logger.info('生成 token: POST /api/generate-token');
});
