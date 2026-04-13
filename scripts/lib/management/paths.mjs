import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const repoRootFallback = path.resolve(__dirname, '..', '..', '..')
export const composeFileName = 'docker-compose.yml'
export const runtimeEnvFileName = '.deploy.runtime.env'

function resolveConfigBaseDir() {
  if (process.platform === 'win32') {
    return process.env.APPDATA
      ? path.resolve(process.env.APPDATA)
      : path.join(os.homedir(), 'AppData', 'Roaming')
  }

  return process.env.XDG_CONFIG_HOME
    ? path.resolve(process.env.XDG_CONFIG_HOME)
    : path.join(os.homedir(), '.config')
}

export function getManagementPaths(repoRoot = repoRootFallback) {
  const configDir = path.join(resolveConfigBaseDir(), 'infinitech')
  const binDir = path.join(configDir, 'bin')
  const backupDir = path.join(configDir, 'backups', 'env')
  const launcherScriptPath = path.join(configDir, 'launcher.mjs')
  const manifestPath = path.join(configDir, 'install.json')
  const repoScriptsDir = path.join(repoRoot, 'scripts')

  return {
    repoRoot,
    repoScriptsDir,
    backendGoDir: path.join(repoRoot, 'backend', 'go'),
    composeFile: path.join(repoRoot, 'backend', 'docker', composeFileName),
    defaultEnvFile: path.join(repoRoot, 'backend', 'docker', runtimeEnvFileName),
    readmeFile: path.join(repoRoot, 'README.md'),
    configDir,
    binDir,
    backupDir,
    launcherScriptPath,
    manifestPath,
  }
}

