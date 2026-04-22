import { randomBytes } from 'node:crypto'

const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz'
const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PASSWORD_DIGITS = '23456789'
const PASSWORD_SYMBOLS = '!@#$%^&*()-_=+[]{}'
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const PHONE_PREFIXES = ['131', '133', '135', '136', '137', '138', '139', '150', '151', '152', '157', '158', '159', '166', '171', '173', '175', '176', '177', '178', '180', '181', '182', '183', '185', '186', '187', '188', '189', '191', '193', '195', '196', '198', '199']
const VERIFY_ACCOUNT_PREFIXES = ['verify', 'sec', 'ops', 'audit']
const WEAK_SECRET_VALUES = new Set([
  '123456',
  'changeme',
  'change-me',
  'admin_password',
  'yuexiang_password',
])

export const RUNTIME_SECURITY_SPECS = [
  { key: 'JWT_SECRET', label: 'JWT 密钥', length: 48, minLength: 32 },
  { key: 'ADMIN_TOKEN_SECRET', label: '管理端 Token 密钥', length: 48, minLength: 32 },
  { key: 'ADMIN_QR_LOGIN_SECRET', label: '管理端二维码登录密钥', length: 48, minLength: 32 },
  { key: 'SOCKET_SERVER_API_SECRET', label: 'Socket Server API 密钥', length: 48, minLength: 32 },
  { key: 'ALIPAY_SIDECAR_API_SECRET', label: '支付宝 Sidecar 密钥', length: 48, minLength: 32 },
  { key: 'BANK_PAYOUT_SIDECAR_API_SECRET', label: '银行卡 Sidecar 密钥', length: 48, minLength: 32 },
  { key: 'POSTGRES_PASSWORD', label: 'PostgreSQL 密码', length: 32, minLength: 20 },
  {
    key: 'REDIS_PASSWORD',
    label: 'Redis 密码',
    length: 32,
    minLength: 20,
    isRelevant(envValues = {}) {
      const redisEnabled = String(envValues.REDIS_ENABLED ?? 'true').trim().toLowerCase()
      const socketRedisEnabled = String(envValues.SOCKET_REDIS_ENABLED ?? envValues.REDIS_ENABLED ?? 'true').trim().toLowerCase()
      return redisEnabled !== 'false' || socketRedisEnabled !== 'false'
    },
  },
]

export const SECURITY_PASSWORD_SPECS = [
  { key: 'BOOTSTRAP_ADMIN_PASSWORD', label: '初始化管理员密码', minLength: 16 },
  { key: 'SYSTEM_LOG_DELETE_PASSWORD', label: '系统日志验证密码', minLength: 20 },
  { key: 'CLEAR_ALL_DATA_VERIFY_PASSWORD', label: '全量清空验证密码', minLength: 20 },
]

function randomIndex(limit) {
  if (limit <= 0) {
    return 0
  }
  const max = 256 - (256 % limit)
  const buffer = randomBytes(1)
  let value = buffer[0]
  while (value >= max) {
    value = randomBytes(1)[0]
  }
  return value % limit
}

function randomChar(pool) {
  return pool[randomIndex(pool.length)]
}

function shuffle(values) {
  const cloned = [...values]
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1)
    const temp = cloned[index]
    cloned[index] = cloned[other]
    cloned[other] = temp
  }
  return cloned
}

export function generateSecurePassword(length = 20) {
  const finalLength = Math.max(16, Number(length) || 20)
  const all = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS + PASSWORD_SYMBOLS
  const required = [
    randomChar(PASSWORD_LOWER),
    randomChar(PASSWORD_UPPER),
    randomChar(PASSWORD_DIGITS),
    randomChar(PASSWORD_SYMBOLS),
  ]

  while (required.length < finalLength) {
    required.push(randomChar(all))
  }

  return shuffle(required).join('')
}

export function generateSecretToken(length = 48) {
  const finalLength = Math.max(32, Number(length) || 48)
  const chars = []
  while (chars.length < finalLength) {
    chars.push(randomChar(TOKEN_ALPHABET))
  }
  return chars.join('')
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

function placeholderLike(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) {
    return true
  }
  if (WEAK_SECRET_VALUES.has(normalized)) {
    return true
  }
  return (
    normalized.startsWith('replace-with-') ||
    normalized.startsWith('replace_me') ||
    normalized.startsWith('replace-me') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  )
}

