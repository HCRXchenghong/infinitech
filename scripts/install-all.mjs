import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const deployEnvFile = path.join(repoRoot, 'backend', 'docker', '.deploy.runtime.env')
const deployScript = path.join(repoRoot, 'scripts', 'deploy-all.mjs')
const isLinux = process.platform === 'linux'

function getCredentialHelperCandidates() {
  if (process.platform !== 'win32') {
    return []
  }

  return [
    'docker-credential-desktop.exe',
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-credential-desktop.exe',
  ]
}

function hasDockerCredentialHelper() {
  for (const candidate of getCredentialHelperCandidates()) {
    if (candidate.includes('\\')) {
      if (fs.existsSync(candidate)) {
        return true
      }
      continue
    }

    const result = spawnSync(candidate, ['list'], {
      cwd: repoRoot,
      stdio: 'ignore',
      shell: false,
    })
    if ((result.status ?? 1) === 0) {
      return true
    }
  }

  return false
}

function buildDockerCompatEnv() {
  const env = { ...process.env }

  if (process.platform !== 'win32' || hasDockerCredentialHelper()) {
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

const MIRROR_PROFILES = {
  official: {
    label: '官方源（默认）',
    npmRegistry: 'https://registry.npmjs.org/',
    goProxy: 'https://proxy.golang.org,direct',
    alpineMirror: '',
    dockerImageMirror: '',
    notes: '使用官方 Docker Hub、npm 和 Go Proxy。',
  },
  aliyun: {
    label: '阿里云镜像',
    npmRegistry: 'https://registry.npmmirror.com',
    goProxy: 'https://mirrors.aliyun.com/goproxy/,direct',
    alpineMirror: 'https://mirrors.aliyun.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'npm 使用 npmmirror，Go/Alpine 使用阿里云，Docker 镜像走 DaoCloud 加速。',
  },
  tencent: {
    label: '腾讯云镜像',
    npmRegistry: 'https://mirrors.cloud.tencent.com/npm/',
    goProxy: 'https://mirrors.tencent.com/go/,direct',
    alpineMirror: 'https://mirrors.tencent.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'Go、npm、Alpine 走腾讯云，Docker 镜像走 DaoCloud 加速。',
  },
  huawei: {
    label: '华为云镜像',
    npmRegistry: 'https://repo.huaweicloud.com/repository/npm/',
    goProxy: 'https://repo.huaweicloud.com/repository/goproxy/,direct',
    alpineMirror: 'https://repo.huaweicloud.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'Go、npm、Alpine 走华为云，Docker 镜像走 DaoCloud 加速。',
  },
  tsinghua: {
    label: '清华 / goproxy.cn 组合镜像',
    npmRegistry: 'https://mirrors.tuna.tsinghua.edu.cn/npm/',
    goProxy: 'https://goproxy.cn,direct',
    alpineMirror: 'https://mirrors.tuna.tsinghua.edu.cn/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'npm 和 Alpine 走清华，Go 走 goproxy.cn，Docker 镜像走 DaoCloud 加速。',
  },
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

function canRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false,
    env: getProcessEnv(),
  })
  return (result.status ?? 1) === 0
}

function getDockerCommandCandidates() {
  const candidates = [['docker']]

  if (process.platform === 'win32') {
    candidates.push([
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    ])
    candidates.push([
      'C:\\Program Files\\Docker\\Docker\\resources\\docker.exe',
    ])
  }

  return candidates
}

