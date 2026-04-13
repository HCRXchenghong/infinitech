import { getConfigMeta, getKnownHostPortKeys } from './config-schema.mjs'
import { runAdminMaintenance } from './admin-maintenance.mjs'
import { buildAllowedOrigins, buildSystemEndpoints, checkHttpReady, detectComposeCommand, getComposeStatus, getProxyCertificateStatus, isProxyConfigured, probeDockerReady, repairDockerCompatibility, resolveProfilesForMode } from './orchestrator.mjs'
import { resolveRepoContext } from './install-manifest.mjs'
import { listEnvBackups, readEnvFile } from './runtime-env.mjs'
import { normalizeDomain } from './utils.mjs'
import { checkPortInUse } from './utils.mjs'

function makeCheck(status, title, detail) {
  return { status, title, detail }
}

export function isContainerHealthyEnough(item) {
  const state = String(item?.State || '').trim().toLowerCase()
  const health = String(item?.Health || '').trim().toLowerCase()

  if (state && state !== 'running') {
    return false
  }
  if (!health) {
    return true
  }
  if (health.includes('unhealthy')) {
    return false
  }
  return /\bhealthy\b/.test(health)
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getEffectiveEnvValue(repoRoot, envValues = {}, key) {
  const currentValue = String(envValues[key] || '').trim()
  if (currentValue) {
    return currentValue
  }
  return String(getConfigMeta(key, repoRoot)?.defaultHint || '').trim()
}

function normalizeComparableUrl(value) {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }

  try {
    const url = new URL(text)
    const pathname = url.pathname.replace(/\/+$/, '')
    return `${url.protocol}//${url.host}${pathname === '/' ? '' : pathname}`
  } catch {
    return text.replace(/\/+$/, '')
  }
}

function checkEnvCompleteness(repoRoot, envValues = {}) {
  const hardRequiredKeys = [
    'BOOTSTRAP_ADMIN_PHONE',
    'BOOTSTRAP_ADMIN_NAME',
    'BOOTSTRAP_ADMIN_PASSWORD',
    'SYSTEM_LOG_DELETE_ACCOUNT',
    'SYSTEM_LOG_DELETE_PASSWORD',
    'ADMIN_WEB_HOST_PORT',
    'SITE_WEB_HOST_PORT',
    'INVITE_WEB_HOST_PORT',
    'BFF_HOST_PORT',
    'GO_API_HOST_PORT',
    'SOCKET_HOST_PORT',
    'POSTGRES_HOST_PORT',
    'REDIS_HOST_PORT',
  ]
  const warningKeys = [
    'JWT_SECRET',
    'ADMIN_TOKEN_SECRET',
    'ADMIN_QR_LOGIN_SECRET',
    'TOKEN_API_SECRET',
  ]

  const blockers = []
  const warnings = []
  for (const key of hardRequiredKeys) {
    const meta = getConfigMeta(key, repoRoot)
    const value = String(envValues[key] || '').trim()
    if (!value && !String(meta?.defaultHint || '').trim()) {
      blockers.push(key)
    }
  }
  for (const key of warningKeys) {
    const meta = getConfigMeta(key, repoRoot)
    const value = String(envValues[key] || '').trim()
    if (!value && !String(meta?.defaultHint || '').trim()) {
      warnings.push(key)
    }
  }

  return { blockers, warnings }
}

