import fs from 'node:fs'
import path from 'node:path'
import { getManagementPaths, repoRootFallback } from './paths.mjs'

export function readInstallManifest(repoRoot = repoRootFallback) {
  const { manifestPath } = getManagementPaths(repoRoot)
  if (!fs.existsSync(manifestPath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    return null
  }
}

export function writeInstallManifest(payload, repoRoot = repoRootFallback) {
  const paths = getManagementPaths(repoRoot)
  const current = readInstallManifest(repoRoot) || {}
  const nextManifest = {
    ...current,
    ...payload,
    repoRoot: payload.repoRoot || current.repoRoot || repoRoot,
    runtimeEnvPath:
      payload.runtimeEnvPath || current.runtimeEnvPath || path.join(repoRoot, 'backend', 'docker', '.deploy.runtime.env'),
    installedAt: payload.installedAt || current.installedAt || new Date().toISOString(),
  }

  fs.mkdirSync(paths.configDir, { recursive: true })
  fs.writeFileSync(paths.manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8')
  return nextManifest
}

export function resolveRepoContext(repoRoot = repoRootFallback, explicitRuntimeEnvPath = '') {
  const manifest = readInstallManifest(repoRoot)
  const effectiveRepoRoot =
    manifest?.repoRoot && fs.existsSync(manifest.repoRoot)
      ? manifest.repoRoot
      : repoRoot
  const paths = getManagementPaths(effectiveRepoRoot)
  const runtimeEnvOverride = String(explicitRuntimeEnvPath || process.env.INFINITECH_RUNTIME_ENV_PATH || '').trim()
  const resolvedOverride = runtimeEnvOverride
    ? path.resolve(effectiveRepoRoot, runtimeEnvOverride)
    : ''

  return {
    manifest,
    paths,
    repoRoot: effectiveRepoRoot,
    runtimeEnvPath:
      resolvedOverride && fs.existsSync(path.dirname(resolvedOverride))
        ? resolvedOverride
        : manifest?.runtimeEnvPath && fs.existsSync(path.dirname(manifest.runtimeEnvPath))
        ? manifest.runtimeEnvPath
        : paths.defaultEnvFile,
  }
}
