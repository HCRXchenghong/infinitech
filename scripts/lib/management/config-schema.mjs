import fs from 'node:fs'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { normalizeBoolean, normalizeDomain } from './utils.mjs'

const schemaCache = new Map()

const GROUP_ORDER = [
  '基础部署',
  '初始化与安全',
  '域名与反代',
  '端口与网络',
  '数据库与 Redis',
  '管理端与登录',
  '支付配置',
  '推送与通知',
  'Socket / RTC',
  '性能与限流',
  '日志与调试',
  '高级与兼容',
]

const COMMON_ENV_METADATA = {
  ENV: { label: '运行环境', group: '基础部署', type: 'string', description: '控制容器运行环境标识。', common: true },
  LOG_LEVEL: { label: '日志级别', group: '日志与调试', type: 'string', description: '统一日志输出级别。', common: true },
  JWT_SECRET: { label: 'JWT 密钥', group: '管理端与登录', type: 'secret', description: 'Go API 鉴权密钥。', common: true },
  JWT_EXPIRES_IN: { label: 'JWT 有效期', group: '管理端与登录', type: 'string', description: '登录令牌过期时间。', common: true },
  ADMIN_TOKEN_SECRET: { label: '管理端 Token 密钥', group: '管理端与登录', type: 'secret', description: 'BFF 管理端令牌密钥。', common: true },
  ADMIN_QR_LOGIN_SECRET: { label: '管理端二维码登录密钥', group: '管理端与登录', type: 'secret', description: '管理员二维码登录签名密钥。', common: true },
  SOCKET_SERVER_API_SECRET: { label: 'Socket Server API 密钥', group: '管理端与登录', type: 'secret', description: 'Socket 服务间鉴权密钥。', common: true },
  BOOTSTRAP_ADMIN_PHONE: { label: '初始化管理员手机号', group: '初始化与安全', type: 'phone', description: '空库首次登录用管理员手机号。', common: true },
  BOOTSTRAP_ADMIN_NAME: { label: '初始化管理员名称', group: '初始化与安全', type: 'string', description: '空库首次登录用管理员名称。', common: true },
  BOOTSTRAP_ADMIN_PASSWORD: { label: '初始化管理员密码', group: '初始化与安全', type: 'secret', description: '空库首次登录用管理员密码。', common: true },
  SYSTEM_LOG_DELETE_ACCOUNT: { label: '系统日志验证账号', group: '初始化与安全', type: 'string', description: '系统日志敏感操作二次验证账号。', common: true },
  SYSTEM_LOG_DELETE_PASSWORD: { label: '系统日志验证密码', group: '初始化与安全', type: 'secret', description: '系统日志敏感操作二次验证密码。', common: true },
  CLEAR_ALL_DATA_VERIFY_ACCOUNT: { label: '全量清空验证账号', group: '初始化与安全', type: 'string', description: '清空全量数据二次验证账号。', common: true },
  CLEAR_ALL_DATA_VERIFY_PASSWORD: { label: '全量清空验证密码', group: '初始化与安全', type: 'secret', description: '清空全量数据二次验证密码。', common: true },
  PUBLIC_DOMAIN: { label: '官网域名', group: '域名与反代', type: 'domain', description: '官网前台域名，同时承载官网公开接口。', common: true },
  ADMIN_DOMAIN: { label: '后台域名', group: '域名与反代', type: 'domain', description: '后台管理域名。', common: true },
  CADDY_EMAIL: { label: '证书邮箱', group: '域名与反代', type: 'email', description: 'Caddy ACME 证书邮箱。', common: true },
  REVERSE_PROXY_HTTP_PORT: { label: '反代 HTTP 端口', group: '域名与反代', type: 'port', description: 'Caddy 暴露的 HTTP 端口。', common: true },
  REVERSE_PROXY_HTTPS_PORT: { label: '反代 HTTPS 端口', group: '域名与反代', type: 'port', description: 'Caddy 暴露的 HTTPS 端口。', common: true },
  ALLOWED_ORIGINS: { label: '允许跨域来源', group: '域名与反代', type: 'string', description: '前后端跨域来源列表。', common: true },
  ADMIN_WEB_HOST_PORT: { label: '后台 Web 端口', group: '端口与网络', type: 'port', description: '后台站点宿主机端口。', common: true },
  SITE_WEB_HOST_PORT: { label: '官网 Web 端口', group: '端口与网络', type: 'port', description: '官网站点宿主机端口。', common: true },
  INVITE_WEB_HOST_PORT: { label: '邀请页端口', group: '端口与网络', type: 'port', description: '邀请页宿主机端口。', common: true },
  BFF_HOST_PORT: { label: 'BFF 端口', group: '端口与网络', type: 'port', description: 'BFF 宿主机端口。', common: true },
  GO_API_HOST_PORT: { label: 'Go API 端口', group: '端口与网络', type: 'port', description: 'Go API 宿主机端口。', common: true },
  SOCKET_HOST_PORT: { label: 'Socket 端口', group: '端口与网络', type: 'port', description: 'Socket 服务宿主机端口。', common: true },
  POSTGRES_HOST_PORT: { label: 'PostgreSQL 端口', group: '端口与网络', type: 'port', description: '数据库宿主机端口。', common: true },
  REDIS_HOST_PORT: { label: 'Redis 端口', group: '端口与网络', type: 'port', description: 'Redis 宿主机端口。', common: true },
  ALIPAY_SIDECAR_HOST_PORT: { label: '支付宝 Sidecar 端口', group: '端口与网络', type: 'port', description: '支付宝 sidecar 宿主机端口。', common: true },
  BANK_PAYOUT_SIDECAR_HOST_PORT: { label: '银行卡 Sidecar 端口', group: '端口与网络', type: 'port', description: '银行卡 sidecar 宿主机端口。', common: true },
  DB_MAX_OPEN_CONNS: { label: 'DB 最大连接数', group: '数据库与 Redis', type: 'integer', description: 'Go API 数据库最大打开连接数。', common: true },
  DB_MAX_IDLE_CONNS: { label: 'DB 空闲连接数', group: '数据库与 Redis', type: 'integer', description: 'Go API 数据库最大空闲连接数。', common: true },
  DB_CONN_MAX_LIFETIME_MINUTES: { label: 'DB 连接最长寿命', group: '数据库与 Redis', type: 'integer', description: 'Go API 数据库连接寿命（分钟）。', common: true },
  DB_CONN_MAX_IDLE_TIME_MINUTES: { label: 'DB 连接空闲寿命', group: '数据库与 Redis', type: 'integer', description: 'Go API 数据库连接空闲寿命（分钟）。', common: true },
  POSTGRES_USER: { label: 'PostgreSQL 用户', group: '数据库与 Redis', type: 'string', description: '数据库用户名。', common: true },
  POSTGRES_PASSWORD: { label: 'PostgreSQL 密码', group: '数据库与 Redis', type: 'secret', description: '数据库密码。', common: true },
  POSTGRES_DB: { label: 'PostgreSQL 数据库名', group: '数据库与 Redis', type: 'string', description: '数据库名称。', common: true },
  REDIS_PASSWORD: { label: 'Redis 密码', group: '数据库与 Redis', type: 'secret', description: 'Redis 密码。', common: true },
  REDIS_DB: { label: 'Redis DB', group: '数据库与 Redis', type: 'integer', description: 'Redis 逻辑库。', common: true },
  REDIS_REQUIRED: { label: 'Redis 必需', group: '数据库与 Redis', type: 'boolean', description: 'Go API 是否强依赖 Redis。', common: true },
  ADMIN_WEB_BASE_URL: { label: '后台 Web Base URL', group: '管理端与登录', type: 'url', description: 'BFF 使用的后台前端入口。', common: true },
  SITE_WEB_BASE_URL: { label: '官网 Base URL', group: '管理端与登录', type: 'url', description: 'BFF 使用的官网入口。', common: true },
  PUBLIC_LANDING_BASE_URL: { label: '业务落地页 Base URL', group: '管理端与登录', type: 'url', description: '业务落地页入口。', common: true },
  ONBOARDING_INVITE_BASE_URL: { label: '入驻邀请 Base URL', group: '管理端与登录', type: 'url', description: '入驻邀请入口。', common: true },
  COUPON_CLAIM_LINK_BASE_URL: { label: '领券链接 Base URL', group: '管理端与登录', type: 'url', description: '优惠券领取入口。', common: true },
  ALIPAY_SANDBOX: { label: '支付宝沙箱模式', group: '支付配置', type: 'boolean', description: '是否启用支付宝沙箱。', common: true },
  ALIPAY_APP_ID: { label: '支付宝 App ID', group: '支付配置', type: 'string', description: '支付宝应用 ID。', common: true },
  ALIPAY_PRIVATE_KEY: { label: '支付宝私钥', group: '支付配置', type: 'secret', description: '支付宝签名私钥。', common: true },
  ALIPAY_PUBLIC_KEY: { label: '支付宝公钥', group: '支付配置', type: 'secret', description: '支付宝平台公钥。', common: true },
  ALIPAY_NOTIFY_URL: { label: '支付宝回调地址', group: '支付配置', type: 'url', description: '支付宝支付通知地址。', common: true },
  WXPAY_APP_ID: { label: '微信支付 App ID', group: '支付配置', type: 'string', description: '微信支付应用 ID。', common: true },
  WXPAY_MCH_ID: { label: '微信商户号', group: '支付配置', type: 'string', description: '微信支付商户号。', common: true },
  WXPAY_API_KEY: { label: '微信 API Key', group: '支付配置', type: 'secret', description: '微信支付 API Key。', common: true },
  WXPAY_API_V3_KEY: { label: '微信 API V3 Key', group: '支付配置', type: 'secret', description: '微信支付 API V3 Key。', common: true },
  WXPAY_SERIAL_NO: { label: '微信证书序列号', group: '支付配置', type: 'secret', description: '微信支付平台证书序列号。', common: true },
  WXPAY_PRIVATE_KEY: { label: '微信私钥', group: '支付配置', type: 'secret', description: '微信支付私钥。', common: true },
  WXPAY_NOTIFY_URL: { label: '微信支付回调地址', group: '支付配置', type: 'url', description: '微信支付通知地址。', common: true },
  WXPAY_REFUND_NOTIFY_URL: { label: '微信退款回调地址', group: '支付配置', type: 'url', description: '微信退款通知地址。', common: true },
  WXPAY_PAYOUT_NOTIFY_URL: { label: '微信零钱发放回调地址', group: '支付配置', type: 'url', description: '微信零钱发放通知地址。', common: true },
  PUSH_DISPATCH_ENABLED: { label: '推送分发开关', group: '推送与通知', type: 'boolean', description: '是否启用推送分发。', common: true },
  PUSH_DISPATCH_PROVIDER: { label: '推送分发通道', group: '推送与通知', type: 'string', description: '推送通道类型。', common: true },
  PUSH_DISPATCH_WEBHOOK_URL: { label: '推送 Webhook URL', group: '推送与通知', type: 'url', description: '推送 webhook 地址。', common: true },
  PUSH_DISPATCH_WEBHOOK_SECRET: { label: '推送 Webhook 密钥', group: '推送与通知', type: 'secret', description: '推送 webhook 鉴权密钥。', common: true },
  PUSH_DISPATCH_WEBHOOK_AUTH_HEADER: { label: '推送鉴权 Header', group: '推送与通知', type: 'string', description: '推送 webhook 鉴权头名称。', common: true },
  PUSH_DISPATCH_WEBHOOK_AUTH_VALUE: { label: '推送鉴权 Header 值', group: '推送与通知', type: 'secret', description: '推送 webhook 鉴权头值。', common: true },
  PUSH_DISPATCH_FCM_PROJECT_ID: { label: 'FCM 项目 ID', group: '推送与通知', type: 'string', description: 'Firebase 项目 ID。', common: true },
  PUSH_DISPATCH_FCM_CLIENT_EMAIL: { label: 'FCM Client Email', group: '推送与通知', type: 'string', description: 'Firebase 服务账号邮箱。', common: true },
  PUSH_DISPATCH_FCM_PRIVATE_KEY: { label: 'FCM 私钥', group: '推送与通知', type: 'secret', description: 'Firebase 服务账号私钥。', common: true },
  PUSH_DISPATCH_FCM_TOKEN_URL: { label: 'FCM Token URL', group: '推送与通知', type: 'url', description: 'Firebase token endpoint。', common: true },
  PUSH_DISPATCH_FCM_API_BASE_URL: { label: 'FCM API Base URL', group: '推送与通知', type: 'url', description: 'Firebase API base URL。', common: true },
  PUSH_READY_MAX_QUEUE: { label: '推送就绪队列上限', group: '推送与通知', type: 'integer', description: '推送 ready 队列最大长度。', common: true },
  PUSH_READY_MAX_QUEUE_AGE_SECONDS: { label: '推送队列最长年龄', group: '推送与通知', type: 'integer', description: '推送队列最长保留秒数。', common: true },
  SOCKET_HTTP_REQUEST_TIMEOUT_MS: { label: 'Socket HTTP 请求超时', group: 'Socket / RTC', type: 'integer', description: 'Socket HTTP 请求超时。', common: true },
  SOCKET_HTTP_HEADERS_TIMEOUT_MS: { label: 'Socket Header 超时', group: 'Socket / RTC', type: 'integer', description: 'Socket HTTP headers 超时。', common: true },
  SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS: { label: 'Socket Keep-Alive 超时', group: 'Socket / RTC', type: 'integer', description: 'Socket HTTP keep-alive 超时。', common: true },
  SOCKET_HTTP_RATE_LIMIT_WINDOW_MS: { label: 'Socket 限流窗口', group: 'Socket / RTC', type: 'integer', description: 'Socket HTTP 限流窗口。', common: true },
  SOCKET_HTTP_RATE_LIMIT_MAX: { label: 'Socket 限流阈值', group: 'Socket / RTC', type: 'integer', description: 'Socket HTTP 限流阈值。', common: true },
  SOCKET_HTTP_SLOW_REQUEST_WARN_MS: { label: 'Socket 慢请求阈值', group: 'Socket / RTC', type: 'integer', description: 'Socket 慢请求报警阈值。', common: true },
  SOCKET_JSON_BODY_LIMIT_BYTES: { label: 'Socket JSON 限制', group: 'Socket / RTC', type: 'integer', description: 'Socket JSON body 限制。', common: true },
  SOCKET_UPLOAD_LIMIT_BYTES: { label: 'Socket 上传限制', group: 'Socket / RTC', type: 'integer', description: 'Socket 上传体积限制。', common: true },
  SOCKET_PING_TIMEOUT_MS: { label: 'Socket Ping Timeout', group: 'Socket / RTC', type: 'integer', description: 'Socket ping timeout。', common: true },
  SOCKET_PING_INTERVAL_MS: { label: 'Socket Ping Interval', group: 'Socket / RTC', type: 'integer', description: 'Socket ping interval。', common: true },
  SOCKET_MAX_HTTP_BUFFER_BYTES: { label: 'Socket Buffer 限制', group: 'Socket / RTC', type: 'integer', description: 'Socket 最大 buffer 限制。', common: true },
  SOCKET_RTC_RING_TIMEOUT_SECONDS: { label: 'RTC 振铃超时', group: 'Socket / RTC', type: 'integer', description: 'RTC 振铃超时秒数。', common: true },
  RTC_RECORDING_RETENTION_HOURS: { label: 'RTC 录制保留小时数', group: 'Socket / RTC', type: 'integer', description: 'RTC 录制保留时长。', common: true },
  RTC_RETENTION_CLEANUP_ENABLED: { label: 'RTC 清理开关', group: 'Socket / RTC', type: 'boolean', description: 'RTC 清理是否启用。', common: true },
  RTC_RETENTION_CLEANUP_SECONDS: { label: 'RTC 清理周期', group: 'Socket / RTC', type: 'integer', description: 'RTC 清理周期秒数。', common: true },
  RTC_RETENTION_CLEANUP_BATCH_SIZE: { label: 'RTC 清理批次大小', group: 'Socket / RTC', type: 'integer', description: 'RTC 清理批次大小。', common: true },
  HTTP_SLOW_REQUEST_WARN_MS: { label: 'Go API 慢请求阈值', group: '性能与限流', type: 'integer', description: 'Go API 慢请求报警阈值。', common: true },
  BFF_API_RATE_LIMIT_WINDOW_MS: { label: 'BFF 限流窗口', group: '性能与限流', type: 'integer', description: 'BFF API 限流窗口。', common: true },
  BFF_API_RATE_LIMIT_MAX: { label: 'BFF 限流阈值', group: '性能与限流', type: 'integer', description: 'BFF API 限流最大请求数。', common: true },
  BFF_REDIS_RATE_LIMIT_ENABLED: { label: 'BFF Redis 限流开关', group: '性能与限流', type: 'boolean', description: 'BFF Redis 限流是否启用。', common: true },
  BFF_REDIS_RATE_LIMIT_PREFIX: { label: 'BFF Redis 限流前缀', group: '性能与限流', type: 'string', description: 'BFF Redis 限流 key 前缀。', common: true },
  BFF_REDIS_RATE_LIMIT_CONNECT_TIMEOUT_MS: { label: 'BFF 限流 Redis 超时', group: '性能与限流', type: 'integer', description: 'BFF 限流 Redis 连接超时。', common: true },
  BFF_JSON_LIMIT_BYTES: { label: 'BFF JSON 限制', group: '性能与限流', type: 'integer', description: 'BFF JSON body 限制。', common: true },
  BFF_URLENCODED_LIMIT_BYTES: { label: 'BFF Form 限制', group: '性能与限流', type: 'integer', description: 'BFF x-www-form-urlencoded 限制。', common: true },
  BFF_UPLOAD_MAX_FILE_SIZE_BYTES: { label: 'BFF 上传文件大小上限', group: '性能与限流', type: 'integer', description: 'BFF 上传文件大小上限。', common: true },
  BFF_UPLOAD_MAX_FIELD_SIZE_BYTES: { label: 'BFF 上传字段大小上限', group: '性能与限流', type: 'integer', description: 'BFF 上传字段大小上限。', common: true },
  BFF_UPLOAD_MAX_FILES: { label: 'BFF 上传文件数上限', group: '性能与限流', type: 'integer', description: 'BFF 上传文件数上限。', common: true },
  BFF_REQUEST_TIMEOUT_MS: { label: 'BFF 请求超时', group: '性能与限流', type: 'integer', description: 'BFF 请求超时。', common: true },
  BFF_HEADERS_TIMEOUT_MS: { label: 'BFF Header 超时', group: '性能与限流', type: 'integer', description: 'BFF headers 超时。', common: true },
  BFF_KEEP_ALIVE_TIMEOUT_MS: { label: 'BFF Keep-Alive 超时', group: '性能与限流', type: 'integer', description: 'BFF keep-alive 超时。', common: true },
  BFF_SLOW_REQUEST_WARN_MS: { label: 'BFF 慢请求阈值', group: '性能与限流', type: 'integer', description: 'BFF 慢请求报警阈值。', common: true },
  BFF_READY_REQUIRE_SOCKET: { label: 'BFF Ready 依赖 Socket', group: '性能与限流', type: 'boolean', description: 'BFF ready 检查是否要求 Socket 就绪。', common: true },
}

