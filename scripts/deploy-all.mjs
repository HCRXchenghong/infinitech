import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const composeFile = path.join(repoRoot, 'backend', 'docker', 'docker-compose.yml')
const deployEnvFile = path.join(repoRoot, 'backend', 'docker', '.deploy.runtime.env')
const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'
const defaultBootstrapAdminPhone = '13800138000'
const defaultBootstrapAdminName = 'Bootstrap Admin'
const defaultSystemLogVerifyAccount = 'syslog_admin'

function generateSecret(bytes = 12) {
  return randomBytes(bytes).toString('base64url')
}

function resolveEnvValue(...candidates) {
  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (value) {
      return value
    }
  }
  return ''
}

function resolveDeploymentCredentials(targetValues = {}, sharedValues = {}) {
  return {
    bootstrapAdminPhone: resolveEnvValue(
      process.env.BOOTSTRAP_ADMIN_PHONE,
      targetValues.BOOTSTRAP_ADMIN_PHONE,
      sharedValues.BOOTSTRAP_ADMIN_PHONE,
      defaultBootstrapAdminPhone,
    ),
    bootstrapAdminName: resolveEnvValue(
      process.env.BOOTSTRAP_ADMIN_NAME,
      targetValues.BOOTSTRAP_ADMIN_NAME,
      sharedValues.BOOTSTRAP_ADMIN_NAME,
      defaultBootstrapAdminName,
    ),
    bootstrapAdminPassword: resolveEnvValue(
      process.env.BOOTSTRAP_ADMIN_PASSWORD,
      targetValues.BOOTSTRAP_ADMIN_PASSWORD,
      sharedValues.BOOTSTRAP_ADMIN_PASSWORD,
      generateSecret(10),
    ),
    systemLogDeleteAccount: resolveEnvValue(
      process.env.SYSTEM_LOG_DELETE_ACCOUNT,
      targetValues.SYSTEM_LOG_DELETE_ACCOUNT,
      sharedValues.SYSTEM_LOG_DELETE_ACCOUNT,
      defaultSystemLogVerifyAccount,
    ),
    systemLogDeletePassword: resolveEnvValue(
      process.env.SYSTEM_LOG_DELETE_PASSWORD,
      targetValues.SYSTEM_LOG_DELETE_PASSWORD,
      sharedValues.SYSTEM_LOG_DELETE_PASSWORD,
      generateSecret(12),
    ),
  }
}

function getCredentialHelperCandidates() {
  if (!isWindows) {
    return []
  }

  return [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-credential-desktop.exe',
  ]
}

function resolveCredentialHelper() {
  if (!isWindows) {
    return { mode: 'none', helperDir: '' }
  }

  const directResult = spawnSync('docker-credential-desktop.exe', ['list'], {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false,
  })
  if ((directResult.status ?? 1) === 0) {
    return { mode: 'path', helperDir: '' }
  }

  for (const candidate of getCredentialHelperCandidates()) {
    if (fs.existsSync(candidate)) {
      return { mode: 'prepend-path', helperDir: path.dirname(candidate) }
    }
  }

  return { mode: 'compat', helperDir: '' }
}