function getSpecByKey(key, specs) {
  return specs.find((item) => item.key === key) || null
}

export function isWeakRuntimeSecurityValue(key, value, envValues = {}) {
  const spec = getSpecByKey(key, RUNTIME_SECURITY_SPECS)
  if (!spec) {
    return false
  }
  if (typeof spec.isRelevant === 'function' && !spec.isRelevant(envValues)) {
    return false
  }

  const normalized = normalizeText(value)
  if (!normalized || placeholderLike(normalized)) {
    return true
  }
  return normalized.length < (spec.minLength || 1)
}

export function isWeakSecurityPasswordValue(key, value) {
  const spec = getSpecByKey(key, SECURITY_PASSWORD_SPECS)
  if (!spec) {
    return false
  }

  const normalized = normalizeText(value)
  if (!normalized || placeholderLike(normalized)) {
    return true
  }
  return normalized.length < (spec.minLength || 1)
}

export function generateRuntimeSecurityValues(currentValues = {}) {
  const generated = {}
  for (const spec of RUNTIME_SECURITY_SPECS) {
    if (typeof spec.isRelevant === 'function' && !spec.isRelevant(currentValues)) {
      continue
    }
    if (isWeakRuntimeSecurityValue(spec.key, currentValues[spec.key], currentValues)) {
      generated[spec.key] = generateSecretToken(spec.length)
    }
  }
  return generated
}

export function collectSecurityBaselineIssues(envValues = {}) {
  const blockers = []

  for (const spec of RUNTIME_SECURITY_SPECS) {
    if (typeof spec.isRelevant === 'function' && !spec.isRelevant(envValues)) {
      continue
    }
    if (isWeakRuntimeSecurityValue(spec.key, envValues[spec.key], envValues)) {
      blockers.push(`${spec.label} (${spec.key}) 缺失、过短或仍是弱占位值`)
    }
  }

  for (const spec of SECURITY_PASSWORD_SPECS) {
    if (isWeakSecurityPasswordValue(spec.key, envValues[spec.key])) {
      blockers.push(`${spec.label} (${spec.key}) 缺失、过短或仍是弱口令`)
    }
  }

  return { blockers, warnings: [] }
}

export function buildRuntimeSecurityReceiptRows(envValues = {}) {
  return RUNTIME_SECURITY_SPECS
    .filter((spec) => {
      if (typeof spec.isRelevant === 'function') {
        return spec.isRelevant(envValues)
      }
      return true
    })
    .map((spec) => ({
      key: spec.key,
      label: spec.label,
      value: normalizeText(envValues[spec.key]),
    }))
    .filter((row) => row.value)
}

export function generateBootstrapPhone(existingPhones = new Set()) {
  let phone = ''
  do {
    const prefix = PHONE_PREFIXES[randomIndex(PHONE_PREFIXES.length)]
    const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0')
    phone = `${prefix}${suffix}`.slice(0, 11)
  } while (existingPhones.has(phone))
  return phone
}

export function generateVerifyAccount() {
  const prefix = VERIFY_ACCOUNT_PREFIXES[randomIndex(VERIFY_ACCOUNT_PREFIXES.length)]
  const token = randomBytes(5).toString('hex')
  return `${prefix}_${token}`
}

export function generateDeploymentCredentials(options = {}) {
  const existingPhones = options.existingPhones instanceof Set ? options.existingPhones : new Set()
  return {
    bootstrapAdminPhone: generateBootstrapPhone(existingPhones),
    bootstrapAdminName: 'Bootstrap Admin',
    bootstrapAdminPassword: generateSecurePassword(20),
    systemLogDeleteAccount: generateVerifyAccount(),
    systemLogDeletePassword: generateSecurePassword(24),
    clearAllDataVerifyAccount: generateVerifyAccount(),
    clearAllDataVerifyPassword: generateSecurePassword(24),
  }
}