export function checkEnvConsistency(repoRoot, envValues = {}) {
  const blockers = []
  const warnings = []
  const portToKeys = new Map()

  for (const key of getKnownHostPortKeys(repoRoot)) {
    const value = getEffectiveEnvValue(repoRoot, envValues, key)
    if (!value) {
      continue
    }
    const keys = portToKeys.get(value) || []
    keys.push(key)
    portToKeys.set(value, keys)
  }

  for (const [port, keys] of portToKeys.entries()) {
    if (keys.length < 2) {
      continue
    }
    const labels = keys.map((key) => getConfigMeta(key, repoRoot)?.label || key)
    blockers.push(`端口 ${port} 被以下变量重复使用：${labels.join('、')}`)
  }

  const proxyKeys = ['PUBLIC_DOMAIN', 'ADMIN_DOMAIN', 'CADDY_EMAIL']
  const configuredProxyKeys = proxyKeys.filter((key) => String(envValues[key] || '').trim())
  if (configuredProxyKeys.length > 0 && configuredProxyKeys.length < proxyKeys.length) {
    warnings.push(`反代变量仅配置了 ${configuredProxyKeys.join(', ')}，请补齐 PUBLIC_DOMAIN / ADMIN_DOMAIN / CADDY_EMAIL 或全部清空。`)
  }

  const adminPort = getEffectiveEnvValue(repoRoot, envValues, 'ADMIN_WEB_HOST_PORT') || '8888'
  const sitePort = getEffectiveEnvValue(repoRoot, envValues, 'SITE_WEB_HOST_PORT') || '1888'
  const invitePort = getEffectiveEnvValue(repoRoot, envValues, 'INVITE_WEB_HOST_PORT') || '1788'
  const proxyEnabled = isProxyConfigured(envValues)
  const proxyOrigin = proxyEnabled
    ? ((envValues.REVERSE_PROXY_HTTPS_PORT || '443') === '443'
        ? `https://${normalizeDomain(envValues.PUBLIC_DOMAIN)}`
        : `https://${normalizeDomain(envValues.PUBLIC_DOMAIN)}:${envValues.REVERSE_PROXY_HTTPS_PORT || '443'}`)
    : ''
  const expectedAdminUrl = proxyEnabled
    ? ((envValues.REVERSE_PROXY_HTTPS_PORT || '443') === '443'
        ? `https://${normalizeDomain(envValues.ADMIN_DOMAIN)}`
        : `https://${normalizeDomain(envValues.ADMIN_DOMAIN)}:${envValues.REVERSE_PROXY_HTTPS_PORT || '443'}`)
    : `http://127.0.0.1:${adminPort}`
  const expectedUrls = [
    ['ADMIN_WEB_BASE_URL', expectedAdminUrl],
    ['SITE_WEB_BASE_URL', proxyEnabled ? proxyOrigin : `http://127.0.0.1:${sitePort}`],
    ['PUBLIC_LANDING_BASE_URL', `http://127.0.0.1:${invitePort}`],
    ['ONBOARDING_INVITE_BASE_URL', `http://127.0.0.1:${invitePort}`],
    ['COUPON_CLAIM_LINK_BASE_URL', `http://127.0.0.1:${invitePort}`],
  ]
  const mismatches = []

  for (const [key, expected] of expectedUrls) {
    const current = normalizeComparableUrl(getEffectiveEnvValue(repoRoot, envValues, key))
    if (!current) {
      continue
    }
    const normalizedExpected = normalizeComparableUrl(expected)
    if (current !== normalizedExpected) {
      mismatches.push(`${getConfigMeta(key, repoRoot)?.label || key}=${current}，预期 ${normalizedExpected}`)
    }
  }

  if (mismatches.length > 0) {
    warnings.push(`入口 URL 与当前端口/反代模式不一致：${mismatches.join('；')}`)
  }

  return { blockers, warnings }
}