function buildDockerCompatEnv() {
  const env = { ...process.env }

  if (!isWindows) {
    return env
  }

  const helper = resolveCredentialHelper()
  if (helper.mode === 'path') {
    return env
  }

  if (helper.mode === 'prepend-path') {
    env.PATH = helper.helperDir + (env.PATH ? `;${env.PATH}` : '')
    env.INFINITECH_DOCKER_HELPER_PATH_FIXED = '1'
    return env
  }

  const sourceConfigDir = env.DOCKER_CONFIG || path.join(os.homedir(), '.docker')
  const sourceConfigFile = path.join(sourceConfigDir, 'config.json')
  const compatDir = path.join(os.tmpdir(), 'infinitech-docker-config')
  const compatFile = path.join(compatDir, 'config.json')

  let config = {}
  try {
    if (fs.existsSync(sourceConfigFile)) {
      config = JSON.parse(fs.readFileSync(sourceConfigFile, 'utf8'))
    }
  } catch {
    config = {}
  }

  delete config.credsStore
  delete config.credStore
  delete config.credHelpers

  fs.mkdirSync(compatDir, { recursive: true })
  fs.writeFileSync(compatFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  env.DOCKER_CONFIG = compatDir
  env.INFINITECH_DOCKER_COMPAT = '1'
  return env
}

function getProcessEnv() {
  return buildDockerCompatEnv()
}

function canRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false,
    env: getProcessEnv(),
  })
  return (result.status ?? 1) === 0
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDockerCommandCandidates() {
  const candidates = [['docker']]

  if (isWindows) {
    candidates.push([
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    ])
    candidates.push([
      'C:\\Program Files\\Docker\\Docker\\resources\\docker.exe',
    ])
  }

  return candidates
}

function getDockerDesktopExecutableCandidates() {
  if (!isWindows) {
    return []
  }

  return [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
  ]
}

function getDockerComposeExecutableCandidates() {
  const candidates = isWindows
    ? [
        'docker-compose.exe',
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe',
        'C:\\Program Files\\Docker\\Docker\\resources\\cli-plugins\\docker-compose.exe',
      ]
    : ['docker-compose']

  return candidates
}

function readEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  const values = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separator = trimmed.indexOf('=')
    if (separator <= 0) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1)
    if (key) {
      values[key] = value
    }
  }

  return values
}

function probeDockerReady() {
  const probes = getDockerCommandCandidates().map(([command]) => [command, ['info']])

  if (isLinux) {
    probes.push(['sudo', ['docker', 'info']])
  }

  for (const [command, args] of probes) {
    if (canRun(command, args)) {
      return true
    }
  }

  return false
}

function tryStartDockerDesktop() {
  if (!isWindows) {
    return false
  }

  for (const candidate of getDockerDesktopExecutableCandidates()) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    const result = spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Start-Process -FilePath '${candidate.replace(/'/g, "''")}'`,
    ], {
      cwd: repoRoot,
      stdio: 'ignore',
      shell: false,
      env: getProcessEnv(),
    })

    if (!result.error) {
      return true
    }
  }

  return false
}

async function waitForDockerReady(options = {}) {
  const {
    attempts = 12,
    delayMs = 5000,
    stableSuccesses = 2,
    quiet = false,
  } = options

  let successCount = 0
  let startedDesktop = false

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (probeDockerReady()) {
      successCount += 1
      if (successCount >= stableSuccesses) {
        return true
      }
    } else {
      successCount = 0
      if (isWindows && !startedDesktop) {
        startedDesktop = tryStartDockerDesktop()
        if (startedDesktop && !quiet) {
          console.log('\n检测到 Docker Desktop 还未完全就绪，脚本正在尝试自动启动并等待 Linux 引擎准备完成...')
        }
      }
    }

    if (attempt < attempts) {
      await sleep(delayMs)
    }
  }

  return false
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: getProcessEnv(),
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 0
}

function detectComposeCommand() {
  const candidates = []

  for (const [dockerCommand] of getDockerCommandCandidates()) {
    candidates.push({
      command: dockerCommand,
      prefixArgs: ['compose'],
      probeArgs: ['compose', 'version'],
    })
  }

  if (isLinux) {
    candidates.push({
      command: 'sudo',
      prefixArgs: ['docker', 'compose'],
      probeArgs: ['docker', 'compose', 'version'],
    })
  }

  for (const legacyCommand of getDockerComposeExecutableCandidates()) {
    candidates.push({ command: legacyCommand, prefixArgs: [], probeArgs: ['version'] })
  }

  if (isLinux) {
    candidates.push({
      command: 'sudo',
      prefixArgs: ['docker-compose'],
      probeArgs: ['docker-compose', 'version'],
    })
  }

  for (const candidate of candidates) {
    if (canRun(candidate.command, candidate.probeArgs)) {
      return { command: candidate.command, prefixArgs: candidate.prefixArgs }
    }
  }

  for (const [dockerCommand] of getDockerCommandCandidates()) {
    if (fs.existsSync(dockerCommand)) {
      return { command: dockerCommand, prefixArgs: ['compose'] }
    }
  }

  for (const composeCommand of getDockerComposeExecutableCandidates()) {
    if (fs.existsSync(composeCommand)) {
      return { command: composeCommand, prefixArgs: [] }
    }
  }

  throw new Error(
    'Docker Compose is not available. Install Docker Desktop / Docker Engine with Compose first, or allow the script to use sudo docker compose on Linux.',
  )
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
}