function deriveType(key, explicitType) {
  if (explicitType) {
    return explicitType
  }
  if (/_HOST_PORT$/.test(key) || /^REVERSE_PROXY_(HTTP|HTTPS)_PORT$/.test(key)) {
    return 'port'
  }
  if (/_URL$/.test(key) || /_BASE_URL$/.test(key)) {
    return 'url'
  }
  if (/_DOMAIN$/.test(key)) {
    return 'domain'
  }
  if (/_EMAIL$/.test(key)) {
    return 'email'
  }
  if (/(ENABLED|ALLOW|SANDBOX|REQUIRED)$/i.test(key)) {
    return 'boolean'
  }
  if (/(SECONDS|MINUTES|HOURS|LIMIT|WINDOW|QUEUE|COUNT|SIZE|FILES|CONNS|TIMEOUT|BATCH)$/i.test(key)) {
    return 'integer'
  }
  if (/PHONE$/.test(key)) {
    return 'phone'
  }
  if (/(PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY|SERIAL_NO)/.test(key)) {
    return 'secret'
  }
  return 'string'
}

function isSensitive(key, explicitType) {
  return explicitType === 'secret' || /(PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY|SERIAL_NO)/.test(key)
}

function parseComposeMetadata(repoRoot = repoRootFallback) {
  const { composeFile } = getManagementPaths(repoRoot)
  const content = fs.readFileSync(composeFile, 'utf8')
  const defaults = new Map()
  const required = new Map()
  const variableServices = new Map()
  let currentService = ''
  let inServices = false

  for (const line of content.split(/\r?\n/)) {
    if (/^services:\s*$/.test(line)) {
      inServices = true
      continue
    }
    if (/^(volumes|networks):\s*$/.test(line)) {
      inServices = false
      currentService = ''
      continue
    }
    if (inServices) {
      const serviceMatch = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/)
      if (serviceMatch) {
        currentService = serviceMatch[1]
      }
    }

    const matches = [...line.matchAll(/\$\{([A-Z0-9_]+)(?:(:-|:\?)([^}]*))?\}/g)]
    for (const match of matches) {
      const key = match[1]
      const operator = match[2] ?? ''
      const hint = match[3] ?? ''
      if (!defaults.has(key)) {
        defaults.set(key, operator === ':-' ? hint : '')
      }
      if (operator === ':?' && !required.has(key)) {
        required.set(key, hint)
      }
      if (currentService) {
        const services = variableServices.get(key) || new Set()
        services.add(currentService)
        variableServices.set(key, services)
      }
    }
  }

  return {
    defaults,
    required,
    variableServices,
  }
}