function getDockerComposeExecutableCandidates() {
  const candidates = process.platform === 'win32'
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
  const values = {}

  for (const line of content.split(/\r?\n/)) {
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

function writeEnvFile(filePath, values) {
  const currentValues = readEnvFile(filePath)
  const nextValues = { ...currentValues, ...values }
  const lines = Object.entries(nextValues)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
  return filePath
}

function parseOsRelease() {
  if (!isLinux) {
    return {}
  }
  const osReleasePath = '/etc/os-release'
  if (!fs.existsSync(osReleasePath)) {
    return {}
  }
  const content = fs.readFileSync(osReleasePath, 'utf8')
  const values = {}
  for (const line of content.split(/\r?\n/)) {
    const separator = line.indexOf('=')
    if (separator <= 0) {
      continue
    }
    const key = line.slice(0, separator)
    let value = line.slice(separator + 1).trim()
    value = value.replace(/^"/, '').replace(/"$/, '')
    values[key] = value
  }
  return values
}

function detectSystem() {
  const arch = os.arch()
  const platform = process.platform

  if (platform === 'win32') {
    return {
      platform,
      family: 'windows',
      name: 'Windows',
      arch,
      distro: 'windows',
      label: `Windows ${arch}`,
    }
  }

  if (platform === 'darwin') {
    return {
      platform,
      family: 'macos',
      name: arch === 'arm64' ? 'macOS Apple Silicon' : 'macOS',
      arch,
      distro: 'macos',
      label: `macOS ${arch}`,
    }
  }

  if (platform === 'linux') {
    const osRelease = parseOsRelease()
    const distro = String(osRelease.ID || '').toLowerCase()
    const prettyName = osRelease.PRETTY_NAME || 'Linux'
    return {
      platform,
      family: 'linux',
      name: prettyName,
      arch,
      distro,
      label: `${prettyName} ${arch}`,
    }
  }

  return {
    platform,
    family: 'unknown',
    name: platform,
    arch,
    distro: '',
    label: `${platform} ${arch}`,
  }
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
}

function buildAllowedOrigins(publicDomain, adminDomain) {
  const domains = [publicDomain, adminDomain].filter(Boolean)
  const origins = new Set([
    'http://127.0.0.1:8888',
    'http://localhost:8888',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
  ])

  for (const domain of domains) {
    origins.add(`https://${domain}`)
    origins.add(`http://${domain}`)
  }

  return Array.from(origins).join(',')
}

function dockerHubImageWithMirror(prefix, image) {
  if (!prefix) {
    return image
  }
  if (image.includes('/') && image.split('/')[0].includes('.')) {
    return image
  }
  if (image.includes('/')) {
    return `${prefix}/${image}`
  }
  return `${prefix}/library/${image}`
}

function buildMirrorEnv(profileKey) {
  const profile = MIRROR_PROFILES[profileKey] || MIRROR_PROFILES.official
  const prefix = profile.dockerImageMirror

  return {
    MIRROR_PROFILE: profileKey,
    NPM_REGISTRY: profile.npmRegistry,
    GOPROXY: profile.goProxy,
    ALPINE_MIRROR: profile.alpineMirror,
    NODE_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'node:20-alpine'),
    GO_BUILDER_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'golang:1.23-alpine'),
    GO_RUNTIME_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'alpine:3.20'),
    NGINX_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'nginx:1.27-alpine'),
    POSTGRES_IMAGE: dockerHubImageWithMirror(prefix, 'postgres:14-alpine'),
    REDIS_IMAGE: dockerHubImageWithMirror(prefix, 'redis:7-alpine'),
    CADDY_IMAGE: dockerHubImageWithMirror(prefix, 'caddy:2-alpine'),
    MYSQL_IMAGE: dockerHubImageWithMirror(prefix, 'mysql:8.0'),
    RABBITMQ_IMAGE: dockerHubImageWithMirror(prefix, 'rabbitmq:3-management-alpine'),
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
  }
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
      return candidate
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

  return null
}