function buildAllowedOrigins(publicDomain, adminDomain) {
  const domains = [publicDomain, adminDomain].filter(Boolean)
  const origins = new Set()

  for (const domain of domains) {
    origins.add(`https://${domain}`)
    origins.add(`http://${domain}`)
  }

  origins.add('http://127.0.0.1:8888')
  origins.add('http://localhost:8888')
  origins.add('http://127.0.0.1:1788')
  origins.add('http://localhost:1788')
  origins.add('http://127.0.0.1:1798')
  origins.add('http://localhost:1798')

  return Array.from(origins).join(',')
}

function writeDeployEnvFile(config, filePath = deployEnvFile) {
  const currentValues = readEnvFile(filePath)
  const nextValues = {
    ...currentValues,
    ADMIN_WEB_HOST_PORT: currentValues.ADMIN_WEB_HOST_PORT || '8888',
    INVITE_WEB_HOST_PORT: currentValues.INVITE_WEB_HOST_PORT || '1788',
    DOWNLOAD_WEB_HOST_PORT: currentValues.DOWNLOAD_WEB_HOST_PORT || '1798',
    PUBLIC_DOMAIN: config.publicDomain || currentValues.PUBLIC_DOMAIN || 'localhost',
    ADMIN_DOMAIN: config.adminDomain || currentValues.ADMIN_DOMAIN || 'admin.localhost',
    CADDY_EMAIL: config.caddyEmail || currentValues.CADDY_EMAIL || 'ops@example.com',
    ADMIN_WEB_BASE_URL:
      config.adminWebBaseUrl || currentValues.ADMIN_WEB_BASE_URL || 'http://127.0.0.1:8888',
    DOWNLOAD_WEB_BASE_URL:
      config.downloadWebBaseUrl || currentValues.DOWNLOAD_WEB_BASE_URL || 'http://127.0.0.1:1798',
    PUBLIC_LANDING_BASE_URL:
      config.publicLandingBaseUrl || currentValues.PUBLIC_LANDING_BASE_URL || 'http://127.0.0.1:1788',
    ONBOARDING_INVITE_BASE_URL:
      config.onboardingInviteBaseUrl || currentValues.ONBOARDING_INVITE_BASE_URL || 'http://127.0.0.1:1788',
    COUPON_CLAIM_LINK_BASE_URL:
      config.couponClaimLinkBaseUrl || currentValues.COUPON_CLAIM_LINK_BASE_URL || 'http://127.0.0.1:1788',
    ALLOWED_ORIGINS:
      config.allowedOrigins ||
      currentValues.ALLOWED_ORIGINS ||
      'http://127.0.0.1:8888,http://localhost:8888,http://127.0.0.1:1788,http://localhost:1788,http://127.0.0.1:1798,http://localhost:1798',
    ALIPAY_SIDECAR_URL:
      currentValues.ALIPAY_SIDECAR_URL || 'http://alipay-sidecar:10301',
    ALIPAY_SIDECAR_HOST_PORT:
      currentValues.ALIPAY_SIDECAR_HOST_PORT || '10301',
    BANK_PAYOUT_SIDECAR_URL:
      currentValues.BANK_PAYOUT_SIDECAR_URL || 'http://bank-payout-sidecar:10302',
    BANK_PAYOUT_SIDECAR_HOST_PORT:
      currentValues.BANK_PAYOUT_SIDECAR_HOST_PORT || '10302',
    BANK_PAYOUT_ALLOW_STUB:
      currentValues.BANK_PAYOUT_ALLOW_STUB || 'true',
    BANK_PAYOUT_STUB_QUERY_STATUS:
      currentValues.BANK_PAYOUT_STUB_QUERY_STATUS || '',
    ALIPAY_SANDBOX:
      currentValues.ALIPAY_SANDBOX || 'true',
    ALIPAY_APP_ID: currentValues.ALIPAY_APP_ID || '',
    ALIPAY_PRIVATE_KEY: currentValues.ALIPAY_PRIVATE_KEY || '',
    ALIPAY_PUBLIC_KEY: currentValues.ALIPAY_PUBLIC_KEY || '',
    ALIPAY_NOTIFY_URL: currentValues.ALIPAY_NOTIFY_URL || '',
    WXPAY_APP_ID: currentValues.WXPAY_APP_ID || '',
    WXPAY_MCH_ID: currentValues.WXPAY_MCH_ID || '',
    WXPAY_API_KEY: currentValues.WXPAY_API_KEY || '',
    WXPAY_API_V3_KEY: currentValues.WXPAY_API_V3_KEY || '',
    WXPAY_SERIAL_NO: currentValues.WXPAY_SERIAL_NO || '',
    WXPAY_PRIVATE_KEY: currentValues.WXPAY_PRIVATE_KEY || '',
    WXPAY_NOTIFY_URL: currentValues.WXPAY_NOTIFY_URL || '',
    WXPAY_REFUND_NOTIFY_URL: currentValues.WXPAY_REFUND_NOTIFY_URL || '',
    WXPAY_PAYOUT_NOTIFY_URL: currentValues.WXPAY_PAYOUT_NOTIFY_URL || '',
    BOOTSTRAP_ADMIN_PHONE:
      config.bootstrapAdminPhone || currentValues.BOOTSTRAP_ADMIN_PHONE || defaultBootstrapAdminPhone,
    BOOTSTRAP_ADMIN_NAME:
      config.bootstrapAdminName || currentValues.BOOTSTRAP_ADMIN_NAME || defaultBootstrapAdminName,
    BOOTSTRAP_ADMIN_PASSWORD:
      config.bootstrapAdminPassword || currentValues.BOOTSTRAP_ADMIN_PASSWORD || '',
    SYSTEM_LOG_DELETE_ACCOUNT:
      config.systemLogDeleteAccount ||
      currentValues.SYSTEM_LOG_DELETE_ACCOUNT ||
      defaultSystemLogVerifyAccount,
    SYSTEM_LOG_DELETE_PASSWORD:
      config.systemLogDeletePassword || currentValues.SYSTEM_LOG_DELETE_PASSWORD || '',
  }

  const lines = Object.entries(nextValues).map(([key, value]) => `${key}=${value}`)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
  return filePath
}

