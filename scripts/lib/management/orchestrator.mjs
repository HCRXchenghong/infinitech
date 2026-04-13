import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { normalizeBoolean, normalizeDomain, runCommand, runCommandOrThrow } from './utils.mjs'

const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'

function getCredentialHelperCandidates() {
  if (!isWindows) {
    return []
  }

  return [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-credential-desktop.exe',
  ]
}

function resolveCredentialHelper(repoRoot) {
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

export function getDockerCompatibilityStatus(repoRoot = repoRootFallback) {
  if (!isWindows) {
    return {
      mode: 'not_required',
      ok: true,
      detail: '当前平台无需 Docker credential helper 兼容修复。',
      helperDir: '',
      dockerConfig: '',
    }
  }

  const helper = resolveCredentialHelper(repoRoot)
  if (helper.mode === 'path') {
    return {
      mode: 'path',
      ok: true,
      detail: 'docker-credential-desktop 已在 PATH 中，可直接使用 Docker。',
      helperDir: '',
      dockerConfig: '',
    }
  }

  if (helper.mode === 'prepend-path') {
    return {
      mode: 'prepend-path',
      ok: true,
      detail: `已检测到可用的 Docker Desktop helper 目录：${helper.helperDir}`,
      helperDir: helper.helperDir,
      dockerConfig: '',
    }
  }

  return {
    mode: 'compat',
    ok: true,
    detail: '将使用兼容模式剥离 Docker credential helper 配置，继续访问公开镜像。',
    helperDir: '',
    dockerConfig: path.join(os.tmpdir(), 'infinitech-docker-config'),
  }
}

export function getProcessEnv(repoRoot = repoRootFallback) {
  const env = { ...process.env }

  if (!isWindows) {
    return env
  }

  const helper = resolveCredentialHelper(repoRoot)
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

export function repairDockerCompatibility(repoRoot = repoRootFallback) {
  const env = getProcessEnv(repoRoot)
  const status = getDockerCompatibilityStatus(repoRoot)
  const dockerReady = runCommand('docker', ['info'], {
    cwd: repoRoot,
    env,
    stdio: 'ignore',
  }).status === 0

  return {
    ...status,
    dockerReady,
    effectiveDockerConfig: env.DOCKER_CONFIG || '',
    pathFixed: env.INFINITECH_DOCKER_HELPER_PATH_FIXED === '1',
    compatConfigEnabled: env.INFINITECH_DOCKER_COMPAT === '1',
  }
}

function canRun(command, args, repoRoot = repoRootFallback) {
  const result = runCommand(command, args, {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
    stdio: 'ignore',
  })
  return result.status === 0
}

function getDockerCommandCandidates() {
  const candidates = [['docker']]
  if (isWindows) {
    candidates.push(['C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'])
    candidates.push(['C:\\Program Files\\Docker\\Docker\\resources\\docker.exe'])
  }
  return candidates
}

function getDockerComposeExecutableCandidates() {
  return isWindows
    ? [
        'docker-compose.exe',
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe',
        'C:\\Program Files\\Docker\\Docker\\resources\\cli-plugins\\docker-compose.exe',
      ]
    : ['docker-compose']
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

export function buildAllowedOrigins(publicDomain, adminDomain, options = {}) {
  const httpPort = String(options.httpPort || '80').trim() || '80'
  const httpsPort = String(options.httpsPort || '443').trim() || '443'
  const domains = [normalizeDomain(publicDomain), normalizeDomain(adminDomain)].filter(Boolean)
  const origins = new Set([
    'http://127.0.0.1:8888',
    'http://localhost:8888',
    'http://127.0.0.1:1888',
    'http://localhost:1888',
    'http://127.0.0.1:1788',
    'http://localhost:1788',
  ])

  for (const domain of domains) {
    origins.add(httpsPort === '443' ? `https://${domain}` : `https://${domain}:${httpsPort}`)
    origins.add(httpPort === '80' ? `http://${domain}` : `http://${domain}:${httpPort}`)
  }

  return Array.from(origins).join(',')
}

export function detectComposeCommand(repoRoot = repoRootFallback) {
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
    candidates.push({
      command: legacyCommand,
      prefixArgs: [],
      probeArgs: ['version'],
    })
  }

  if (isLinux) {
    candidates.push({
      command: 'sudo',
      prefixArgs: ['docker-compose'],
      probeArgs: ['docker-compose', 'version'],
    })
  }

  for (const candidate of candidates) {
    if (canRun(candidate.command, candidate.probeArgs, repoRoot)) {
      return { command: candidate.command, prefixArgs: candidate.prefixArgs }
    }
  }

  return null
}

export function probeDockerReady(repoRoot = repoRootFallback) {
  const probes = getDockerCommandCandidates().map(([command]) => [command, ['info']])
  if (isLinux) {
    probes.push(['sudo', ['docker', 'info']])
  }

  for (const [command, args] of probes) {
    if (canRun(command, args, repoRoot)) {
      return true
    }
  }
  return false
}

function tryStartDockerDesktop(repoRoot = repoRootFallback) {
  if (!isWindows) {
    return false
  }

  for (const candidate of getDockerDesktopExecutableCandidates()) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    const result = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Start-Process -FilePath '${candidate.replace(/'/g, "''")}'`,
    ], {
      cwd: repoRoot,
      env: getProcessEnv(repoRoot),
      stdio: 'ignore',
    })
    if (result.status === 0) {
      return true
    }
  }

  return false
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForDockerReady(options = {}, repoRoot = repoRootFallback) {
  const {
    attempts = isWindows ? 18 : 8,
    delayMs = isWindows ? 5000 : 2000,
    stableSuccesses = isWindows ? 2 : 1,
  } = options

  let successCount = 0
  let triedDesktopStart = false

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (probeDockerReady(repoRoot)) {
      successCount += 1
      if (successCount >= stableSuccesses) {
        return true
      }
    } else {
      successCount = 0
      if (isWindows && !triedDesktopStart) {
        triedDesktopStart = tryStartDockerDesktop(repoRoot)
      }
    }
    if (attempt < attempts - 1) {
      await sleep(delayMs)
    }
  }

  return false
}

