export function createDefaultImStats() {
  return {
    online: false,
    onlineUsers: 0,
    onlinePresenceSample: [],
    fallbackBuffer: {
      messageCount: 0,
      chatCount: 0,
      oldestTimestamp: 0,
      newestTimestamp: 0,
      retentionDays: 30,
      perChatLimit: 500,
      startupExpiredPruned: 0,
      startupOverflowPruned: 0,
      lastMaintenanceAt: 0
    },
    fallbackRuntime: {
      conversationListFallbackCount: 0,
      messageHistoryFallbackCount: 0,
      historyRefreshWriteCount: 0,
      historyRefreshMessageCount: 0,
      lastConversationListFallbackAt: 0,
      lastMessageHistoryFallbackAt: 0,
      lastHistoryRefreshWriteAt: 0
    },
    redis: {
      enabled: false,
      connected: false,
      adapterEnabled: false,
      mode: 'disabled'
    },
    memoryUsage: 0,
    cpuUsage: 0,
    dbSizeMB: 0,
    messageCount: 0,
    uptime: 0
  }
}

export function createDefaultStatsCards() {
  return [
    { label: '注册客户', value: '--', tag: '用户', desc: '平台总用户数' },
    { label: '总订单数', value: '--', tag: '订单', desc: '历史订单总量' },
    { label: '今日订单', value: '--', tag: '实时', desc: '今日累计' },
    { label: '员工总数', value: '--', tag: '员工', desc: '配送团队规模' },
    { label: '在线骑手', value: '--', tag: '在线', desc: '当前在线人数' },
    { label: '待接单', value: '--', tag: '待办', desc: '待接订单量' }
  ]
}

export function extractErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback
}

export function normalizeRefreshMinutes(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 10
  return Math.min(1440, Math.max(1, Math.floor(value)))
}

export function formatUptime(seconds) {
  if (!seconds) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

export function getWeatherIconClass(icon) {
  if (!icon) return 'default'
  const iconMap = {
    '00': 'sunny',
    '01': 'sunny',
    '02': 'partly-cloudy',
    '03': 'cloudy',
    '04': 'cloudy',
    '07': 'rain',
    '08': 'rain',
    '09': 'rain',
    '10': 'rain-sun',
    '18': 'snow'
  }
  return iconMap[icon] || 'default'
}

export function getAqiClass(aqi) {
  const aqiNum = parseInt(aqi, 10)
  if (aqiNum <= 50) return 'aqi-excellent'
  if (aqiNum <= 100) return 'aqi-good'
  if (aqiNum <= 150) return 'aqi-moderate'
  if (aqiNum <= 200) return 'aqi-unhealthy'
  return 'aqi-very-unhealthy'
}

export function getAqiText(aqi) {
  const aqiNum = parseInt(aqi, 10)
  if (aqiNum <= 50) return '优'
  if (aqiNum <= 100) return '良'
  if (aqiNum <= 150) return '轻度污染'
  if (aqiNum <= 200) return '中度污染'
  return '重度污染'
}

export function formatUpdateTime(timeStr) {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000 / 60)

    if (diff < 1) return '刚刚更新'
    if (diff < 60) return `${diff}分钟前`

    const hours = Math.floor(diff / 60)
    if (hours < 24) return `${hours}小时前`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours2 = String(date.getHours()).padStart(2, '0')
    const minutes2 = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours2}:${minutes2}`
  } catch (_error) {
    return timeStr
  }
}

export function formatNumber(num) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return String(num)
}

export function getRankName(level) {
  const ranks = {
    1: '青铜骑士',
    2: '白银骑士',
    3: '黄金骑士',
    4: '钻石骑士',
    5: '王者骑士',
    6: '传奇大佬'
  }
  return ranks[level] || '青铜骑士'
}

export function getRankType(level) {
  if (level >= 6) return 'danger'
  if (level >= 5) return 'warning'
  if (level >= 4) return 'success'
  if (level >= 3) return 'primary'
  return 'info'
}

function parsePresenceTimestamp(value) {
  if (value === null || value === undefined || value === '') return 0
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeOnlinePresenceSample(sample) {
  if (!Array.isArray(sample)) return []

  return sample
    .map((entry, index) => {
      const socketId = String(entry?.socketId || '').trim()
      const userId = String(entry?.userId || '').trim()
      const role = String(entry?.role || '').trim().toLowerCase()
      const connectedAt = parsePresenceTimestamp(entry?.connectedAt)

      return {
        key: socketId || `${role || 'unknown'}-${userId || 'anonymous'}-${index}`,
        socketId,
        socketLabel: socketId ? `${socketId.slice(0, 6)}...${socketId.slice(-4)}` : '未知连接',
        userId,
        userLabel: userId || '匿名连接',
        role,
        roleLabel: formatPresenceRole(role),
        connectedAt
      }
    })
    .sort((a, b) => b.connectedAt - a.connectedAt)
}

export function normalizeRedisHealth(raw) {
  const health = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: health.enabled === true,
    connected: health.connected === true,
    connecting: health.connecting === true,
    adapterConnecting: health.adapterConnecting === true,
    adapterEnabled: health.adapterEnabled === true,
    mode: String(health.mode || (health.enabled ? 'local-fallback' : 'disabled')).trim() || 'disabled',
    host: String(health.host || '').trim(),
    port: Number.isFinite(Number(health.port)) ? Number(health.port) : 0,
    database: Number.isFinite(Number(health.database)) ? Number(health.database) : 0
  }
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function normalizeFallbackBuffer(raw) {
  const buffer = raw && typeof raw === 'object' ? raw : {}
  return {
    messageCount: Math.max(0, Math.floor(toFiniteNumber(buffer.messageCount))),
    chatCount: Math.max(0, Math.floor(toFiniteNumber(buffer.chatCount))),
    oldestTimestamp: Math.max(0, toFiniteNumber(buffer.oldestTimestamp)),
    newestTimestamp: Math.max(0, toFiniteNumber(buffer.newestTimestamp)),
    retentionDays: Math.max(1, Math.floor(toFiniteNumber(buffer.retentionDays, 30))),
    perChatLimit: Math.max(1, Math.floor(toFiniteNumber(buffer.perChatLimit, 500))),
    startupExpiredPruned: Math.max(0, Math.floor(toFiniteNumber(buffer.startupExpiredPruned))),
    startupOverflowPruned: Math.max(0, Math.floor(toFiniteNumber(buffer.startupOverflowPruned))),
    lastMaintenanceAt: Math.max(0, toFiniteNumber(buffer.lastMaintenanceAt))
  }
}

export function normalizeFallbackRuntime(raw) {
  const runtime = raw && typeof raw === 'object' ? raw : {}
  return {
    conversationListFallbackCount: Math.max(0, Math.floor(toFiniteNumber(runtime.conversationListFallbackCount))),
    messageHistoryFallbackCount: Math.max(0, Math.floor(toFiniteNumber(runtime.messageHistoryFallbackCount))),
    historyRefreshWriteCount: Math.max(0, Math.floor(toFiniteNumber(runtime.historyRefreshWriteCount))),
    historyRefreshMessageCount: Math.max(0, Math.floor(toFiniteNumber(runtime.historyRefreshMessageCount))),
    lastConversationListFallbackAt: Math.max(0, toFiniteNumber(runtime.lastConversationListFallbackAt)),
    lastMessageHistoryFallbackAt: Math.max(0, toFiniteNumber(runtime.lastMessageHistoryFallbackAt)),
    lastHistoryRefreshWriteAt: Math.max(0, toFiniteNumber(runtime.lastHistoryRefreshWriteAt))
  }
}

export function formatBufferAge(timestamp) {
  const numeric = toFiniteNumber(timestamp)
  if (!numeric || numeric <= 0) return '无记录'

  const diffMs = Math.max(Date.now() - numeric, 0)
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} 天前`
}

