import os from 'os';
import { db } from './database.js';

// 获取服务器状态
export function getServerStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsagePercent = (100 - (totalIdle / totalTick) * 100).toFixed(2);

  // 数据库大小
  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
  const dbSizeMB = (dbSize.size / 1024 / 1024).toFixed(2);

  // 消息统计
  const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;

  return {
    online: true,
    memoryUsage: parseFloat(memUsagePercent),
    cpuUsage: parseFloat(cpuUsagePercent),
    dbSizeMB: parseFloat(dbSizeMB),
    messageCount,
    uptime: process.uptime(),
    timestamp: Date.now()
  };
}

// 在线用户管理
const onlineUsers = new Map();

export function addOnlineUser(socketId, userId, role) {
  onlineUsers.set(socketId, { userId, role, connectedAt: Date.now() });
}

export function removeOnlineUser(socketId) {
  onlineUsers.delete(socketId);
}

export function getOnlineUsers() {
  return Array.from(onlineUsers.values());
}

export function getOnlineCount() {
  return onlineUsers.size;
}
