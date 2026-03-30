import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const composeFile = path.join(repoRoot, 'backend', 'docker', 'docker-compose.yml')
const isWindows = process.platform === 'win32'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 0
}

function detectComposeCommand() {
  const dockerCompose = spawnSync('docker', ['compose', 'version'], {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false
  })
  if ((dockerCompose.status ?? 1) === 0) {
    return { command: 'docker', prefixArgs: ['compose'] }
  }

  const legacyCommand = isWindows ? 'docker-compose.exe' : 'docker-compose'
  const legacyCompose = spawnSync(legacyCommand, ['version'], {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false
  })
  if ((legacyCompose.status ?? 1) === 0) {
    return { command: legacyCommand, prefixArgs: [] }
  }

  throw new Error('Docker Compose is not available. Install Docker Desktop or docker-compose first.')
}

function parseArgs(argv) {
  const positional = []
  const flags = {
    profiles: [],
    build: true,
    detach: true
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
    if (arg.startsWith('--profile=')) {
      const profile = arg.slice('--profile='.length).trim()
      if (profile) {
        flags.profiles.push(profile)
      }
      continue
    }
    positional.push(arg)
  }

  return {
    action: positional[0] || 'up',
    services: positional.slice(1),
    flags
  }
}

function buildComposeArgs(prefixArgs, flags) {
  const args = [...prefixArgs, '-f', composeFile]
  for (const profile of flags.profiles) {
    args.push('--profile', profile)
  }
  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/deploy-all.mjs up [--no-build] [--attach] [--profile=legacy-mysql] [--profile=messaging]
  node scripts/deploy-all.mjs down
  node scripts/deploy-all.mjs restart
  node scripts/deploy-all.mjs logs [service...]
  node scripts/deploy-all.mjs ps
  node scripts/deploy-all.mjs config
`)
}

function printUpSummary() {
  console.log('\nServices are starting. Key endpoints:')
  console.log('  Go API:        http://127.0.0.1:1029/ready')
  console.log('  BFF:           http://127.0.0.1:25500/ready')
  console.log('  Socket Server: http://127.0.0.1:9898/ready')
  console.log('  PostgreSQL:    127.0.0.1:5432')
  console.log('  Redis:         127.0.0.1:2550')
  console.log('\nUse `node scripts/deploy-all.mjs logs` to inspect startup logs.')
}

function main() {
  const { action, services, flags } = parseArgs(process.argv.slice(2))
  if (action === 'help' || action === '--help' || action === '-h') {
    printUsage()
    return
  }

  const compose = detectComposeCommand()
  const baseArgs = buildComposeArgs(compose.prefixArgs, flags)

  let args
  switch (action) {
    case 'up':
      args = [...baseArgs, 'up']
      if (flags.detach) {
        args.push('-d')
      }
      if (flags.build) {
        args.push('--build')
      }
      if (services.length > 0) {
        args.push(...services)
      }
      break
    case 'down':
      args = [...baseArgs, 'down', '--remove-orphans']
      break
    case 'restart':
      args = [...baseArgs, 'up', '-d', '--build']
      if (services.length > 0) {
        args.push(...services)
      }
      break
    case 'logs':
      args = [...baseArgs, 'logs', '-f']
      if (services.length > 0) {
        args.push(...services)
      }
      break
    case 'ps':
      args = [...baseArgs, 'ps']
      break
    case 'config':
      args = [...baseArgs, 'config']
      break
    default:
      throw new Error(`Unsupported action: ${action}`)
  }

  const exitCode = run(compose.command, args)
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  if (action === 'up' || action === 'restart') {
    printUpSummary()
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