export function checkProxyConsistency(repoRoot, envValues = {}, composeStatus = []) {
  if (!isProxyConfigured(envValues)) {
    const reverseProxyRunning = composeStatus.some((item) => item.Service === 'reverse-proxy')
    return {
      blocker: '',
      warning: reverseProxyRunning ? 'reverse-proxy 容器正在运行，但当前 env 未启用反向代理。' : '',
    }
  }

  const publicDomain = normalizeDomain(envValues.PUBLIC_DOMAIN)
  const adminDomain = normalizeDomain(envValues.ADMIN_DOMAIN)
  const expectedOrigins = splitCsv(buildAllowedOrigins(publicDomain, adminDomain, {
    httpPort: envValues.REVERSE_PROXY_HTTP_PORT,
    httpsPort: envValues.REVERSE_PROXY_HTTPS_PORT,
  }))
  const actualOrigins = new Set(splitCsv(getEffectiveEnvValue(repoRoot, envValues, 'ALLOWED_ORIGINS')))
  const missingOrigins = expectedOrigins.filter((origin) => !actualOrigins.has(origin))
  const reverseProxyRunning = composeStatus.some((item) => item.Service === 'reverse-proxy')

  if (!reverseProxyRunning) {
    return {
      blocker: 'env 已启用反向代理，但 reverse-proxy 容器未运行。',
      warning: '',
    }
  }

  if (publicDomain && adminDomain && publicDomain === adminDomain) {
    return {
      blocker: '',
      warning: '业务域名与后台域名当前相同，建议拆分独立域名。',
    }
  }

  if (missingOrigins.length > 0) {
    return {
      blocker: '',
      warning: `ALLOWED_ORIGINS 缺少预期来源：${missingOrigins.join(', ')}`,
    }
  }

  if ([publicDomain, adminDomain].some((domain) => domain === 'localhost' || domain.endsWith('.localhost'))) {
    return {
      blocker: '',
      warning: '当前使用 localhost 域名，公开 ACME TLS 证书通常不会签发。',
    }
  }

  return { blocker: '', warning: '' }
}