export function getRedisModeLabel(mode) {
  switch (String(mode || '').trim()) {
    case 'redis':
      return 'Redis 共享广播'
    case 'redis-no-adapter':
      return 'Redis 已连接，Adapter 未启用'
    case 'local-fallback':
      return '单机回退模式'
    case 'disabled':
    default:
      return 'Redis 未启用'
  }
}

export function getRedisModeTagType(mode) {
  switch (String(mode || '').trim()) {
    case 'redis':
      return 'success'
    case 'redis-no-adapter':
      return 'warning'
    case 'local-fallback':
      return 'danger'
    case 'disabled':
    default:
      return 'info'
  }
}

export function getRedisModeHint(redisHealth) {
  const redis = normalizeRedisHealth(redisHealth)
  if (!redis.enabled) {
    return '当前未启用 Redis，共享在线态与跨实例广播不会生效。'
  }
  if (redis.connected && redis.adapterEnabled) {
    return 'Redis 与 Socket.IO Redis adapter 都已启用，可支持多实例共享在线态与跨实例广播。'
  }
  if (redis.connected && !redis.adapterEnabled) {
    return 'Redis 已连接，但 Socket.IO Redis adapter 未启用，当前广播仍可能退回单实例。'
  }
  return 'Redis 未就绪，实时服务当前处于单机回退模式。'
}

export function formatPresenceRole(role) {
  const roleMap = {
    admin: '管理员',
    support: '客服',
    merchant: '商家',
    rider: '骑手',
    user: '用户',
    customer: '用户'
  }
  return roleMap[String(role || '').trim().toLowerCase()] || '未知角色'
}

export function formatPresenceConnectedAt(value) {
  const timestamp = parsePresenceTimestamp(value)
  if (!timestamp) return '连接时间未知'

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes <= 0) return '刚刚连接'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前连接`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前连接`

  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}
