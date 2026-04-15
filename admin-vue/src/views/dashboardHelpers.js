export { extractErrorMessage } from '@infinitech/contracts'

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function parseTimestamp(value) {
  if (value === null || value === undefined || value === '') return 0
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function createDefaultImStats() {
  return {
    online: false,
    onlineUsers: 0,
    onlinePresenceSample: [],
    redis: {
      enabled: false,
      connected: false,
      connecting: false,
      adapterConnecting: false,
      adapterEnabled: false,
      mode: 'disabled',
      host: '',
      port: 0,
      database: 0
    },
    supportHistoryFallback: {
      enabled: false
    },
    memoryUsage: 0,
    cpuUsage: 0,
    dbSizeMB: 0,
    messageCount: 0,
    uptime: 0,
    timestamp: 0
  }
}

export function createDefaultStatsCards() {
  return [
    { key: 'customerCount', label: '注册用户', value: '--', tag: '用户', desc: '平台累计注册用户数' },
    { key: 'totalOrders', label: '总订单数', value: '--', tag: '订单', desc: '历史订单总量' },
    { key: 'todayOrders', label: '今日订单', value: '--', tag: '实时', desc: '今天新增订单总数' },
    { key: 'riderCount', label: '骑手总数', value: '--', tag: '运力', desc: '已入驻骑手规模' },
    { key: 'onlineRiderCount', label: '在线骑手', value: '--', tag: '在线', desc: '当前在线骑手数量' },
    { key: 'pendingOrdersCount', label: '待处理订单', value: '--', tag: '待办', desc: '等待处理或派发的订单' }
  ]
}

export function normalizeRefreshMinutes(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 10
  return Math.min(1440, Math.max(1, Math.floor(value)))
}

export function formatUptime(seconds) {
  const numeric = toFiniteNumber(seconds)
  if (numeric <= 0) return '--'

  const days = Math.floor(numeric / 86400)
  const hours = Math.floor((numeric % 86400) / 3600)
  const minutes = Math.floor((numeric % 3600) / 60)

  if (days > 0) return `${days}天 ${hours}小时`
  if (hours > 0) return `${hours}小时 ${minutes}分钟`
  return `${minutes}分钟`
}

export function getWeatherIconClass(icon) {
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
    '11': 'rain',
    '12': 'rain',
    '13': 'snow',
    '14': 'snow',
    '15': 'snow',
    '16': 'snow',
    '17': 'snow',
    '18': 'fog'
  }
  return iconMap[String(icon || '').trim()] || 'default'
}

export function getAqiClass(aqi) {
  const aqiNum = parseInt(aqi, 10)
  if (!Number.isFinite(aqiNum)) return ''
  if (aqiNum <= 50) return 'aqi-excellent'
  if (aqiNum <= 100) return 'aqi-good'
  if (aqiNum <= 150) return 'aqi-moderate'
  if (aqiNum <= 200) return 'aqi-unhealthy'
  return 'aqi-very-unhealthy'
}

export function getAqiText(aqi) {
  const aqiNum = parseInt(aqi, 10)
  if (!Number.isFinite(aqiNum)) return '未知'
  if (aqiNum <= 50) return '优'
  if (aqiNum <= 100) return '良'
  if (aqiNum <= 150) return '轻度污染'
  if (aqiNum <= 200) return '中度污染'
  return '重度污染'
}

export function formatUpdateTime(timeStr) {
  const timestamp = parseTimestamp(timeStr)
  if (!timestamp) return ''

  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMinutes < 1) return '刚刚更新'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function formatNumber(num) {
  const numeric = toFiniteNumber(num)
  if (Math.abs(numeric) >= 10000) {
    return `${(numeric / 10000).toFixed(1)}万`
  }
  return String(Math.floor(numeric))
}

export function getRankName(level, rankLevels = []) {
  const resolvedLevel = Array.isArray(rankLevels)
    ? rankLevels.find((item) => Number(item?.level) === Number(level))
    : null
  if (resolvedLevel?.name) {
    return resolvedLevel.name
  }

  const rankMap = {
    1: '青铜骑士',
    2: '白银骑士',
    3: '黄金骑士',
    4: '钻石骑士',
    5: '王者骑士',
    6: '传奇骑士'
  }
  return rankMap[level] || '青铜骑士'
}

export function getRankType(level) {
  if (level >= 6) return 'danger'
  if (level >= 5) return 'warning'
  if (level >= 4) return 'success'
  if (level >= 3) return 'primary'
  return 'info'
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

export function normalizeOnlinePresenceSample(sample) {
  if (!Array.isArray(sample)) return []

  return sample
    .map((entry, index) => {
      const socketId = String(entry?.socketId || '').trim()
      const userId = String(entry?.userId || '').trim()
      const role = String(entry?.role || '').trim().toLowerCase()
      const connectedAt = parseTimestamp(entry?.connectedAt)

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
    port: toFiniteNumber(health.port),
    database: toFiniteNumber(health.database)
  }
}

export function normalizeFallbackBuffer(raw) {
  const buffer = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: buffer.enabled === true,
    messageCount: Math.max(0, Math.floor(toFiniteNumber(buffer.messageCount))),
    chatCount: Math.max(0, Math.floor(toFiniteNumber(buffer.chatCount))),
    oldestTimestamp: Math.max(0, parseTimestamp(buffer.oldestTimestamp)),
    newestTimestamp: Math.max(0, parseTimestamp(buffer.newestTimestamp)),
    oldestAgeMs: Math.max(0, toFiniteNumber(buffer.oldestAgeMs)),
    newestAgeMs: Math.max(0, toFiniteNumber(buffer.newestAgeMs)),
    retentionDays: Math.max(0, Math.floor(toFiniteNumber(buffer.retentionDays))),
    perChatLimit: Math.max(0, Math.floor(toFiniteNumber(buffer.perChatLimit))),
    startupDisabledPurged: Math.max(0, Math.floor(toFiniteNumber(buffer.startupDisabledPurged))),
    startupExpiredPruned: Math.max(0, Math.floor(toFiniteNumber(buffer.startupExpiredPruned))),
    startupOverflowPruned: Math.max(0, Math.floor(toFiniteNumber(buffer.startupOverflowPruned))),
    lastMaintenanceAt: Math.max(0, parseTimestamp(buffer.lastMaintenanceAt))
  }
}

export function formatAgeFromMs(diffMs) {
  const numeric = toFiniteNumber(diffMs)
  if (numeric <= 0) return '无记录'

  const minutes = Math.floor(numeric / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

export function formatBufferAge(timestamp) {
  const numeric = parseTimestamp(timestamp)
  if (!numeric) return '无记录'
  return formatAgeFromMs(Math.max(Date.now() - numeric, 0))
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
    return '当前未启用 Redis，在线态和跨实例广播不会共享。'
  }
  if (redis.connected && redis.adapterEnabled) {
    return 'Redis 和 Socket.IO Redis Adapter 都已启用，可支持多实例共享在线态与广播。'
  }
  if (redis.connected && !redis.adapterEnabled) {
    return 'Redis 已连接，但 Socket.IO Redis Adapter 未启用，广播仍可能退回单实例。'
  }
  if (redis.connecting || redis.adapterConnecting) {
    return 'Redis 正在连接中，请稍后再观察广播状态。'
  }
  return 'Redis 未就绪，实时服务当前处于单机回退模式。'
}

export function formatPresenceConnectedAt(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return '连接时间未知'

  const diffMs = Date.now() - timestamp
  if (diffMs < 60000) return '刚刚连接'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${minutes} 分钟前连接`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前连接`

  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hh}:${mm}`
}
