import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SOCKET_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const socketSessions = new Map();

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

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of socketSessions.entries()) {
    if (!session || session.expiresAt <= now) {
      socketSessions.delete(sessionId);
    }
  }
}

function createSocketSession(userId, role, options = {}) {
  cleanupExpiredSessions();

  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + Math.max(1, Number(options.ttlMs || SOCKET_SESSION_TTL_MS));
  socketSessions.set(sessionId, {
    userId: String(userId || ''),
    role: String(role || ''),
    authToken: String(options.authToken || '').trim(),
    authPayload: options.authPayload || null,
    metadata: options.metadata || {},
    expiresAt
  });

  return {
    sessionId,
    expiresAt
  };
}

function getSocketSession(sessionId) {
  cleanupExpiredSessions();
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) return null;

  const session = socketSessions.get(normalizedSessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    socketSessions.delete(normalizedSessionId);
    return null;
  }
  return session;
}

loadLocalEnvFile();

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required for socket-server');
}

const AES_KEY = crypto.scryptSync(JWT_SECRET, 'salt', 32);

const cleanupTimer = setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export function generateToken(userId, role, options = {}) {
  const session = createSocketSession(userId, role, options);
  return jwt.sign(
    {
      userId: String(userId || ''),
      role: String(role || ''),
      sessionId: session.sessionId,
      timestamp: Date.now()
    },
    JWT_SECRET,
    { expiresIn: Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000)) }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    return null;
  }
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

export function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1a\u7f3a\u5c11 token'));
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.sessionId) {
    return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1atoken \u65e0\u6548\u6216\u5df2\u8fc7\u671f'));
  }

  const session = getSocketSession(decoded.sessionId);
  if (!session) {
    return next(new Error('\u8ba4\u8bc1\u5931\u8d25\uff1asocket \u4f1a\u8bdd\u4e0d\u5b58\u5728\u6216\u5df2\u8fc7\u671f'));
  }

  socket.userId = session.userId;
  socket.userRole = session.role;
  socket.sessionId = decoded.sessionId;
  socket.authToken = session.authToken;
  socket.authPayload = session.authPayload;
  socket.socketAuthMetadata = session.metadata || {};
  socket.authenticated = true;
  next();
}
