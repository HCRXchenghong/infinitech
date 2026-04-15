import fs from 'node:fs'
import path from 'node:path'
import { buildConfigSchema, getConfigMeta, getSensitiveKeys, validateConfigValue } from './config-schema.mjs'
import { readInstallManifest, resolveRepoContext } from './install-manifest.mjs'
import { buildAllowedOrigins, buildSystemEndpoints, checkHttpReady, composeUp, restartAffectedServices, resolveProfilesForMode } from './orchestrator.mjs'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { checkPortInUse, ensureDirectory, fileExists, maskSecret, timestampLabel } from './utils.mjs'

export function readEnvFile(filePath) {
  if (!fileExists(filePath)) {
    return {}
  }

  const values = {}
  const content = fs.readFileSync(filePath, 'utf8')
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

function collectOrderedKeys(filePath, nextValues) {
  const ordered = []
  if (fileExists(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
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
      if (key && !ordered.includes(key)) {
        ordered.push(key)
      }
    }
  }

  for (const key of Object.keys(nextValues)) {
    if (!ordered.includes(key)) {
      ordered.push(key)
    }
  }

  return ordered
}

export function writeEnvFile(filePath, values) {
  const orderedKeys = collectOrderedKeys(filePath, values)
  const lines = orderedKeys
    .filter((key) => values[key] !== undefined && values[key] !== null)
    .map((key) => `${key}=${values[key]}`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
  return filePath
}

export function backupEnvFile(repoRoot = repoRootFallback, envFilePath) {
  const paths = getManagementPaths(repoRoot)
  ensureDirectory(paths.backupDir)
  const source = envFilePath || resolveRepoContext(repoRoot).runtimeEnvPath
  if (!fileExists(source)) {
    return null
  }
  const backupPath = path.join(paths.backupDir, `${timestampLabel()}-${path.basename(source)}`)
  fs.copyFileSync(source, backupPath)
  return backupPath
}

export function listEnvBackups(repoRoot = repoRootFallback) {
  const paths = getManagementPaths(repoRoot)
  ensureDirectory(paths.backupDir)
  return fs.readdirSync(paths.backupDir)
    .filter((name) => name.endsWith('.env'))
    .sort()
    .reverse()
    .map((name) => path.join(paths.backupDir, name))
}

export function restoreEnvBackup(repoRoot = repoRootFallback, backupPath, targetEnvPath) {
  const destination = targetEnvPath || resolveRepoContext(repoRoot).runtimeEnvPath
  const paths = getManagementPaths(repoRoot)
  const candidatePath = backupPath && !path.isAbsolute(backupPath)
    ? path.join(paths.backupDir, backupPath)
    : backupPath
  const source = fileExists(candidatePath) ? candidatePath : backupPath
  if (!fileExists(source)) {
    throw new Error(`备份文件不存在：${backupPath}`)
  }
  fs.copyFileSync(source, destination)
  return destination
}

export function diffEnvValues(beforeValues, afterValues, repoRoot = repoRootFallback, options = {}) {
  const schema = buildConfigSchema(repoRoot)
  const knownKeys = new Set([
    ...Object.keys(beforeValues || {}),
    ...Object.keys(afterValues || {}),
    ...schema.map((item) => item.key),
  ])
  const rows = []

  for (const key of Array.from(knownKeys).sort()) {
    const before = beforeValues?.[key]
    const after = afterValues?.[key]
    if (String(before ?? '') === String(after ?? '')) {
      continue
    }
    const meta = getConfigMeta(key, repoRoot)
    const beforeText = meta?.sensitive && !options.revealSensitive ? maskSecret(before) : String(before ?? '')
    const afterText = meta?.sensitive && !options.revealSensitive ? maskSecret(after) : String(after ?? '')
    rows.push({
      key,
      label: meta?.label || key,
      before: beforeText || '(空)',
      after: afterText || '(空)',
    })
  }

  return rows
}

export function exportSensitiveSnapshot(repoRoot = repoRootFallback, envValues, options = {}) {
  const paths = getManagementPaths(repoRoot)
  ensureDirectory(paths.backupDir)
  const values = envValues || readEnvFile(resolveRepoContext(repoRoot).runtimeEnvPath)
  const sensitiveKeys = getSensitiveKeys(repoRoot)
  const snapshotValues = {}
  for (const key of sensitiveKeys) {
    if (values[key] !== undefined) {
      snapshotValues[key] = values[key]
    }
  }

  const filename = `${timestampLabel()}-${options.label || 'sensitive-snapshot'}.env`
  const filePath = path.join(paths.backupDir, filename)
  writeEnvFile(filePath, snapshotValues)
  return filePath
}

export function writeSensitiveReceipt(repoRoot = repoRootFallback, label = 'receipt', rows = []) {
  const paths = getManagementPaths(repoRoot)
  const receiptDir = path.join(paths.configDir, 'receipts')
  ensureDirectory(receiptDir)
  const filePath = path.join(receiptDir, `${timestampLabel()}-${label}.txt`)
  const content = rows
    .filter((row) => row && row.label)
    .map((row) => `${row.label}: ${String(row.value ?? '')}`)
    .join('\n')
  fs.writeFileSync(filePath, `${content}\n`, { encoding: 'utf8', mode: 0o600 })
  return filePath
}

export function buildRestoreChanges(currentValues, backupValues, selectedKeys = []) {
  const keys = selectedKeys.length > 0
    ? selectedKeys
    : Array.from(new Set([
      ...Object.keys(currentValues || {}),
      ...Object.keys(backupValues || {}),
    ])).sort()

  const changes = {}
  for (const key of keys) {
    if (backupValues[key] === undefined) {
      changes[key] = null
      continue
    }
    changes[key] = backupValues[key]
  }
  return changes
}

function validateChanges(repoRoot, currentValues, changes) {
  const nextValues = { ...currentValues }

  for (const [key, rawValue] of Object.entries(changes)) {
    if (rawValue === undefined) {
      continue
    }
    if (rawValue === null) {
      delete nextValues[key]
      continue
    }
    nextValues[key] = String(rawValue)
  }

  if (changes.PUBLIC_DOMAIN || changes.ADMIN_DOMAIN || changes.REVERSE_PROXY_HTTP_PORT || changes.REVERSE_PROXY_HTTPS_PORT) {
    nextValues.ALLOWED_ORIGINS = buildAllowedOrigins(nextValues.PUBLIC_DOMAIN, nextValues.ADMIN_DOMAIN, {
      httpPort: nextValues.REVERSE_PROXY_HTTP_PORT,
      httpsPort: nextValues.REVERSE_PROXY_HTTPS_PORT,
    })
  }

  for (const [key, value] of Object.entries(nextValues)) {
    const meta = getConfigMeta(key, repoRoot)
    const validation = validateConfigValue(meta, value, nextValues)
    if (!validation.valid) {
      throw new Error(validation.message || `${key} 校验失败`)
    }
    nextValues[key] = validation.normalizedValue
  }

  return nextValues
}

function determineAffectedServices(repoRoot, changedKeys) {
  const services = new Set()
  for (const key of changedKeys) {
    const meta = getConfigMeta(key, repoRoot)
    for (const serviceName of meta?.affectedServices || []) {
      services.add(serviceName)
    }
  }
  return Array.from(services).sort()
}

async function validateChangedPorts(repoRoot, currentValues, nextValues, changedKeys) {
  const releasablePorts = new Set(
    changedKeys
      .map((key) => String(currentValues[key] || '').trim())
      .filter(Boolean),
  )

  for (const key of changedKeys) {
    const meta = getConfigMeta(key, repoRoot)
    if (meta?.type !== 'port') {
      continue
    }
    const nextPort = String(nextValues[key] || '').trim()
    const currentPort = String(currentValues[key] || '').trim()
    if (!nextPort || nextPort === currentPort) {
      continue
    }
    const inUse = await checkPortInUse(nextPort)
    if (inUse && !releasablePorts.has(nextPort)) {
      throw new Error(`${meta.label} 端口 ${nextPort} 已被其他进程占用，请更换后重试`)
    }
  }
}

export async function applyEnvChanges(repoRoot = repoRootFallback, options = {}) {
  const context = resolveRepoContext(repoRoot)
  const envFile = options.envFile || context.runtimeEnvPath
  const currentValues = readEnvFile(envFile)
  const nextValues = validateChanges(repoRoot, currentValues, options.changes || {})
  const changedKeys = Object.keys(options.changes || {})
  const affectedServices = determineAffectedServices(repoRoot, changedKeys)
  await validateChangedPorts(repoRoot, currentValues, nextValues, changedKeys)
  const backupPath = backupEnvFile(repoRoot, envFile)

  writeEnvFile(envFile, nextValues)

  if (options.apply !== false) {
    const profiles = resolveProfilesForMode('full', nextValues)
    if (affectedServices.length > 0) {
      restartAffectedServices(repoRoot, {
        envFile,
        profiles,
        services: affectedServices,
      })
    } else {
      composeUp(repoRoot, {
        envFile,
        profiles,
        detach: true,
        build: true,
      })
    }
  }

  const endpoints = buildSystemEndpoints(nextValues)
  const health = options.checkHealth === false
    ? {}
    : {
        bffReady: await checkHttpReady(endpoints.bffReady),
        goReady: await checkHttpReady(endpoints.goReady),
      }

  return {
    envFile,
    backupPath,
    currentValues,
    nextValues,
    affectedServices,
    diff: diffEnvValues(currentValues, nextValues, repoRoot),
    health,
  }
}

export function previewEnvBackup(repoRoot = repoRootFallback, backupPath, options = {}) {
  const context = resolveRepoContext(repoRoot)
  const currentValues = readEnvFile(context.runtimeEnvPath)
  const restoreTargetPath = backupPath && !path.isAbsolute(backupPath)
    ? path.join(getManagementPaths(repoRoot).backupDir, backupPath)
    : backupPath
  const backupValues = readEnvFile(restoreTargetPath)
  const selectedKeys = Array.isArray(options.keys) ? options.keys.filter(Boolean) : []
  const changes = buildRestoreChanges(currentValues, backupValues, selectedKeys)
  const nextValues = { ...currentValues }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined) {
      delete nextValues[key]
    } else {
      nextValues[key] = value
    }
  }

  return {
    backupPath: restoreTargetPath,
    currentValues,
    backupValues,
    selectedKeys,
    diff: diffEnvValues(currentValues, nextValues, repoRoot),
  }
}

