import fs from 'node:fs'
import path from 'node:path'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { getProcessEnv } from './orchestrator.mjs'
import { runCommand, runCommandOrThrow } from './utils.mjs'

function getAdminToolPath(repoRoot = repoRootFallback) {
  const paths = getManagementPaths(repoRoot)
  return path.join(paths.binDir, process.platform === 'win32' ? 'infinitech-admin.exe' : 'infinitech-admin')
}

function getAdminScriptPath(repoRoot = repoRootFallback) {
  return path.join(getManagementPaths(repoRoot).backendGoDir, 'scripts', 'admin-maintenance.go')
}

function getAdminToolSourcePaths(repoRoot = repoRootFallback) {
  const { backendGoDir } = getManagementPaths(repoRoot)
  return [
    getAdminScriptPath(repoRoot),
    path.join(backendGoDir, 'internal', 'admincli', 'admincli.go'),
  ]
}

function hasGoTool(repoRoot = repoRootFallback) {
  const result = runCommand('go', ['version'], {
    cwd: getManagementPaths(repoRoot).backendGoDir,
    env: getProcessEnv(repoRoot),
  })
  return result.status === 0
}

function shouldRebuildAdminTool(binaryPath, repoRoot = repoRootFallback) {
  if (!fs.existsSync(binaryPath)) {
    return true
  }
  const binaryMtime = fs.statSync(binaryPath).mtimeMs
  return getAdminToolSourcePaths(repoRoot).some((sourcePath) => {
    if (!fs.existsSync(sourcePath)) {
      return false
    }
    return fs.statSync(sourcePath).mtimeMs > binaryMtime
  })
}

export function ensureAdminToolBuilt(repoRoot = repoRootFallback) {
  const binaryPath = getAdminToolPath(repoRoot)
  if (!shouldRebuildAdminTool(binaryPath, repoRoot)) {
    return binaryPath
  }
  if (!hasGoTool(repoRoot)) {
    return ''
  }

  const backendGoDir = getManagementPaths(repoRoot).backendGoDir
  fs.mkdirSync(path.dirname(binaryPath), { recursive: true })
  runCommandOrThrow('go', ['build', '-o', binaryPath, './scripts/admin-maintenance.go'], {
    cwd: backendGoDir,
    env: getProcessEnv(repoRoot),
    stdio: 'inherit',
  })
  return binaryPath
}

function buildInvocation(repoRoot = repoRootFallback) {
  const backendGoDir = getManagementPaths(repoRoot).backendGoDir
  const binaryPath = ensureAdminToolBuilt(repoRoot)
  if (binaryPath && fs.existsSync(binaryPath)) {
    return {
      command: binaryPath,
      args: [],
      cwd: backendGoDir,
    }
  }

  if (!hasGoTool(repoRoot)) {
    throw new Error('未检测到 Go 工具链，管理员维护能力不可用，请先运行安装器修复依赖。')
  }

  return {
    command: 'go',
    args: ['run', getAdminScriptPath(repoRoot)],
    cwd: backendGoDir,
  }
}

export function runAdminMaintenance(repoRoot = repoRootFallback, options = {}) {
  const invocation = buildInvocation(repoRoot)
  const args = [
    ...invocation.args,
    '--json',
    `--action=${options.action || 'list'}`,
    ...(options.selector?.id ? [`--id=${options.selector.id}`] : []),
    ...(options.selector?.phone ? [`--phone=${options.selector.phone}`] : []),
    ...(options.selector?.uid ? [`--uid=${options.selector.uid}`] : []),
    ...(options.selector?.tsid ? [`--tsid=${options.selector.tsid}`] : []),
    ...(options.name ? [`--name=${options.name}`] : []),
    ...(options.newPhone ? [`--new-phone=${options.newPhone}`] : []),
    ...(options.phone ? [`--phone=${options.phone}`] : []),
    ...(options.type ? [`--type=${options.type}`] : []),
    ...(options.password ? [`--password=${options.password}`] : []),
    ...(options.generate ? ['--generate'] : []),
    ...(options.passwordLength ? [`--password-length=${options.passwordLength}`] : []),
    ...(options.confirm ? [`--confirm=${options.confirm}`] : []),
    ...(options.envFile ? [`--env-file=${options.envFile}`] : []),
  ]

  const result = runCommand(invocation.command, args, {
    cwd: invocation.cwd,
    env: getProcessEnv(repoRoot),
    input: options.input,
  })

  const outputText = result.stdout.trim() || result.stderr.trim()
  let payload = null
  try {
    payload = outputText ? JSON.parse(outputText) : null
  } catch {
    payload = null
  }

  if (result.status !== 0) {
    throw new Error(payload?.error || outputText || '管理员维护命令执行失败')
  }
  if (!payload?.success) {
    throw new Error(payload?.error || '管理员维护命令执行失败')
  }
  return payload
}