function parseArgs(argv) {
  const positional = []
  const flags = {
    profiles: [],
    build: true,
    detach: true,
    interactive: false,
    withProxy: false,
    publicDomain: '',
    adminDomain: '',
    caddyEmail: '',
    envFile: '',
  }

  for (const arg of argv) {
    if (arg === '--no-build') {
      flags.build = false
      continue
    }
    if (arg === '--attach') {
      flags.detach = false
      continue
    }
    if (arg === '--interactive') {
      flags.interactive = true
      continue
    }
    if (arg === '--proxy' || arg === '--reverse-proxy') {
      flags.withProxy = true
      continue
    }
    if (arg.startsWith('--profile=')) {
      const profile = arg.slice('--profile='.length).trim()
      if (profile) {
        flags.profiles.push(profile)
      }
      continue
    }
    if (arg.startsWith('--public-domain=')) {
      flags.publicDomain = normalizeDomain(arg.slice('--public-domain='.length))
      continue
    }
    if (arg.startsWith('--admin-domain=')) {
      flags.adminDomain = normalizeDomain(arg.slice('--admin-domain='.length))
      continue
    }
    if (arg.startsWith('--caddy-email=')) {
      flags.caddyEmail = String(arg.slice('--caddy-email='.length)).trim()
      continue
    }
    if (arg.startsWith('--env-file=')) {
      flags.envFile = path.resolve(repoRoot, arg.slice('--env-file='.length).trim())
      continue
    }
    positional.push(arg)
  }

  return {
    action: positional[0] || '',
    services: positional.slice(1),
    flags,
  }
}

