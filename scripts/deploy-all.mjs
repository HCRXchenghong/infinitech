import fs from 'node:fs'
import path from 'node:path'
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

function canRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false,
  })
  return (result.status ?? 1) === 0
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
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

  const legacyCommand = isWindows ? 'docker-compose.exe' : 'docker-compose'
  candidates.push({ command: legacyCommand, prefixArgs: [], probeArgs: ['version'] })

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
  origins.add('http://127.0.0.1:8080')
  origins.add('http://localhost:8080')

  return Array.from(origins).join(',')
}

function writeDeployEnvFile(config) {
  const currentValues = readEnvFile(deployEnvFile)
  const nextValues = {
    ...currentValues,
    PUBLIC_DOMAIN: config.publicDomain || currentValues.PUBLIC_DOMAIN || 'localhost',
    ADMIN_DOMAIN: config.adminDomain || currentValues.ADMIN_DOMAIN || 'admin.localhost',
    CADDY_EMAIL: config.caddyEmail || currentValues.CADDY_EMAIL || 'ops@example.com',
    ADMIN_WEB_BASE_URL:
      config.adminWebBaseUrl || currentValues.ADMIN_WEB_BASE_URL || 'http://127.0.0.1:8080',
    ALLOWED_ORIGINS:
      config.allowedOrigins ||
      currentValues.ALLOWED_ORIGINS ||
      'http://127.0.0.1:8888,http://localhost:8888,http://127.0.0.1:8080,http://localhost:8080',
  }

  const lines = Object.entries(nextValues).map(([key, value]) => `${key}=${value}`)

  fs.writeFileSync(deployEnvFile, `${lines.join('\n')}\n`, 'utf8')
  return deployEnvFile
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

function printUpSummary(flags) {
  console.log('\nServices are starting. Key endpoints:')
  console.log('  Go API:        http://127.0.0.1:1029/ready')
  console.log('  BFF:           http://127.0.0.1:25500/ready')
  console.log('  Socket Server: http://127.0.0.1:9898/ready')
  console.log('  Admin Web:     http://127.0.0.1:8080')
  console.log('  PostgreSQL:    127.0.0.1:5432')
  console.log('  Redis:         127.0.0.1:2550')

  if (flags.withProxy && flags.publicDomain) {
    console.log(`  Public Domain: https://${flags.publicDomain}`)
    console.log(`  Admin Domain:  https://${flags.adminDomain}`)
  }

  console.log('\nUse `node scripts/deploy-all.mjs logs` to inspect startup logs.')
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
  const adminWebBaseUrl = `https://${adminDomain}`
  const allowedOrigins = buildAllowedOrigins(publicDomain, adminDomain)

  writeDeployEnvFile({
    publicDomain,
    adminDomain,
    caddyEmail,
    adminWebBaseUrl,
    allowedOrigins,
  })

  flags.envFile = deployEnvFile
  flags.adminDomain = adminDomain
  flags.publicDomain = publicDomain
  flags.caddyEmail = caddyEmail

  if (!flags.profiles.includes('reverse-proxy')) {
    flags.profiles.push('reverse-proxy')
  }

  return flags
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  const needsInteractive = parsed.flags.interactive || (!parsed.action && input.isTTY)

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

  const compose = detectComposeCommand()
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

  const exitCode = run(compose.command, args)
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  if (parsed.action === 'up' || parsed.action === 'restart') {
    printUpSummary(parsed.flags)
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
