import { repoRootFallback } from './lib/management/paths.mjs'
import { runCli } from './lib/management/cli.mjs'

try {
  await runCli(process.argv.slice(2), repoRootFallback)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