function buildMeta(key, composeMetadata) {
  const common = COMMON_ENV_METADATA[key] || {}
  const type = deriveType(key, common.type)
  const services = Array.from(composeMetadata.variableServices.get(key) || []).sort()

  return {
    key,
    label: common.label || key,
    group: common.group || '高级与兼容',
    type,
    sensitive: isSensitive(key, common.type),
    common: Boolean(common.common),
    defaultHint: composeMetadata.defaults.get(key) ?? '',
    required: composeMetadata.required.has(key),
    requiredHint: composeMetadata.required.get(key) ?? '',
    affectedServices: services,
    description: common.description || '',
  }
}

export function buildConfigSchema(repoRoot = repoRootFallback) {
  const cacheKey = repoRoot
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)
  }

  const composeMetadata = parseComposeMetadata(repoRoot)
  const keys = Array.from(new Set([
    ...Object.keys(COMMON_ENV_METADATA),
    ...composeMetadata.defaults.keys(),
    ...composeMetadata.required.keys(),
    ...composeMetadata.variableServices.keys(),
  ])).sort()
  const schema = keys.map((key) => buildMeta(key, composeMetadata))
  schemaCache.set(cacheKey, schema)
  return schema
}

export function getConfigMeta(key, repoRoot = repoRootFallback) {
  return buildConfigSchema(repoRoot).find((item) => item.key === key) || null
}