function ensureDockerReady() {
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

function parseArgs(argv) {
  const flags = {
    mirrorProfile: '',
    withProxy: false,
    publicDomain: '',
    adminDomain: '',
    caddyEmail: '',
    noDeploy: false,
    yes: false,
  }

  for (const arg of argv) {
    if (arg === '--proxy' || arg === '--reverse-proxy') {
      flags.withProxy = true
      continue
    }
    if (arg === '--no-deploy' || arg === '--install-only') {
      flags.noDeploy = true
      continue
    }
    if (arg === '--yes') {
      flags.yes = true
      continue
    }
    if (arg.startsWith('--mirror-profile=')) {
      flags.mirrorProfile = arg.slice('--mirror-profile='.length).trim().toLowerCase()
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
      flags.caddyEmail = arg.slice('--caddy-email='.length).trim()
    }
  }

  return flags
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

async function chooseMirrorProfile(flags) {
  if (flags.mirrorProfile && MIRROR_PROFILES[flags.mirrorProfile]) {
    return flags.mirrorProfile
  }

  if (flags.yes || !input.isTTY) {
    return 'official'
  }

  console.log('\n请选择镜像源：')
  console.log('  1. 官方源（默认）')
  console.log('  2. 阿里云镜像')
  console.log('  3. 腾讯云镜像')
  console.log('  4. 华为云镜像')
  console.log('  5. 清华 / goproxy.cn 组合镜像')

  const choice = await prompt('输入数字选项', '1')
  switch (choice) {
    case '2':
      return 'aliyun'
    case '3':
      return 'tencent'
    case '4':
      return 'huawei'
    case '5':
      return 'tsinghua'
    case '1':
    default:
      return 'official'
  }
}

async function chooseDeploymentMode(flags) {
  const result = {
    withProxy: flags.withProxy,
    publicDomain: flags.publicDomain,
    adminDomain: flags.adminDomain,
    caddyEmail: flags.caddyEmail,
  }

  if (flags.withProxy) {
    return normalizeProxyConfig(result)
  }

  if (flags.yes || !input.isTTY) {
    return normalizeProxyConfig(result)
  }

  console.log('\n请选择部署方式：')
  console.log('  1. 启动核心服务（默认）')
  console.log('  2. 启动完整服务 + 域名反向代理')

  const choice = await prompt('输入数字选项', '1')
  if (choice !== '2') {
    return normalizeProxyConfig(result)
  }

  result.withProxy = true
  result.publicDomain = normalizeDomain(
    await prompt('请输入 API / 业务域名', flags.publicDomain || 'api.example.com'),
  )
  const defaultAdminDomain =
    result.publicDomain && !flags.adminDomain
      ? `admin.${result.publicDomain}`
      : flags.adminDomain || 'admin.example.com'
  result.adminDomain = normalizeDomain(await prompt('请输入后台域名', defaultAdminDomain))
  result.caddyEmail = await prompt('请输入 Caddy 证书邮箱', flags.caddyEmail || 'ops@example.com')
  return normalizeProxyConfig(result)
}

function normalizeProxyConfig(config) {
  if (!config.withProxy) {
    return {
      withProxy: false,
      publicDomain: '',
      adminDomain: '',
      caddyEmail: '',
    }
  }

  const publicDomain = normalizeDomain(config.publicDomain)
  if (!publicDomain) {
    throw new Error('启用反向代理时必须提供业务域名。')
  }

  return {
    withProxy: true,
    publicDomain,
    adminDomain: normalizeDomain(config.adminDomain || `admin.${publicDomain}`),
    caddyEmail: String(config.caddyEmail || '').trim() || 'ops@example.com',
  }
}

function writeRuntimeEnv(profileKey, deployMode) {
  const mirrorEnv = buildMirrorEnv(profileKey)
  const extraEnv = deployMode.withProxy
    ? {
        PUBLIC_DOMAIN: deployMode.publicDomain,
        ADMIN_DOMAIN: deployMode.adminDomain,
        CADDY_EMAIL: deployMode.caddyEmail,
        ADMIN_WEB_BASE_URL: `https://${deployMode.adminDomain}`,
        ALLOWED_ORIGINS: buildAllowedOrigins(deployMode.publicDomain, deployMode.adminDomain),
      }
    : {}

  return writeEnvFile(deployEnvFile, {
    ...mirrorEnv,
    ...extraEnv,
  })
}

function printSystemSummary(system) {
  console.log(`\n检测到系统：${system.label}`)
  if (system.family === 'linux') {
    console.log(`发行版：${system.distro || 'unknown'}`)
  }
}

function printMirrorSummary(profileKey) {
  const profile = MIRROR_PROFILES[profileKey]
  console.log(`\n镜像源：${profile.label}`)
  console.log(`npm registry: ${profile.npmRegistry}`)
  console.log(`GOPROXY: ${profile.goProxy}`)
  console.log(`Alpine mirror: ${profile.alpineMirror || '官方默认'}`)
  console.log(`Docker image mirror: ${profile.dockerImageMirror || '官方默认'}`)
  console.log(`说明：${profile.notes}`)
}

function printDockerCompatHint() {
  const env = getProcessEnv()
  if (env.INFINITECH_DOCKER_COMPAT === '1') {
    console.log('\n检测到本机缺少 docker-credential-desktop，脚本将临时绕过 credential helper 继续拉取公开镜像。')
  }
}

function getInstallerHints() {
  const installCmd = path.join(repoRoot, 'scripts', 'install-all.cmd')
  const installPs1 = path.join(repoRoot, 'scripts', 'install-all.ps1')
  const installSh = path.join(repoRoot, 'scripts', 'install-all.sh')

  if (process.platform === 'win32') {
    return {
      cmd: installCmd,
      ps: `powershell -ExecutionPolicy Bypass -File "${installPs1}"`,
      shell: installCmd,
    }
  }

  return {
    cmd: installSh,
    ps: installSh,
    shell: `bash "${installSh}"`,
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const system = detectSystem()
  printSystemSummary(system)

  const mirrorProfile = await chooseMirrorProfile(flags)
  printMirrorSummary(mirrorProfile)

  const deployMode = await chooseDeploymentMode(flags)
  const envFile = writeRuntimeEnv(mirrorProfile, deployMode)

  console.log(`\n运行时环境文件已写入：${envFile}`)

  if (flags.noDeploy) {
    console.log('已完成依赖环境与镜像源准备，按要求跳过部署。')
    return
  }

  if (!ensureDockerReady()) {
    const hints = getInstallerHints()
    throw new Error(
      `Docker 已安装但当前未就绪。\n请先手动打开 Docker Desktop 或确认 Docker Engine 已启动，然后重新执行：\n- Windows CMD：${hints.cmd}\n- Windows PowerShell：${hints.ps}\n- Linux / macOS：${hints.shell}`,
    )
  }

  const compose = detectComposeCommand()
  if (!compose) {
    const hints = getInstallerHints()
    throw new Error(
      `未检测到 Docker Compose。\n请先确认 Docker Desktop 已完整安装并完成首次初始化，然后重新执行：\n- Windows CMD：${hints.cmd}\n- Windows PowerShell：${hints.ps}\n- Linux / macOS：${hints.shell}`,
    )
  }

  printDockerCompatHint()

  const deployArgs = ['scripts/deploy-all.mjs', 'up', `--env-file=${envFile}`]
  if (deployMode.withProxy) {
    deployArgs.push('--profile=reverse-proxy')
  }

  console.log('\n开始启动 Docker 全栈服务...')
  const exitCode = run(process.execPath, deployArgs)
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