export async function runDoctor(repoRoot) {
  const context = resolveRepoContext(repoRoot)
  const envValues = readEnvFile(context.runtimeEnvPath)
  const compose = detectComposeCommand(context.repoRoot)
  const composeStatus = getComposeStatus(context.repoRoot, {
    envFile: context.runtimeEnvPath,
    profiles: resolveProfilesForMode('full', envValues),
  })
  const endpoints = buildSystemEndpoints(envValues)
  const checks = []

  checks.push(
    probeDockerReady(context.repoRoot)
      ? makeCheck('ok', 'Docker 引擎', 'Docker daemon 已就绪。')
      : makeCheck('blocker', 'Docker 引擎', 'Docker daemon 未就绪。'),
  )

  checks.push(
    compose
      ? makeCheck('ok', 'Docker Compose', 'Docker Compose 可用。')
      : makeCheck('blocker', 'Docker Compose', '未检测到 Docker Compose。'),
  )

  const dockerCompat = repairDockerCompatibility(context.repoRoot)
  checks.push(
    dockerCompat.dockerReady
      ? makeCheck('ok', 'Docker 兼容模式', dockerCompat.detail)
      : makeCheck('warning', 'Docker 兼容模式', `${dockerCompat.detail} 但当前仍未成功连通 Docker。`),
  )

  checks.push(
    context.runtimeEnvPath
      ? makeCheck('ok', '运行时 env', `使用配置文件：${context.runtimeEnvPath}`)
      : makeCheck('warning', '运行时 env', '未定位到运行时 env 文件。'),
  )

  if (composeStatus.length > 0) {
    const unhealthy = composeStatus.filter((item) => !isContainerHealthyEnough(item))
    checks.push(
      unhealthy.length === 0
        ? makeCheck('ok', '容器健康状态', `当前共 ${composeStatus.length} 个容器已在运行。`)
        : makeCheck('warning', '容器健康状态', `有 ${unhealthy.length} 个容器未达到 healthy。`),
    )
  } else {
    checks.push(makeCheck('warning', '容器健康状态', '未检测到正在运行的 Compose 容器。'))
  }

  const envCompleteness = checkEnvCompleteness(context.repoRoot, envValues)
  if (envCompleteness.blockers.length > 0) {
    checks.push(makeCheck('blocker', 'env 完整性', `缺少关键变量：${envCompleteness.blockers.join(', ')}`))
  } else if (envCompleteness.warnings.length > 0) {
    checks.push(makeCheck('warning', 'env 完整性', `建议补齐安全关键变量：${envCompleteness.warnings.join(', ')}`))
  } else {
    checks.push(makeCheck('ok', 'env 完整性', '关键运行时变量已具备。'))
  }

  const envConsistency = checkEnvConsistency(context.repoRoot, envValues)
  if (envConsistency.blockers.length > 0) {
    checks.push(makeCheck('blocker', 'env 一致性', envConsistency.blockers.join('；')))
  } else if (envConsistency.warnings.length > 0) {
    checks.push(makeCheck('warning', 'env 一致性', envConsistency.warnings.join('；')))
  } else {
    checks.push(makeCheck('ok', 'env 一致性', '入口 URL、端口和反代变量彼此一致。'))
  }

  try {
    const payload = runAdminMaintenance(context.repoRoot, {
      action: 'list',
      envFile: context.runtimeEnvPath,
    })
    const count = Array.isArray(payload.admins) ? payload.admins.length : 0
    checks.push(
      count > 0
        ? makeCheck('ok', '管理员存在性', `当前数据库存在 ${count} 个管理员账号。`)
        : makeCheck('warning', '管理员存在性', '数据库当前没有管理员账号。'),
    )
  } catch (error) {
    checks.push(makeCheck('blocker', '数据库连通性', error.message || '管理员列表读取失败。'))
  }

  const keyPorts = [
    ['后台 Web 端口', envValues.ADMIN_WEB_HOST_PORT || '8888'],
    ['BFF 端口', envValues.BFF_HOST_PORT || '25500'],
    ['Go API 端口', envValues.GO_API_HOST_PORT || '1029'],
    ['Socket 端口', envValues.SOCKET_HOST_PORT || '9898'],
    ['PostgreSQL 端口', envValues.POSTGRES_HOST_PORT || '5432'],
    ['Redis 端口', envValues.REDIS_HOST_PORT || '2550'],
  ]
  for (const [label, port] of keyPorts) {
    const inUse = await checkPortInUse(port)
    checks.push(
      inUse
        ? makeCheck('ok', `${label}`, `端口 ${port} 当前可从宿主机访问。`)
        : makeCheck('warning', `${label}`, `端口 ${port} 当前未监听，若对应服务应在线请检查容器状态。`),
    )
  }

  if (isProxyConfigured(envValues)) {
    const proxyConsistency = checkProxyConsistency(context.repoRoot, envValues, composeStatus)
    if (proxyConsistency.blocker) {
      checks.push(makeCheck('blocker', '反代配置一致性', proxyConsistency.blocker))
    } else if (proxyConsistency.warning) {
      checks.push(makeCheck('warning', '反代配置一致性', proxyConsistency.warning))
    } else {
      checks.push(makeCheck('ok', '反代配置一致性', '反代域名、来源和容器运行状态一致。'))
    }

    const publicReady = await checkHttpReady(endpoints.publicDomain)
    const adminReady = await checkHttpReady(endpoints.adminDomain)
    checks.push(
      publicReady
        ? makeCheck('ok', '业务域名连通性', `${endpoints.publicDomain} 可访问。`)
        : makeCheck('warning', '业务域名连通性', `${endpoints.publicDomain} 当前不可访问。`),
    )
    checks.push(
      adminReady
        ? makeCheck('ok', '后台域名连通性', `${endpoints.adminDomain} 可访问。`)
        : makeCheck('warning', '后台域名连通性', `${endpoints.adminDomain} 当前不可访问。`),
    )

    const certificateStatus = getProxyCertificateStatus(context.repoRoot, envValues)
    checks.push(
      certificateStatus.status === 'ok'
        ? makeCheck('ok', 'TLS 证书状态', certificateStatus.summary)
        : makeCheck('warning', 'TLS 证书状态', certificateStatus.summary),
    )
  } else {
    checks.push(makeCheck('warning', '反向代理模式', '当前未启用反向代理，系统处于宿主端口直连模式。'))
  }

  const backups = listEnvBackups(context.repoRoot)
  checks.push(
    backups.length > 0
      ? makeCheck('ok', 'env 备份', `已发现 ${backups.length} 份 env 备份。`)
      : makeCheck('warning', 'env 备份', '暂未发现 env 备份文件。'),
  )

  return {
    repoRoot: context.repoRoot,
    runtimeEnvPath: context.runtimeEnvPath,
    endpoints,
    checks,
  }
}
