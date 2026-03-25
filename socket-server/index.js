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

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return reject(new Error('No boundary'));

    const boundary = boundaryMatch[1];
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
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

      reject(new Error('No file found'));
    });
    req.on('error', reject);
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (_err) {
        const error = new Error('Invalid JSON body');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
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

  if (req.method === 'OPTIONS') {
    if (origin && !corsOrigin) {
      writeJson(res, 403, { success: false, error: 'Origin not allowed' });
      return;
    }
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const { filename } = await parseMultipart(req);
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
      writeJson(res, 500, { error: '上传失败' });
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
      const body = await readJsonBody(req);
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
      const data = await readJsonBody(req);
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

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 10 * 1024 * 1024
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
