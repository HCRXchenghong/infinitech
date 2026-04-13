import { repoRootFallback } from './lib/management/paths.mjs'
import { runCli } from './lib/management/cli.mjs'

function parseArgs(argv) {
  const flags = {
    attach: false,
    noBuild: false,
    interactive: false,
    proxy: false,
    publicDomain: '',
    adminDomain: '',
    caddyEmail: '',
    envFile: '',
  }
  const services = []
  const positionals = []

  for (const token of argv) {
    if (token === '--help' || token === '-h') {
      flags.help = true
      continue
    }
    if (token === '--attach') {
      flags.attach = true
      continue
    }
    if (token === '--no-build') {
      flags.noBuild = true
      continue
    }
    if (token === '--interactive') {
      flags.interactive = true
      continue
    }
    if (token === '--proxy' || token === '--reverse-proxy') {
      flags.proxy = true
      continue
    }
    if (token.startsWith('--public-domain=')) {
      flags.publicDomain = token.slice('--public-domain='.length).trim()
      flags.proxy = true
      continue
    }
    if (token.startsWith('--admin-domain=')) {
      flags.adminDomain = token.slice('--admin-domain='.length).trim()
      continue
    }
    if (token.startsWith('--caddy-email=')) {
      flags.caddyEmail = token.slice('--caddy-email='.length).trim()
      continue
    }
    if (token.startsWith('--env-file=')) {
      flags.envFile = token.slice('--env-file='.length).trim()
      continue
    }
    if (token.startsWith('--')) {
      continue
    }
    positionals.push(token)
  }

  const action = positionals[0] || ''
  if (action === 'logs') {
    services.push(...positionals.slice(1))
  }

  return { action, services, flags }
}

function printLegacyHelp() {
  console.log(`Infinitech 旧部署入口兼容层

用法:
  node scripts/deploy-all.mjs
  node scripts/deploy-all.mjs up [--no-build] [--attach]
  node scripts/deploy-all.mjs up --proxy --public-domain=www.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
  node scripts/deploy-all.mjs down
  node scripts/deploy-all.mjs restart
  node scripts/deploy-all.mjs logs [service...]
  node scripts/deploy-all.mjs ps
  node scripts/deploy-all.mjs config
  node scripts/deploy-all.mjs --interactive

说明:
  此脚本已委托到新的 Infinitech 管理控制台。
  以后可直接在任意目录输入 infinitech 或 infinite。`)
}

async function maybeConfigureProxy(parsed) {
  if (!parsed.flags.proxy) {
    return
  }

  const cliArgs = ['proxy', 'configure']
  if (parsed.flags.publicDomain) {
    cliArgs.push(`--public-domain=${parsed.flags.publicDomain}`)
  }
  if (parsed.flags.adminDomain) {
    cliArgs.push(`--admin-domain=${parsed.flags.adminDomain}`)
  }
  if (parsed.flags.caddyEmail) {
    cliArgs.push(`--caddy-email=${parsed.flags.caddyEmail}`)
  }
  if (parsed.flags.envFile) {
    cliArgs.push(`--env-file=${parsed.flags.envFile}`)
  }
  await runCli(cliArgs, repoRootFallback)
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))

  if (parsed.flags.help) {
    printLegacyHelp()
    return
  }

  if (parsed.flags.interactive || !parsed.action) {
    console.log('已切换到新的 Infinitech 管理控制台。后续可直接使用 `infinitech` 或 `infinite`。')
    await runCli(['menu'], repoRootFallback)
    return
  }

  const passThrough = parsed.flags.envFile ? [`--env-file=${parsed.flags.envFile}`] : []
  switch (parsed.action) {
    case 'up':
      await maybeConfigureProxy(parsed)
      await runCli([
        'stack',
        parsed.flags.proxy ? 'up-all' : 'up',
        ...(parsed.flags.attach ? ['--attach=true'] : []),
        ...(parsed.flags.noBuild ? ['--no-build=true'] : []),
        ...passThrough,
      ], repoRootFallback)
      break
    case 'down':
      await runCli(['stack', 'down', ...passThrough], repoRootFallback)
      break
    case 'restart':
      await maybeConfigureProxy(parsed)
      await runCli(['stack', 'restart', ...passThrough], repoRootFallback)
      break
    case 'logs':
      await runCli(['stack', 'logs', ...parsed.services, ...passThrough], repoRootFallback)
      break
    case 'ps':
      await runCli(['stack', 'ps', ...passThrough], repoRootFallback)
      break
    case 'config':
      await runCli(['stack', 'config', ...passThrough], repoRootFallback)
      break
    default:
      throw new Error(`不支持的 deploy-all 动作：${parsed.action}`)
  }

  console.log('\n旧入口兼容执行完成。以后可直接使用 `infinitech` 或 `infinite`。')
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