export async function restoreEnvSelection(repoRoot = repoRootFallback, backupPath, keys = []) {
  const preview = previewEnvBackup(repoRoot, backupPath, { keys })
  const changes = buildRestoreChanges(preview.currentValues, preview.backupValues, preview.selectedKeys)
  return applyEnvChanges(repoRoot, {
    changes,
    apply: true,
  })
}

export function describeEnvValue(repoRoot, key, value, options = {}) {
  const meta = getConfigMeta(key, repoRoot)
  if (meta?.sensitive && !options.revealSensitive) {
    return maskSecret(value)
  }
  return String(value ?? '')
}

export function getRuntimeState(repoRoot = repoRootFallback) {
  const context = resolveRepoContext(repoRoot)
  const envValues = readEnvFile(context.runtimeEnvPath)
  let envUpdatedAt = ''
  try {
    envUpdatedAt = fs.statSync(context.runtimeEnvPath).mtime.toISOString()
  } catch {
    envUpdatedAt = ''
  }
  return {
    manifest: readInstallManifest(repoRoot),
    envValues,
    runtimeEnvPath: context.runtimeEnvPath,
    endpoints: buildSystemEndpoints(envValues),
    latestBackupPath: listEnvBackups(repoRoot)[0] || '',
    envUpdatedAt,
  }
}
