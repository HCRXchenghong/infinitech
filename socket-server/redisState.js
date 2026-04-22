import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import crypto from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { resolveSocketRuntimeConfig } from './runtimeConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOCKET_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadLocalEnvFile() {
  const envPath = join(__dirname, '.env');
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

const runtimeConfig = resolveSocketRuntimeConfig(process.env);
const redisEnabled = runtimeConfig.redis.enabled;
const redisConfig = runtimeConfig.redis;
const SOCKET_ONLINE_TTL_MS = toPositiveInt(process.env.SOCKET_ONLINE_TTL_MS, 120_000);

const localSessionStore = new Map();
const localRateLimitStore = new Map();
const localJsonCacheStore = new Map();
let redisClient = null;
let redisConnectPromise = null;
let redisDisabledUntil = 0;
let adapterClientsPromise = null;
let socketIoAdapterEnabled = false;

function cleanupLocalSessions() {
  const now = Date.now();
  for (const [sessionId, session] of localSessionStore.entries()) {
    if (!session || session.expiresAt <= now) {
      localSessionStore.delete(sessionId);
    }
  }
}

function cleanupLocalRateLimit(windowMs) {
  const now = Date.now();
  for (const [key, record] of localRateLimitStore.entries()) {
    if (!record || now - record.windowStart >= windowMs * 2) {
      localRateLimitStore.delete(key);
    }
  }
}

function cleanupLocalJsonCache() {
  const now = Date.now();
  for (const [key, record] of localJsonCacheStore.entries()) {
    if (!record || record.expiresAt <= now) {
      localJsonCacheStore.delete(key);
    }
  }
}

async function ensureRedisClient() {
  if (!redisEnabled) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;
  if (Date.now() < redisDisabledUntil) return null;

  const client = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
      connectTimeout: redisConfig.connectTimeout,
      reconnectStrategy: false
    },
    password: redisConfig.password || undefined,
    database: redisConfig.database
  });

  client.on('error', (err) => {
    logger.warn('socket-server redis client error:', err?.message || err);
  });

  redisConnectPromise = client.connect()
    .then(() => {
      redisClient = client;
      redisDisabledUntil = 0;
      logger.info(`socket-server redis connected: ${redisConfig.host}:${redisConfig.port}/${redisConfig.database}`);
      return redisClient;
    })
    .catch((err) => {
      redisDisabledUntil = Date.now() + 30_000;
      logger.warn('socket-server redis unavailable, falling back to local state:', err?.message || err);
      try {
        client.disconnect();
      } catch (_err) {
        // ignore cleanup errors
      }
      return null;
    })
    .finally(() => {
      redisConnectPromise = null;
    });

  return redisConnectPromise;
}

async function ensureAdapterClients() {
  if (adapterClientsPromise) return adapterClientsPromise;

  adapterClientsPromise = (async () => {
    const client = await ensureRedisClient();
    if (!client) return null;

    const pubClient = client.duplicate();
    const subClient = client.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    return { pubClient, subClient };
  })().catch((err) => {
    logger.warn('socket-server redis adapter unavailable, falling back to single-instance adapter:', err?.message || err);
    return null;
  }).finally(() => {
    adapterClientsPromise = null;
  });

  return adapterClientsPromise;
}

export function initRedisState() {
  void ensureRedisClient();
}

export async function attachSocketIoRedisAdapter(io) {
  const adapterClients = await ensureAdapterClients();
  if (!adapterClients) {
    socketIoAdapterEnabled = false;
    return false;
  }

  io.adapter(createAdapter(adapterClients.pubClient, adapterClients.subClient));
  socketIoAdapterEnabled = true;
  logger.info('socket-server Redis adapter enabled for cross-instance broadcasting');
  return true;
}