function buildComposeArgs(prefixArgs, flags) {
  const args = [...prefixArgs, '-f', composeFile]

  if (flags.envFile && fs.existsSync(flags.envFile)) {
    args.push('--env-file', flags.envFile)
  }

  for (const profile of flags.profiles) {
    args.push('--profile', profile)
  }

  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/deploy-all.mjs
  node scripts/deploy-all.mjs up [--no-build] [--attach] [--profile=reverse-proxy]
  node scripts/deploy-all.mjs up --proxy --public-domain=api.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
  node scripts/deploy-all.mjs down
  node scripts/deploy-all.mjs restart
  node scripts/deploy-all.mjs logs [service...]
  node scripts/deploy-all.mjs ps
  node scripts/deploy-all.mjs config
  node scripts/deploy-all.mjs --interactive
`)
}

function printUpSummary(flags, deploymentCredentials) {
  console.log('\nServices are starting. Key endpoints:')
  console.log('  Go API:        http://127.0.0.1:1029/ready')
  console.log('  BFF:           http://127.0.0.1:25500/ready')
  console.log('  Socket Server: http://127.0.0.1:9898/ready')
  console.log('  Admin Web:     http://127.0.0.1:8888')
  console.log('  Invite Web:    http://127.0.0.1:1788/invite/<token>')
  console.log('  Download Web:  http://127.0.0.1:1798/download')
  console.log('  Alipay Sidecar:http://127.0.0.1:10301/health')
  console.log('  Bank Sidecar:  http://127.0.0.1:10302/health')
  console.log('  PostgreSQL:    127.0.0.1:5432')
  console.log('  Redis:         127.0.0.1:2550')

  if (flags.withProxy && flags.publicDomain) {
    console.log(`  Public Domain: https://${flags.publicDomain}`)
    console.log(`  Admin Domain:  https://${flags.adminDomain}`)
  }

  console.log('\n空库首次管理端初始化信息：如果当前数据库里还没有管理员账号，可先使用下面这组信息登录')
  console.log(`  初始化账号:   ${deploymentCredentials.bootstrapAdminPhone}`)
  console.log(`  初始化密码:   ${deploymentCredentials.bootstrapAdminPassword}`)
  console.log(`  初始管理员名: ${deploymentCredentials.bootstrapAdminName}`)
  console.log('  第一次登录后，后台会强制要求你改成真实的管理员名称、手机号和密码。')

  console.log('\n系统日志 / 清空类敏感操作二次验证信息：')
  console.log(`  验证账号: ${deploymentCredentials.systemLogDeleteAccount}`)
  console.log(`  验证密码: ${deploymentCredentials.systemLogDeletePassword}`)
  console.log(`  配置文件: ${flags.envFile || deployEnvFile}`)
  console.log('  重复执行部署会沿用同一份 env 文件中的现有口令，不会自动重置。')

  console.log('\nUse `node scripts/deploy-all.mjs logs` to inspect startup logs.')
}

function printDockerCompatHint() {
  const env = getProcessEnv()
  if (env.INFINITECH_DOCKER_HELPER_PATH_FIXED === '1') {
    console.log('\n检测到 docker-credential-desktop 未在 PATH 中，脚本已自动补上 Docker Desktop 安装目录。')
  } else if (env.INFINITECH_DOCKER_COMPAT === '1') {
    console.log('\n检测到本机缺少 docker-credential-desktop，已启用兼容模式继续拉取公开镜像。')
  }
}

