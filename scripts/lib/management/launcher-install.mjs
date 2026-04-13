import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runCommand, runCommandOrThrow } from './utils.mjs'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { resolveRepoContext, writeInstallManifest } from './install-manifest.mjs'
import { ensureAdminToolBuilt } from './admin-maintenance.mjs'

function isWritableDirectory(directoryPath) {
  try {
    fs.accessSync(directoryPath, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function isStableUserBinDir(entry, homeDir) {
  const normalized = path.resolve(entry)
  if (!normalized.startsWith(homeDir)) {
    return false
  }
  if (normalized.includes(`${path.sep}.codex${path.sep}tmp${path.sep}`)) {
    return false
  }
  if (normalized.includes(`${path.sep}.vscode${path.sep}extensions${path.sep}`)) {
    return false
  }
  return path.basename(normalized) === 'bin'
}

export function pickPosixBinDir(homeDir = os.homedir(), pathValue = process.env.PATH || '') {
  const preferred = [
    path.join(homeDir, '.local', 'bin'),
    path.join(homeDir, 'bin'),
  ]
  const pathEntries = String(pathValue)
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const entry of preferred) {
    if (pathEntries.includes(entry) && fs.existsSync(entry) && isWritableDirectory(entry)) {
      return entry
    }
  }

  for (const entry of pathEntries) {
    if (!isStableUserBinDir(entry, homeDir)) {
      continue
    }
    if (fs.existsSync(entry) && isWritableDirectory(entry)) {
      return entry
    }
  }

  return path.join(homeDir, '.local', 'bin')
}

function selectPosixBinDir() {
  return pickPosixBinDir()
}

function selectWindowsBinDir(repoRoot) {
  const paths = getManagementPaths(repoRoot)
  return paths.binDir
}

function getShellProfileCandidates() {
  const shell = String(process.env.SHELL || '').trim().toLowerCase()
  const homeDir = os.homedir()
  if (shell.includes('zsh')) {
    return [path.join(homeDir, '.zprofile'), path.join(homeDir, '.zshrc')]
  }
  if (shell.includes('bash')) {
    return [path.join(homeDir, '.bash_profile'), path.join(homeDir, '.bashrc'), path.join(homeDir, '.profile')]
  }
  return [path.join(homeDir, '.profile')]
}

function ensurePosixPath(binDir) {
  const touched = []
  const markerStart = '# >>> infinitech cli >>>'
  const markerEnd = '# <<< infinitech cli <<<'
  const block = `${markerStart}\nexport PATH="${binDir}:$PATH"\n${markerEnd}\n`
  const alreadyInPath = String(process.env.PATH || '')
    .split(path.delimiter)
    .includes(binDir)

  for (const profilePath of getShellProfileCandidates()) {
    const existing = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf8') : ''
    if (existing.includes(markerStart)) {
      touched.push(profilePath)
      continue
    }
    if (!alreadyInPath) {
      fs.appendFileSync(profilePath, `\n${block}`, 'utf8')
      touched.push(profilePath)
      break
    }
  }

  return touched
}

function ensureWindowsPath(binDir) {
  const currentUserPath = String(process.env.PATH || '')
  if (currentUserPath.split(path.delimiter).includes(binDir)) {
    return []
  }

  const escapedBinDir = binDir.replace(/'/g, "''")
  const command = [
    '$current = [Environment]::GetEnvironmentVariable("Path", "User")',
    `$target = '${escapedBinDir}'`,
    'if ([string]::IsNullOrWhiteSpace($current)) { $next = $target }',
    'elseif ($current.Split(";") -contains $target) { $next = $current }',
    'else { $next = "$current;$target" }',
    '[Environment]::SetEnvironmentVariable("Path", $next, "User")',
  ].join('; ')
  runCommandOrThrow('powershell.exe', ['-NoProfile', '-Command', command], {
    env: process.env,
    stdio: 'ignore',
  })
  return ['UserPath']
}

function writeLauncherScript(repoRoot) {
  const context = resolveRepoContext(repoRoot)
  const paths = context.paths
  fs.mkdirSync(paths.configDir, { recursive: true })
  const launcherSource = `#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const manifestPath = ${JSON.stringify(paths.manifestPath)};
let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    manifest = null;
  }
}
const repoRoot = manifest && manifest.repoRoot ? manifest.repoRoot : ${JSON.stringify(repoRoot)};
const cliPath = path.join(repoRoot, 'scripts', 'management-cli.mjs');
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], { stdio: 'inherit', cwd: repoRoot, env: process.env });
process.exit(result.status === null ? 1 : result.status);
`
  fs.writeFileSync(paths.launcherScriptPath, launcherSource, 'utf8')
  if (process.platform !== 'win32') {
    fs.chmodSync(paths.launcherScriptPath, 0o755)
  }
  return paths.launcherScriptPath
}

function writePosixWrappers(binDir, launcherScriptPath) {
  fs.mkdirSync(binDir, { recursive: true })
  const wrapper = `#!/usr/bin/env bash
set -euo pipefail
node ${JSON.stringify(launcherScriptPath)} "$@"
`
  const installed = []
  for (const name of ['infinitech', 'infinite']) {
    const target = path.join(binDir, name)
    fs.writeFileSync(target, wrapper, 'utf8')
    fs.chmodSync(target, 0o755)
    installed.push(target)
  }
  return installed
}

function writeWindowsWrappers(binDir, launcherScriptPath) {
  fs.mkdirSync(binDir, { recursive: true })
  const installed = []
  for (const name of ['infinitech', 'infinite']) {
    const cmdPath = path.join(binDir, `${name}.cmd`)
    fs.writeFileSync(
      cmdPath,
      `@echo off\r\nnode "${launcherScriptPath}" %*\r\n`,
      'utf8',
    )
    installed.push(cmdPath)

    const ps1Path = path.join(binDir, `${name}.ps1`)
    fs.writeFileSync(
      ps1Path,
      `node "${launcherScriptPath}" $args\r\n`,
      'utf8',
    )
    installed.push(ps1Path)
  }
  return installed
}

export function installGlobalLaunchers(repoRoot = repoRootFallback) {
  const paths = getManagementPaths(repoRoot)
  const launcherScriptPath = writeLauncherScript(repoRoot)
  const binDir = process.platform === 'win32' ? selectWindowsBinDir(repoRoot) : selectPosixBinDir()
  const launcherPaths = process.platform === 'win32'
    ? writeWindowsWrappers(binDir, launcherScriptPath)
    : writePosixWrappers(binDir, launcherScriptPath)
  const shellProfilesTouched = process.platform === 'win32'
    ? ensureWindowsPath(binDir)
    : ensurePosixPath(binDir)

  const adminToolPath = ensureAdminToolBuilt(repoRoot)
  const manifest = writeInstallManifest({
    repoRoot,
    runtimeEnvPath: paths.defaultEnvFile,
    launcherPath: launcherPaths[0] || '',
    launcherPaths,
    platform: process.platform,
    shellProfilesTouched,
    adminToolPath,
    installedAt: new Date().toISOString(),
  }, repoRoot)

  return {
    binDir,
    launcherScriptPath,
    launcherPaths,
    shellProfilesTouched,
    manifest,
    adminToolPath,
  }
}