export async function createSocketSessionRecord(userId, role, options = {}) {
  cleanupLocalSessions();

  const sessionId = crypto.randomUUID();
  const ttlMs = Math.max(1, Number(options.ttlMs || SOCKET_SESSION_TTL_MS));
  const expiresAt = Date.now() + ttlMs;
  const record = {
    userId: String(userId || ''),
    role: String(role || ''),
    authToken: String(options.authToken || '').trim(),
    authPayload: options.authPayload || null,
    metadata: options.metadata || {},
    expiresAt
  };

  const client = await ensureRedisClient();
  if (client) {
    await client.set(`socket:session:${sessionId}`, JSON.stringify(record), {
      PX: ttlMs
    });
  } else {
    localSessionStore.set(sessionId, record);
  }

  return { sessionId, expiresAt };
}

export async function getSocketSessionRecord(sessionId) {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) return null;

  const client = await ensureRedisClient();
  if (client) {
    const payload = await client.get(`socket:session:${normalizedSessionId}`);
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch (_err) {
      return null;
    }
  }

  cleanupLocalSessions();
  const session = localSessionStore.get(normalizedSessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    localSessionStore.delete(normalizedSessionId);
    return null;
  }
  return session;
}

export async function allowFixedWindowRateLimit({ prefix, key, windowMs, maxRequests }) {
  const normalizedPrefix = String(prefix || 'ratelimit:socket').trim() || 'ratelimit:socket';
  const normalizedKey = String(key || 'unknown').trim() || 'unknown';
  const safeWindowMs = Math.max(1, Number(windowMs || 60_000));
  const safeMaxRequests = Math.max(1, Number(maxRequests || 1));
  const bucket = Math.floor(Date.now() / safeWindowMs);
  const client = await ensureRedisClient();

  if (client) {
    const redisKey = `${normalizedPrefix}:${bucket}:${normalizedKey}`;
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pExpire(redisKey, safeWindowMs + 1000);
    }
    if (count <= safeMaxRequests) {
      return { allowed: true, retryAfterMs: 0 };
    }
    const ttl = await client.pTTL(redisKey);
    return {
      allowed: false,
      retryAfterMs: ttl > 0 ? ttl : safeWindowMs
    };
  }

  cleanupLocalRateLimit(safeWindowMs);
  const localKey = `${normalizedPrefix}:${normalizedKey}`;
  const now = Date.now();
  const existing = localRateLimitStore.get(localKey);
  if (!existing || now - existing.windowStart >= safeWindowMs) {
    localRateLimitStore.set(localKey, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.count >= safeMaxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(safeWindowMs - (now - existing.windowStart), 0)
    };
  }
  existing.count += 1;
  localRateLimitStore.set(localKey, existing);
  return { allowed: true, retryAfterMs: 0 };
}

export async function getCachedJsonValue({ prefix, key }) {
  const normalizedPrefix = String(prefix || 'socket:cache').trim() || 'socket:cache';
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return null;

  const cacheKey = `${normalizedPrefix}:${normalizedKey}`;
  const client = await ensureRedisClient();
  if (client) {
    const payload = await client.get(cacheKey);
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch (_err) {
      return null;
    }
  }

  cleanupLocalJsonCache();
  const record = localJsonCacheStore.get(cacheKey);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    localJsonCacheStore.delete(cacheKey);
    return null;
  }
  return record.value;
}

export async function setCachedJsonValue({ prefix, key, value, ttlMs }) {
  const normalizedPrefix = String(prefix || 'socket:cache').trim() || 'socket:cache';
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return false;

  const cacheKey = `${normalizedPrefix}:${normalizedKey}`;
  const safeTtlMs = Math.max(1, Number(ttlMs || 60_000));
  const client = await ensureRedisClient();
  if (client) {
    await client.set(cacheKey, JSON.stringify(value), { PX: safeTtlMs });
    return true;
  }

  localJsonCacheStore.set(cacheKey, {
    value,
    expiresAt: Date.now() + safeTtlMs
  });
  return true;
}