export function listConfigGroups(repoRoot = repoRootFallback) {
  const groups = new Set(buildConfigSchema(repoRoot).map((item) => item.group))
  return GROUP_ORDER.filter((group) => groups.has(group))
}

export function listCommonConfigByGroup(repoRoot = repoRootFallback) {
  const grouped = new Map()
  for (const item of buildConfigSchema(repoRoot)) {
    if (!item.common) {
      continue
    }
    const groupItems = grouped.get(item.group) || []
    groupItems.push(item)
    grouped.set(item.group, groupItems)
  }
  return GROUP_ORDER
    .filter((group) => grouped.has(group))
    .map((group) => ({
      group,
      items: grouped.get(group).sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN')),
    }))
}

function validatePhone(value) {
  return /^1\d{10}$/.test(String(value || '').trim())
}

function validateDomain(value) {
  const text = normalizeDomain(value)
  if (!text) {
    return false
  }
  if (text === 'localhost' || text.endsWith('.localhost')) {
    return true
  }
  return /^[a-zA-Z0-9.-]+$/.test(text) && text.includes('.')
}

function validateEmail(value) {
  const text = String(value || '').trim()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)
}

function validateUrl(value) {
  const text = String(value || '').trim()
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateConfigValue(meta, value, allValues = {}) {
  const text = String(value ?? '').trim()
  if (text === '') {
    return { valid: true, normalizedValue: '' }
  }
  if (!meta) {
    return { valid: true, normalizedValue: text }
  }

  switch (meta.type) {
    case 'boolean':
      return { valid: true, normalizedValue: normalizeBoolean(text, false) ? 'true' : 'false' }
    case 'integer':
      if (text === '' || !/^-?\d+$/.test(text)) {
        return { valid: false, message: `${meta.label} 需要整数值` }
      }
      return { valid: true, normalizedValue: text }
    case 'port': {
      if (!/^\d+$/.test(text)) {
        return { valid: false, message: `${meta.label} 需要端口数字` }
      }
      const port = Number(text)
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return { valid: false, message: `${meta.label} 端口必须在 1-65535 之间` }
      }
      const conflictKey = Object.entries(allValues)
        .find(([key, otherValue]) => key !== meta.key && String(otherValue || '').trim() === text && getConfigMeta(key)?.type === 'port')
      if (conflictKey) {
        return { valid: false, message: `${meta.label} 与 ${conflictKey[0]} 发生端口冲突` }
      }
      return { valid: true, normalizedValue: text }
    }
    case 'phone':
      if (!validatePhone(text)) {
        return { valid: false, message: `${meta.label} 需要合法 11 位手机号` }
      }
      return { valid: true, normalizedValue: text }
    case 'domain':
      if (!validateDomain(text)) {
        return { valid: false, message: `${meta.label} 需要合法域名` }
      }
      return { valid: true, normalizedValue: normalizeDomain(text) }
    case 'email':
      if (!validateEmail(text)) {
        return { valid: false, message: `${meta.label} 需要合法邮箱` }
      }
      return { valid: true, normalizedValue: text }
    case 'url':
      if (!validateUrl(text)) {
        return { valid: false, message: `${meta.label} 需要合法 http/https URL` }
      }
      return { valid: true, normalizedValue: text }
    default:
      return { valid: true, normalizedValue: text }
  }
}

export function getSensitiveKeys(repoRoot = repoRootFallback) {
  return buildConfigSchema(repoRoot)
    .filter((item) => item.sensitive)
    .map((item) => item.key)
}

export function getKnownHostPortKeys(repoRoot = repoRootFallback) {
  return buildConfigSchema(repoRoot)
    .filter((item) => item.type === 'port')
    .map((item) => item.key)
}
