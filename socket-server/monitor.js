import os from 'os';
import { db, getFallbackBufferStats, getFallbackRuntimeStats } from './database.js';
import { logger } from './logger.js';
import {
  getOnlinePresenceCount,
  getOnlinePresenceEntries,
  refreshOnlinePresence,
  removeOnlinePresence,
  upsertOnlinePresence
} from './redisState.js';

const onlineUsers = new Map();
const ONLINE_REFRESH_MS = 30_000;

export function getServerStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsagePercent = (100 - (totalIdle / totalTick) * 100).toFixed(2);

  const dbSize = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
  const dbSizeMB = (dbSize.size / 1024 / 1024).toFixed(2);
  const fallbackBuffer = getFallbackBufferStats();
  const fallbackRuntime = getFallbackRuntimeStats();

  return {
    online: true,
    memoryUsage: parseFloat(memUsagePercent),
    cpuUsage: parseFloat(cpuUsagePercent),
    dbSizeMB: parseFloat(dbSizeMB),
    messageCount: fallbackBuffer.messageCount,
    fallbackBuffer,
    fallbackRuntime,
    uptime: process.uptime(),
    timestamp: Date.now()
  };
}

function buildPresencePayload(socketId, record) {
  return {
    socketId,
    userId: record.userId,
    role: record.role,
    connectedAt: record.connectedAt
  };
}

export function addOnlineUser(socketId, userId, role) {
  const record = { userId, role, connectedAt: Date.now() };
  onlineUsers.set(socketId, record);
  void upsertOnlinePresence(socketId, buildPresencePayload(socketId, record));
}

export function removeOnlineUser(socketId) {
  onlineUsers.delete(socketId);
  void removeOnlinePresence(socketId);
}

function buildLocalPresenceEntries() {
  return Array.from(onlineUsers.entries()).map(([socketId, record]) => buildPresencePayload(socketId, record));
}

export async function getOnlineUsers(limit = 50) {
  return getOnlinePresenceEntries(buildLocalPresenceEntries(), limit);
}

export async function getOnlineCount() {
  return getOnlinePresenceCount(onlineUsers.size);
}

const refreshTimer = setInterval(() => {
  const entries = buildLocalPresenceEntries();
  void refreshOnlinePresence(entries).catch((err) => {
    logger.warn('socket-server online presence refresh failed:', err?.message || err);
  });
}, ONLINE_REFRESH_MS);

if (typeof refreshTimer.unref === 'function') {
  refreshTimer.unref();
}