export async function upsertOnlinePresence(socketId, payload, ttlMs = SOCKET_ONLINE_TTL_MS) {
  const normalizedSocketId = String(socketId || '').trim();
  if (!normalizedSocketId) return;

  const client = await ensureRedisClient();
  if (!client) return;

  const expiresAt = Date.now() + ttlMs;
  await client.multi()
    .set(`socket:online:${normalizedSocketId}`, JSON.stringify({
      ...payload,
      socketId: normalizedSocketId,
      expiresAt
    }), { PX: ttlMs })
    .zAdd('socket:online:index', [{ score: expiresAt, value: normalizedSocketId }])
    .exec();
}

export async function refreshOnlinePresence(entries, ttlMs = SOCKET_ONLINE_TTL_MS) {
  const client = await ensureRedisClient();
  if (!client || !Array.isArray(entries) || entries.length === 0) return;

  const expiresAt = Date.now() + ttlMs;
  const multi = client.multi();
  for (const entry of entries) {
    const normalizedSocketId = String(entry?.socketId || '').trim();
    if (!normalizedSocketId) continue;
    multi.set(`socket:online:${normalizedSocketId}`, JSON.stringify({
      ...entry,
      socketId: normalizedSocketId,
      expiresAt
    }), { PX: ttlMs });
    multi.zAdd('socket:online:index', [{ score: expiresAt, value: normalizedSocketId }]);
  }
  await multi.exec();
}

export async function removeOnlinePresence(socketId) {
  const normalizedSocketId = String(socketId || '').trim();
  if (!normalizedSocketId) return;

  const client = await ensureRedisClient();
  if (!client) return;

  await client.multi()
    .del(`socket:online:${normalizedSocketId}`)
    .zRem('socket:online:index', normalizedSocketId)
    .exec();
}

export async function getOnlinePresenceCount(localCount = 0) {
  const client = await ensureRedisClient();
  if (!client) return Number(localCount || 0);

  await cleanupExpiredOnlinePresence(client);
  return client.zCard('socket:online:index');
}

async function cleanupExpiredOnlinePresence(client) {
  const now = Date.now();
  await client.zRemRangeByScore('socket:online:index', '-inf', now);
}

export async function getOnlinePresenceEntries(localEntries = [], limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 50)));
  const client = await ensureRedisClient();
  if (!client) {
    return (Array.isArray(localEntries) ? localEntries : [])
      .slice()
      .sort((a, b) => Number(b?.connectedAt || 0) - Number(a?.connectedAt || 0))
      .slice(0, safeLimit);
  }

  await cleanupExpiredOnlinePresence(client);
  const socketIds = await client.zRange('socket:online:index', 0, safeLimit - 1);
  if (!Array.isArray(socketIds) || socketIds.length === 0) {
    return [];
  }

  const payloads = await client.mGet(socketIds.map((socketId) => `socket:online:${socketId}`));
  return payloads
    .map((payload) => {
      if (!payload) return null;
      try {
        return JSON.parse(payload);
      } catch (_err) {
        return null;
      }
    })
    .filter((item) => item && item.socketId)
    .sort((a, b) => Number(b?.connectedAt || 0) - Number(a?.connectedAt || 0))
    .slice(0, safeLimit);
}

export function getRedisHealthSnapshot() {
  const now = Date.now();
  const degradedUntil = redisDisabledUntil > now ? redisDisabledUntil : 0;
  return {
    enabled: redisEnabled,
    host: redisConfig.host,
    port: redisConfig.port,
    database: redisConfig.database,
    passwordConfigured: Boolean(redisConfig.password),
    connected: Boolean(redisClient?.isOpen),
    connecting: Boolean(redisConnectPromise),
    adapterConnecting: Boolean(adapterClientsPromise),
    adapterEnabled: socketIoAdapterEnabled,
    degradedUntil,
    mode: !redisEnabled
      ? 'disabled'
      : (redisClient?.isOpen
          ? (socketIoAdapterEnabled ? 'redis' : 'redis-no-adapter')
          : 'local-fallback')
  };
}