async function prompt(question, fallback = '') {
  const rl = createInterface({ input, output })
  try {
    const suffix = fallback ? ` [${fallback}]` : ''
    const answer = await rl.question(`${question}${suffix}: `)
    return String(answer || fallback).trim()
  } finally {
    rl.close()
  }
}

async function interactiveMenu(parsed) {
  console.log('\n请选择部署动作:')
  console.log('  1. 启动核心服务')
  console.log('  2. 启动核心服务并前台附着日志')
  console.log('  3. 启动完整服务 + 域名反向代理')
  console.log('  4. 停止并删除容器')
  console.log('  5. 重建并重启')
  console.log('  6. 查看日志')
  console.log('  7. 查看容器状态')
  console.log('  8. 输出 Compose 配置')

  const choice = await prompt('输入数字选项', '1')

  switch (choice) {
    case '1':
      parsed.action = 'up'
      return parsed
    case '2':
      parsed.action = 'up'
      parsed.flags.detach = false
      return parsed
    case '3': {
      const publicDomain = normalizeDomain(
        await prompt('请输入 API / 业务域名', parsed.flags.publicDomain || 'api.example.com'),
      )
      const defaultAdminDomain =
        publicDomain && !parsed.flags.adminDomain
          ? `admin.${publicDomain}`
          : parsed.flags.adminDomain || 'admin.example.com'
      const adminDomain = normalizeDomain(await prompt('请输入后台域名', defaultAdminDomain))
      const caddyEmail = await prompt(
        '请输入 Caddy 证书邮箱',
        parsed.flags.caddyEmail || 'ops@example.com',
      )

      parsed.action = 'up'
      parsed.flags.withProxy = true
      parsed.flags.publicDomain = publicDomain
      parsed.flags.adminDomain = adminDomain
      parsed.flags.caddyEmail = caddyEmail
      return parsed
    }
    case '4':
      parsed.action = 'down'
      return parsed
    case '5':
      parsed.action = 'restart'
      return parsed
    case '6': {
      parsed.action = 'logs'
      const rawServices = await prompt('可选：输入日志服务名，多个用空格分隔', '')
      parsed.services = rawServices ? rawServices.split(/\s+/).filter(Boolean) : []
      return parsed
    }
    case '7':
      parsed.action = 'ps'
      return parsed
    case '8':
      parsed.action = 'config'
      return parsed
    default:
      throw new Error(`Unsupported menu option: ${choice}`)
  }
}

function ensureProxyConfig(flags) {
  if (!flags.withProxy) {
    return flags
  }

  const publicDomain = normalizeDomain(flags.publicDomain)
  if (!publicDomain) {
    throw new Error('Reverse proxy mode requires --public-domain or interactive domain input.')
  }

  const adminDomain = normalizeDomain(flags.adminDomain || `admin.${publicDomain}`)
  const caddyEmail = String(flags.caddyEmail || '').trim() || 'ops@example.com'
  flags.adminDomain = adminDomain
  flags.publicDomain = publicDomain
  flags.caddyEmail = caddyEmail

  if (!flags.profiles.includes('reverse-proxy')) {
    flags.profiles.push('reverse-proxy')
  }

  return flags
}

