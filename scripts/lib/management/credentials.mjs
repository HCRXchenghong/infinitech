import { randomBytes } from 'node:crypto'

const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz'
const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PASSWORD_DIGITS = '23456789'
const PASSWORD_SYMBOLS = '!@#$%^&*()-_=+[]{}'
const PHONE_PREFIXES = ['131', '133', '135', '136', '137', '138', '139', '150', '151', '152', '157', '158', '159', '166', '171', '173', '175', '176', '177', '178', '180', '181', '182', '183', '185', '186', '187', '188', '189', '191', '193', '195', '196', '198', '199']
const VERIFY_ACCOUNT_PREFIXES = ['verify', 'sec', 'ops', 'audit']

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
  }
}