function buildComposeArgs(prefixArgs, repoRoot, options = {}) {
  const paths = getManagementPaths(repoRoot)
  const args = [...prefixArgs, '-f', paths.composeFile]
  if (options.envFile) {
    args.push('--env-file', options.envFile)
  }
  for (const profile of options.profiles || []) {
    args.push('--profile', profile)
  }
  return args
}

export function isProxyConfigured(envValues = {}) {
  return Boolean(
    normalizeDomain(envValues.PUBLIC_DOMAIN) &&
      normalizeDomain(envValues.ADMIN_DOMAIN) &&
      String(envValues.CADDY_EMAIL || '').trim(),
  )
}

export function resolveProfilesForMode(mode, envValues = {}) {
  if (mode === 'full' && isProxyConfigured(envValues)) {
    return ['reverse-proxy']
  }
  return []
}

export function runCompose(repoRoot, subcommandArgs, options = {}) {
  const compose = detectComposeCommand(repoRoot)
  if (!compose) {
    throw new Error('未检测到 Docker Compose，请先安装并启动 Docker。')
  }

  const args = [
    ...buildComposeArgs(compose.prefixArgs, repoRoot, options),
    ...subcommandArgs,
  ]

  return runCommandOrThrow(compose.command, args, {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
    stdio: options.stdio || 'inherit',
    input: options.input,
  })
}

export function composeUp(repoRoot, options = {}) {
  const args = ['up']
  if (options.detach !== false) {
    args.push('-d')
  }
  if (options.build !== false) {
    args.push('--build')
  }
  if (options.services?.length) {
    args.push(...options.services)
  }
  return runCompose(repoRoot, args, options)
}

export function composeDown(repoRoot, options = {}) {
  const args = ['down']
  if (options.removeOrphans !== false) {
    args.push('--remove-orphans')
  }
  if (options.volumes) {
    args.push('-v')
  }
  return runCompose(repoRoot, args, options)
}

export function composeLogs(repoRoot, options = {}) {
  const args = ['logs']
  if (options.follow !== false) {
    args.push('-f')
  }
  if (options.tail) {
    args.push('--tail', String(options.tail))
  }
  if (options.services?.length) {
    args.push(...options.services)
  }
  return runCompose(repoRoot, args, options)
}