function prepareRuntimeDeployConfig(flags) {
  const targetEnvFile = flags.envFile || deployEnvFile
  const targetValues = readEnvFile(targetEnvFile)
  const sharedValues = targetEnvFile === deployEnvFile ? targetValues : readEnvFile(deployEnvFile)
  const deploymentCredentials = resolveDeploymentCredentials(targetValues, sharedValues)

  const nextConfig = {
    adminWebBaseUrl: 'http://127.0.0.1:8888',
    downloadWebBaseUrl: 'http://127.0.0.1:1798',
    publicLandingBaseUrl: 'http://127.0.0.1:1788',
    onboardingInviteBaseUrl: 'http://127.0.0.1:1788',
    couponClaimLinkBaseUrl: 'http://127.0.0.1:1788',
    bootstrapAdminPhone: deploymentCredentials.bootstrapAdminPhone,
    bootstrapAdminName: deploymentCredentials.bootstrapAdminName,
    bootstrapAdminPassword: deploymentCredentials.bootstrapAdminPassword,
    systemLogDeleteAccount: deploymentCredentials.systemLogDeleteAccount,
    systemLogDeletePassword: deploymentCredentials.systemLogDeletePassword,
  }

  if (flags.withProxy) {
    nextConfig.publicDomain = flags.publicDomain
    nextConfig.adminDomain = flags.adminDomain
    nextConfig.caddyEmail = flags.caddyEmail
    nextConfig.allowedOrigins = buildAllowedOrigins(flags.publicDomain, flags.adminDomain)
  }

  flags.envFile = writeDeployEnvFile(nextConfig, targetEnvFile)
  return deploymentCredentials
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  const needsInteractive = parsed.flags.interactive || (!parsed.action && input.isTTY)
  let deploymentCredentials = null

  if (parsed.action === 'help' || parsed.action === '--help' || parsed.action === '-h') {
    printUsage()
    return
  }

  if (needsInteractive) {
    await interactiveMenu(parsed)
  }

  if (!parsed.action) {
    printUsage()
    return
  }

  ensureProxyConfig(parsed.flags)

  if (
    parsed.action === 'up' ||
    parsed.action === 'restart' ||
    (parsed.action === 'config' && parsed.flags.withProxy)
  ) {
    deploymentCredentials = prepareRuntimeDeployConfig(parsed.flags)
  }

  const compose = detectComposeCommand()
  printDockerCompatHint()
  const requiresDockerDaemon = parsed.action !== 'config'
  if (requiresDockerDaemon) {
    const ready = await waitForDockerReady({
      attempts: isWindows ? 18 : 8,
      delayMs: isWindows ? 5000 : 2000,
      stableSuccesses: isWindows ? 2 : 1,
    })

    if (!ready) {
      throw new Error(
        isWindows
          ? 'Docker Desktop Linux 引擎当前未就绪。请确认 Docker Desktop 已打开并显示 Running，然后重新执行脚本。'
          : 'Docker daemon 当前未就绪。请先确认 Docker Engine 已启动，然后重新执行脚本。',
      )
    }
  }
  const baseArgs = buildComposeArgs(compose.prefixArgs, parsed.flags)

  let args
  switch (parsed.action) {
    case 'up':
      args = [...baseArgs, 'up']
      if (parsed.flags.detach) {
        args.push('-d')
      }
      if (parsed.flags.build) {
        args.push('--build')
      }
      if (parsed.services.length > 0) {
        args.push(...parsed.services)
      }
      break
    case 'down':
      args = [...baseArgs, 'down', '--remove-orphans']
      break
    case 'restart':
      args = [...baseArgs, 'up', '-d', '--build']
      if (parsed.services.length > 0) {
        args.push(...parsed.services)
      }
      break
    case 'logs':
      args = [...baseArgs, 'logs', '-f']
      if (parsed.services.length > 0) {
        args.push(...parsed.services)
      }
      break
    case 'ps':
      args = [...baseArgs, 'ps']
      break
    case 'config':
      args = [...baseArgs, 'config']
      break
    default:
      throw new Error(`Unsupported action: ${parsed.action}`)
  }

  let exitCode = run(compose.command, args)
  if (exitCode !== 0 && requiresDockerDaemon && isWindows && !probeDockerReady()) {
    console.log('\n检测到 Docker Desktop Linux 引擎在执行期间短暂掉线，脚本将等待恢复后自动重试一次...')
    const recovered = await waitForDockerReady({
      attempts: 12,
      delayMs: 5000,
      stableSuccesses: 1,
    })
    if (recovered) {
      exitCode = run(compose.command, args)
    }
  }
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  if (parsed.action === 'up' || parsed.action === 'restart') {
    printUpSummary(parsed.flags, deploymentCredentials || resolveDeploymentCredentials())
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