export function composePs(repoRoot, options = {}) {
  return runCompose(repoRoot, ['ps'], options)
}

export function composeConfig(repoRoot, options = {}) {
  return runCompose(repoRoot, ['config'], options)
}

export function restartAffectedServices(repoRoot, options = {}) {
  const services = Array.from(new Set((options.services || []).filter(Boolean)))
  return composeUp(repoRoot, {
    envFile: options.envFile,
    profiles: options.profiles || [],
    services,
    detach: true,
    build: true,
  })
}

export function getComposeStatus(repoRoot, options = {}) {
  const compose = detectComposeCommand(repoRoot)
  if (!compose) {
    return []
  }

  const args = [
    ...buildComposeArgs(compose.prefixArgs, repoRoot, options),
    'ps',
    '--format',
    'json',
  ]
  const result = runCommand(compose.command, args, {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
  })
  if (result.status !== 0 || !result.stdout.trim()) {
    return []
  }

  try {
    return JSON.parse(result.stdout)
  } catch {
    try {
      return result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    } catch {
      return []
    }
  }
}

function getComposeContainerName(item) {
  return String(item?.Name || item?.Names || '').trim()
}

export function getReverseProxyStatus(repoRoot, envValues = {}) {
  const composeStatus = getComposeStatus(repoRoot, {
    envFile: getManagementPaths(repoRoot).defaultEnvFile,
    profiles: resolveProfilesForMode('full', envValues),
  })
  const reverseProxy = composeStatus.find((item) => item.Service === 'reverse-proxy')
  return {
    composeStatus,
    reverseProxy,
    containerName: getComposeContainerName(reverseProxy),
    running: Boolean(reverseProxy),
  }
}

export function getProxyCertificateStatus(repoRoot = repoRootFallback, envValues = {}) {
  if (!isProxyConfigured(envValues)) {
    return {
      status: 'disabled',
      summary: '当前未启用反向代理，未托管 TLS 证书。',
      files: [],
    }
  }

  const reverseProxyStatus = getReverseProxyStatus(repoRoot, envValues)
  if (!reverseProxyStatus.running || !reverseProxyStatus.containerName) {
    return {
      status: 'warning',
      summary: '反向代理已配置，但 reverse-proxy 容器未运行，无法检查证书状态。',
      files: [],
    }
  }

  const result = runCommand('docker', [
    'exec',
    reverseProxyStatus.containerName,
    'sh',
    '-lc',
    'find /data -type f \\( -name "*.crt" -o -name "*.pem" -o -name "*.key" \\) 2>/dev/null | sort | sed -n "1,20p"',
  ], {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
  })

  if (result.status !== 0) {
    return {
      status: 'warning',
      summary: 'reverse-proxy 已运行，但读取 caddy_data 内证书文件失败。',
      files: [],
    }
  }

  const files = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const normalizedDomains = [normalizeDomain(envValues.PUBLIC_DOMAIN), normalizeDomain(envValues.ADMIN_DOMAIN)].filter(Boolean)
  const usesLocalhost = normalizedDomains.some((domain) => domain === 'localhost' || domain.endsWith('.localhost'))

  if (files.length === 0) {
    return {
      status: usesLocalhost ? 'warning' : 'pending',
      summary: usesLocalhost
        ? '当前域名为 localhost，本地模式通常不会生成公开 ACME 证书。'
        : 'reverse-proxy 已运行，但暂未在 caddy_data 中发现证书文件。',
      files: [],
    }
  }

  return {
    status: 'ok',
    summary: `已在 caddy_data 中发现 ${files.length} 个证书相关文件。`,
    files,
  }
}

export function getLogicalVolumeNames(repoRoot, options = {}) {
  const compose = detectComposeCommand(repoRoot)
  if (!compose) {
    return []
  }
  const args = [
    ...buildComposeArgs(compose.prefixArgs, repoRoot, options),
    'config',
    '--volumes',
  ]
  const result = runCommand(compose.command, args, {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
  })
  if (result.status !== 0) {
    return []
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function resolveManagedDockerVolumeNames(repoRoot, options = {}) {
  const logicalNames = new Set(getLogicalVolumeNames(repoRoot, options))
  if (logicalNames.size === 0) {
    return []
  }

  const dockerVolumeResult = runCommand('docker', ['volume', 'ls', '--format', '{{.Name}}'], {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
  })
  if (dockerVolumeResult.status !== 0) {
    return []
  }

  const dockerVolumes = dockerVolumeResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return dockerVolumes.filter((volumeName) => {
    if (logicalNames.has(volumeName)) {
      return true
    }
    return Array.from(logicalNames).some((logicalName) => volumeName.endsWith(`_${logicalName}`))
  })
}

export function removeManagedVolumes(repoRoot, options = {}) {
  const preserve = new Set(options.preserve || [])
  const names = resolveManagedDockerVolumeNames(repoRoot, options)
    .filter((volumeName) => !Array.from(preserve).some((logicalName) => volumeName === logicalName || volumeName.endsWith(`_${logicalName}`)))

  if (names.length === 0) {
    return []
  }

  runCommandOrThrow('docker', ['volume', 'rm', ...names], {
    cwd: repoRoot,
    env: getProcessEnv(repoRoot),
    stdio: 'inherit',
  })
  return names
}

function shouldAllowInsecureLocalTls(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost'))
  } catch {
    return false
  }
}

export async function checkHttpReady(url) {
  try {
    const target = new URL(url)
    const allowInsecureLocalTls = shouldAllowInsecureLocalTls(url)
    const client = target.protocol === 'https:' ? https : http

    return await new Promise((resolve) => {
      const request = client.request(target, {
        method: 'GET',
        rejectUnauthorized: allowInsecureLocalTls ? false : undefined,
      }, (response) => {
        const status = Number(response.statusCode || 0)
        response.resume()
        resolve(status >= 200 && status < 400)
      })

      request.setTimeout(4000, () => {
        request.destroy()
        resolve(false)
      })
      request.on('error', () => resolve(false))
      request.end()
    })
  } catch {
    return false
  }
}

export function buildSystemEndpoints(envValues = {}) {
  const adminPort = envValues.ADMIN_WEB_HOST_PORT || '8888'
  const sitePort = envValues.SITE_WEB_HOST_PORT || '1888'
  const invitePort = envValues.INVITE_WEB_HOST_PORT || '1788'
  const bffPort = envValues.BFF_HOST_PORT || '25500'
  const goPort = envValues.GO_API_HOST_PORT || '1029'
  const socketPort = envValues.SOCKET_HOST_PORT || '9898'
  const reverseProxyHttpPort = envValues.REVERSE_PROXY_HTTP_PORT || '80'
  const reverseProxyHttpsPort = envValues.REVERSE_PROXY_HTTPS_PORT || '443'
  const proxyEnabled = isProxyConfigured(envValues)

  return {
    adminWeb: envValues.ADMIN_WEB_BASE_URL || `http://127.0.0.1:${adminPort}`,
    siteWeb: envValues.SITE_WEB_BASE_URL || `http://127.0.0.1:${sitePort}`,
    inviteWeb: envValues.PUBLIC_LANDING_BASE_URL || `http://127.0.0.1:${invitePort}`,
    bffReady: `http://127.0.0.1:${bffPort}/ready`,
    goReady: `http://127.0.0.1:${goPort}/ready`,
    socketReady: `http://127.0.0.1:${socketPort}/ready`,
    publicDomain: proxyEnabled ? `https://${normalizeDomain(envValues.PUBLIC_DOMAIN)}` : '',
    adminDomain: proxyEnabled ? `https://${normalizeDomain(envValues.ADMIN_DOMAIN)}` : '',
    reverseProxyHttp: proxyEnabled ? `http://127.0.0.1:${reverseProxyHttpPort}` : '',
    reverseProxyHttps: proxyEnabled ? `https://127.0.0.1:${reverseProxyHttpsPort}` : '',
  }
}

export function shouldPreserveCaddyVolumes(envValues = {}) {
  return normalizeBoolean(envValues.KEEP_CADDY_DATA_ON_RESET ?? 'true', true)
}
