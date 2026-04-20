import fs from 'node:fs'
import path from 'node:path'
import { generateDeploymentCredentials, generateSecurePassword } from './credentials.mjs'
import { runDoctor } from './doctor.mjs'
import { installGlobalLaunchers } from './launcher-install.mjs'
import { resolveRepoContext } from './install-manifest.mjs'
import { runMainMenu } from './menu.mjs'
import {
  buildAllowedOrigins,
  buildSystemEndpoints,
  checkHttpReady,
  composeConfig,
  composeDown,
  composeLogs,
  composePs,
  composeUp,
  getComposeStatus,
  getProxyCertificateStatus,
  isProxyConfigured,
  removeManagedVolumes,
  repairDockerCompatibility,
  resolveProfilesForMode,
  waitForDockerReady,
} from './orchestrator.mjs'
import { buildConfigSchema, getConfigMeta, getKnownHostPortKeys, listCommonConfigByGroup } from './config-schema.mjs'
import {
  applyEnvChanges,
  backupEnvFile,
  describeEnvValue,
  diffEnvValues,
  exportSensitiveSnapshot,
  getRuntimeState,
  listEnvBackups,
  previewEnvBackup,
  readEnvFile,
  restoreEnvSelection,
  restoreEnvBackup,
  writeSensitiveReceipt,
  writeEnvFile,
} from './runtime-env.mjs'
import { runAdminMaintenance } from './admin-maintenance.mjs'
import { formatKeyValues, maskSecret, openFileInEditor, promptConfirm, promptExact, promptText } from './utils.mjs'

function getTemporaryCredentialPassword(payload) {
  return String(payload?.temporaryCredential?.temporaryPassword || '').trim()
}

function parseArgv(argv) {
  const options = {}
  const positionals = []
  for (const token of argv) {
    if (token === '-h' || token === '-?' || token === '--help') {
      options.help = 'true'
      continue
    }
    if (token.startsWith('--')) {
      const [rawKey, ...rest] = token.slice(2).split('=')
      const key = rawKey.trim()
      const value = rest.length > 0 ? rest.join('=') : 'true'
      options[key] = value
      continue
    }
    positionals.push(token)
  }
  return { options, positionals }
}

function printHelp() {
  console.log(`Infinitech 管理控制台

用法:
  infinitech
  infinitech menu
  infinitech overview
  infinitech stack up|up-core|up-all|down|restart|logs|errors|ps|config
  infinitech security show-bootstrap|rotate-bootstrap|show-verify|rotate-verify
  infinitech reset init|factory
  infinitech admin list|show|create|update|reset-password|delete
  infinitech proxy configure|disable
  infinitech ports edit
  infinitech env list|get|set|unset|default|preview|restore
  infinitech doctor
  infinitech repair path|launcher|docker-compat
  infinitech advanced installer-status|edit-env|export-config|compose-config

示例:
  infinitech admin list
  infinitech admin update --id=1 --new-phone=13900000000 --name=新管理员
  infinitech proxy configure --public-domain=www.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
  infinitech env set JWT_SECRET=NewSecretValue
  infinitech repair launcher
  infinitech repair docker-compat`)
}

function printSection(title, body) {
  console.log(`\n${title}`)
  console.log(body)
}

function printDiff(diffRows) {
  if (!diffRows.length) {
    console.log('\n没有配置变更。')
    return
  }
  console.log('\n配置变更预览：')
  for (const row of diffRows) {
    console.log(`- ${row.label} (${row.key})`)
    console.log(`  旧值: ${row.before}`)
    console.log(`  新值: ${row.after}`)
  }
}

async function showOverview(repoRoot) {
  const state = getRuntimeState(repoRoot)
  const composeStatus = getComposeStatus(repoRoot, {
    envFile: state.runtimeEnvPath,
    profiles: resolveProfilesForMode('full', state.envValues),
  })
  const certificateStatus = getProxyCertificateStatus(repoRoot, state.envValues)
  let adminCount = 0
  try {
    const adminPayload = runAdminMaintenance(repoRoot, {
      action: 'list',
      envFile: state.runtimeEnvPath,
    })
    adminCount = adminPayload.admins?.length || 0
  } catch {
    adminCount = 0
  }

  const endpointsReady = {
    bffReady: await checkHttpReady(state.endpoints.bffReady),
    goReady: await checkHttpReady(state.endpoints.goReady),
    socketReady: await checkHttpReady(state.endpoints.socketReady),
  }

  printSection(
    '系统总览',
    formatKeyValues([
      { label: '仓库路径', value: state.manifest?.repoRoot || repoRoot },
      { label: '运行时 env', value: state.runtimeEnvPath },
      { label: '安装时间', value: state.manifest?.installedAt || '-' },
      { label: '最近配置变更', value: state.envUpdatedAt || '-' },
      { label: '最近备份', value: state.latestBackupPath || '-' },
      { label: '管理员数量', value: String(adminCount) },
      { label: '当前容器数', value: String(composeStatus.length) },
      { label: '后台地址', value: state.endpoints.adminWeb },
      { label: '官网地址', value: state.endpoints.siteWeb },
      { label: '邀请页地址', value: state.endpoints.inviteWeb },
      { label: 'BFF 健康检查', value: `${state.endpoints.bffReady} (${endpointsReady.bffReady ? 'OK' : 'FAIL'})` },
      { label: 'Go API 健康检查', value: `${state.endpoints.goReady} (${endpointsReady.goReady ? 'OK' : 'FAIL'})` },
      { label: 'Socket 健康检查', value: `${state.endpoints.socketReady} (${endpointsReady.socketReady ? 'OK' : 'FAIL'})` },
      { label: '反代模式', value: isProxyConfigured(state.envValues) ? '已启用' : '宿主端口直连' },
      { label: '业务域名', value: state.endpoints.publicDomain || '-' },
      { label: '后台域名', value: state.endpoints.adminDomain || '-' },
      { label: 'TLS 证书状态', value: certificateStatus.summary },
      {
        label: 'Bootstrap 状态',
        value: adminCount > 0 ? '数据库已有管理员，bootstrap 仅作保底用途' : '空库首次登录可直接使用 bootstrap 凭据',
      },
      {
        label: '敏感二次验证',
        value:
          state.envValues.SYSTEM_LOG_DELETE_ACCOUNT &&
          state.envValues.SYSTEM_LOG_DELETE_PASSWORD &&
          state.envValues.CLEAR_ALL_DATA_VERIFY_ACCOUNT &&
          state.envValues.CLEAR_ALL_DATA_VERIFY_PASSWORD
            ? '已配置'
            : '未配置',
      },
    ]),
  )
}

function getExistingAdminPhones(repoRoot) {
  try {
    const payload = runAdminMaintenance(repoRoot, { action: 'list' })
    return new Set((payload.admins || []).map((item) => String(item.phone || '').trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

async function rotateBootstrap(repoRoot, options = {}) {
  const existingPhones = getExistingAdminPhones(repoRoot)
  const generated = generateDeploymentCredentials({ existingPhones })
  const result = await applyEnvChanges(repoRoot, {
    changes: {
      BOOTSTRAP_ADMIN_PHONE: generated.bootstrapAdminPhone,
      BOOTSTRAP_ADMIN_NAME: generated.bootstrapAdminName,
      BOOTSTRAP_ADMIN_PASSWORD: generated.bootstrapAdminPassword,
    },
    apply: options.apply !== false,
  })
  return { ...result, generated }
}

async function rotateVerifyCredentials(repoRoot, options = {}) {
  const generated = generateDeploymentCredentials()
  const result = await applyEnvChanges(repoRoot, {
    changes: {
      SYSTEM_LOG_DELETE_ACCOUNT: generated.systemLogDeleteAccount,
      SYSTEM_LOG_DELETE_PASSWORD: generated.systemLogDeletePassword,
      CLEAR_ALL_DATA_VERIFY_ACCOUNT: generated.clearAllDataVerifyAccount,
      CLEAR_ALL_DATA_VERIFY_PASSWORD: generated.clearAllDataVerifyPassword,
    },
    apply: options.apply !== false,
  })
  return { ...result, generated }
}

async function resetInit(repoRoot) {
  const existingPhones = getExistingAdminPhones(repoRoot)
  const generated = generateDeploymentCredentials({ existingPhones })
  const result = await applyEnvChanges(repoRoot, {
    changes: {
      BOOTSTRAP_ADMIN_PHONE: generated.bootstrapAdminPhone,
      BOOTSTRAP_ADMIN_NAME: generated.bootstrapAdminName,
      BOOTSTRAP_ADMIN_PASSWORD: generated.bootstrapAdminPassword,
      SYSTEM_LOG_DELETE_ACCOUNT: generated.systemLogDeleteAccount,
      SYSTEM_LOG_DELETE_PASSWORD: generated.systemLogDeletePassword,
      CLEAR_ALL_DATA_VERIFY_ACCOUNT: generated.clearAllDataVerifyAccount,
      CLEAR_ALL_DATA_VERIFY_PASSWORD: generated.clearAllDataVerifyPassword,
    },
    apply: true,
  })
  return { ...result, generated }
}

async function resetFactory(repoRoot) {
  const state = getRuntimeState(repoRoot)
  const generated = generateDeploymentCredentials({ existingPhones: new Set() })
  const changes = {
    BOOTSTRAP_ADMIN_PHONE: generated.bootstrapAdminPhone,
    BOOTSTRAP_ADMIN_NAME: generated.bootstrapAdminName,
    BOOTSTRAP_ADMIN_PASSWORD: generated.bootstrapAdminPassword,
    SYSTEM_LOG_DELETE_ACCOUNT: generated.systemLogDeleteAccount,
    SYSTEM_LOG_DELETE_PASSWORD: generated.systemLogDeletePassword,
    CLEAR_ALL_DATA_VERIFY_ACCOUNT: generated.clearAllDataVerifyAccount,
    CLEAR_ALL_DATA_VERIFY_PASSWORD: generated.clearAllDataVerifyPassword,
  }

  const backupPath = backupEnvFile(repoRoot, state.runtimeEnvPath)
  const nextValues = { ...state.envValues, ...changes }
  nextValues.ALLOWED_ORIGINS = buildAllowedOrigins(nextValues.PUBLIC_DOMAIN, nextValues.ADMIN_DOMAIN, {
    httpPort: nextValues.REVERSE_PROXY_HTTP_PORT,
    httpsPort: nextValues.REVERSE_PROXY_HTTPS_PORT,
  })
  writeEnvFile(state.runtimeEnvPath, nextValues)

  const profiles = resolveProfilesForMode('full', state.envValues)
  composeDown(repoRoot, {
    envFile: state.runtimeEnvPath,
    profiles,
    removeOrphans: true,
  })
  const removedVolumes = removeManagedVolumes(repoRoot, {
    envFile: state.runtimeEnvPath,
    profiles,
    preserve: ['caddy_data', 'caddy_config'],
  })
  composeUp(repoRoot, {
    envFile: state.runtimeEnvPath,
    profiles: resolveProfilesForMode('full', nextValues),
    detach: true,
    build: true,
  })

  return {
    backupPath,
    removedVolumes,
    generated,
    endpoints: buildSystemEndpoints(nextValues),
  }
}

async function configureProxy(repoRoot, values = {}) {
  const current = getRuntimeState(repoRoot).envValues
  const publicDomain = values.publicDomain || current.PUBLIC_DOMAIN
  const adminDomain = values.adminDomain || current.ADMIN_DOMAIN || `admin.${publicDomain}`
  const caddyEmail = values.caddyEmail || current.CADDY_EMAIL || 'ops@example.com'
  const httpPort = values.httpPort || current.REVERSE_PROXY_HTTP_PORT || '80'
  const httpsPort = values.httpsPort || current.REVERSE_PROXY_HTTPS_PORT || '443'
  const siteOrigin = httpsPort === '443' ? `https://${publicDomain}` : `https://${publicDomain}:${httpsPort}`
  const adminOrigin = httpsPort === '443' ? `https://${adminDomain}` : `https://${adminDomain}:${httpsPort}`
  return applyEnvChanges(repoRoot, {
    changes: {
      PUBLIC_DOMAIN: publicDomain,
      ADMIN_DOMAIN: adminDomain,
      CADDY_EMAIL: caddyEmail,
      REVERSE_PROXY_HTTP_PORT: httpPort,
      REVERSE_PROXY_HTTPS_PORT: httpsPort,
      SITE_WEB_BASE_URL: siteOrigin,
      ADMIN_WEB_BASE_URL: adminOrigin,
      ALLOWED_ORIGINS: buildAllowedOrigins(publicDomain, adminDomain, {
        httpPort,
        httpsPort,
      }),
    },
    apply: true,
  })
}

async function disableProxy(repoRoot) {
  const current = getRuntimeState(repoRoot)
  const backupPath = backupEnvFile(repoRoot, current.runtimeEnvPath)
  const nextValues = { ...current.envValues }
  delete nextValues.PUBLIC_DOMAIN
  delete nextValues.ADMIN_DOMAIN
  delete nextValues.CADDY_EMAIL
  nextValues.ADMIN_WEB_BASE_URL = `http://127.0.0.1:${nextValues.ADMIN_WEB_HOST_PORT || '8888'}`
  nextValues.SITE_WEB_BASE_URL = `http://127.0.0.1:${nextValues.SITE_WEB_HOST_PORT || '1888'}`
  nextValues.ALLOWED_ORIGINS = buildAllowedOrigins('', '', {
    httpPort: nextValues.REVERSE_PROXY_HTTP_PORT,
    httpsPort: nextValues.REVERSE_PROXY_HTTPS_PORT,
  })
  writeEnvFile(current.runtimeEnvPath, nextValues)
  composeDown(repoRoot, {
    envFile: current.runtimeEnvPath,
    profiles: ['reverse-proxy'],
    removeOrphans: true,
  })
  composeUp(repoRoot, {
    envFile: current.runtimeEnvPath,
    profiles: [],
    detach: true,
    build: true,
  })
  return { backupPath, nextValues }
}

async function editHostPorts(repoRoot, updates) {
  return applyEnvChanges(repoRoot, {
    changes: updates,
    apply: true,
  })
}

function listEnv(repoRoot) {
  const state = getRuntimeState(repoRoot)
  const schema = buildConfigSchema(repoRoot)
  for (const item of schema) {
    console.log(`${item.key}=${describeEnvValue(repoRoot, item.key, state.envValues[item.key])}`)
  }
}

function getEnv(repoRoot, key) {
  const state = getRuntimeState(repoRoot)
  const value = state.envValues[key]
  console.log(`${key}=${describeEnvValue(repoRoot, key, value)}`)
}

async function setEnv(repoRoot, key, value) {
  const result = await applyEnvChanges(repoRoot, {
    changes: { [key]: value },
    apply: true,
  })
  printDiff(result.diff)
}

async function unsetEnv(repoRoot, key) {
  const result = await applyEnvChanges(repoRoot, {
    changes: { [key]: null },
    apply: true,
  })
  printDiff(result.diff)
}

function showRecentErrorLogs(repoRoot, options = {}) {
  const envValues = getRuntimeState(repoRoot).envValues
  const result = composeLogs(repoRoot, {
    envFile: options.envFile || getRuntimeState(repoRoot).runtimeEnvPath,
    profiles: resolveProfilesForMode('full', envValues),
    services: options.services || [],
    follow: false,
    tail: options.tail || '400',
    stdio: 'pipe',
  })

  const lines = `${result.stdout || ''}\n${result.stderr || ''}`
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
  const errorLines = lines.filter((line) => /(error|fatal|panic|exception|failed|refused)/i.test(line))
  const output = (errorLines.length > 0 ? errorLines : lines).slice(-200)

  if (errorLines.length === 0) {
    console.log('最近日志中未筛到明显错误关键字，以下输出最近 200 行原始日志：')
  }
  for (const line of output) {
    console.log(line)
  }
}

async function restoreEnvDefault(repoRoot, key) {
  const meta = getConfigMeta(key, repoRoot)
  if (!meta) {
    throw new Error(`未找到变量：${key}`)
  }
  if (!String(meta.defaultHint || '').trim()) {
    throw new Error(`${key} 没有可恢复的默认建议值`)
  }
  const result = await applyEnvChanges(repoRoot, {
    changes: { [key]: meta.defaultHint },
    apply: true,
  })
  printDiff(result.diff)
}

function listAdmins(repoRoot) {
  const payload = runAdminMaintenance(repoRoot, { action: 'list' })
  for (const admin of payload.admins || []) {
    console.log(`- ID=${admin.id} UID=${admin.uid} 手机号=${admin.phone} 姓名=${admin.name} 类型=${admin.type}`)
  }
  return payload
}

function showAdmin(repoRoot, selector) {
  const payload = runAdminMaintenance(repoRoot, {
    action: 'show',
    selector,
  })
  console.log(formatKeyValues([
    { label: 'ID', value: String(payload.admin?.id || '-') },
    { label: 'UID', value: String(payload.admin?.uid || '-') },
    { label: 'TSID', value: String(payload.admin?.tsid || '-') },
    { label: '手机号', value: String(payload.admin?.phone || '-') },
    { label: '姓名', value: String(payload.admin?.name || '-') },
    { label: '类型', value: String(payload.admin?.type || '-') },
  ]))
  return payload
}

function printSensitiveReceipt(repoRoot, label, title, rows) {
  const receiptPath = writeSensitiveReceipt(repoRoot, label, rows)
  console.log(title)
  console.log(`敏感回执已写入：${receiptPath}`)
  return receiptPath
}

function createAdmin(repoRoot, options) {
  const payload = runAdminMaintenance(repoRoot, {
    action: 'create',
    phone: options.phone,
    name: options.name,
    type: options.type,
    password: options.password,
    generate: options.generate,
  })
  console.log(`管理员已创建：${payload.admin?.phone} / ${payload.admin?.name}`)
  const temporaryPassword = getTemporaryCredentialPassword(payload)
  if (temporaryPassword) {
    printSensitiveReceipt(repoRoot, 'admin-create-password', '初始密码已生成。', [
      { label: '对象', value: `管理员 ${payload.admin?.name || payload.admin?.phone || '-'}` },
      { label: '账号', value: String(payload.admin?.phone || '-') },
      { label: '一次性临时口令', value: temporaryPassword },
      { label: '要求', value: '请通过受控渠道交付，并提醒首次登录后立即修改密码。' },
    ])
  }
  return payload
}

function updateAdmin(repoRoot, options) {
  const payload = runAdminMaintenance(repoRoot, {
    action: 'update',
    selector: options.selector,
    newPhone: options.newPhone,
    name: options.name,
    type: options.type,
  })
  console.log(`管理员已更新：${payload.admin?.phone} / ${payload.admin?.name}`)
  return payload
}

function resetAdminPassword(repoRoot, options) {
  const payload = runAdminMaintenance(repoRoot, {
    action: 'reset-password',
    selector: options.selector,
    confirm: options.confirm,
    password: options.password,
    generate: options.generate,
  })
  console.log(`管理员密码已重置：${payload.admin?.phone}`)
  const temporaryPassword = getTemporaryCredentialPassword(payload)
  if (temporaryPassword) {
    printSensitiveReceipt(repoRoot, 'admin-reset-password', '管理员口令已重置。', [
      { label: '对象', value: `管理员 ${payload.admin?.name || payload.admin?.phone || '-'}` },
      { label: '账号', value: String(payload.admin?.phone || '-') },
      { label: '一次性临时口令', value: temporaryPassword },
      { label: '要求', value: '请通过受控渠道交付，并提醒首次登录后立即修改密码。' },
    ])
  }
  return payload
}

function deleteAdmin(repoRoot, options) {
  const payload = runAdminMaintenance(repoRoot, {
    action: 'delete',
    selector: options.selector,
    confirm: options.confirm,
  })
  console.log(`管理员已删除：${payload.admin?.phone}`)
  return payload
}

async function exportCurrentConfig(repoRoot) {
  const state = getRuntimeState(repoRoot)
  const snapshotPath = exportSensitiveSnapshot(repoRoot, state.envValues, { label: 'runtime-config' })
  console.log(`当前敏感配置快照已导出：${snapshotPath}`)
}

async function editEnvInEditor(repoRoot) {
  const state = getRuntimeState(repoRoot)
  const beforeValues = readEnvFile(state.runtimeEnvPath)
  const backupPath = backupEnvFile(repoRoot, state.runtimeEnvPath)
  openFileInEditor(state.runtimeEnvPath)
  const afterValues = readEnvFile(state.runtimeEnvPath)
  const diff = diffEnvValues(beforeValues, afterValues, repoRoot)
  printDiff(diff)
  if (diff.length > 0) {
    composeUp(repoRoot, {
      envFile: state.runtimeEnvPath,
      profiles: resolveProfilesForMode('full', afterValues),
      detach: true,
      build: true,
    })
  }
  console.log(`编辑前备份：${backupPath || '-'}`)
}

async function restoreEnv(repoRoot, backupPath) {
  const target = restoreEnvBackup(repoRoot, backupPath)
  const values = readEnvFile(target)
  composeUp(repoRoot, {
    envFile: target,
    profiles: resolveProfilesForMode('full', values),
    detach: true,
    build: true,
  })
  console.log(`已恢复 env 备份：${backupPath}`)
}

function previewBackup(repoRoot, backupPath, keys = []) {
  const preview = previewEnvBackup(repoRoot, backupPath, { keys })
  printDiff(preview.diff)
  return preview
}

async function restorePartialEnv(repoRoot, backupPath, keys = []) {
  const result = await restoreEnvSelection(repoRoot, backupPath, keys)
  printDiff(result.diff)
  console.log(`已从备份恢复变量：${keys.join(', ')}`)
  return result
}

async function runRepair(repoRoot) {
  const result = installGlobalLaunchers(repoRoot)
  console.log(`已修复命令入口与 PATH：${result.launcherPaths.join(', ')}`)
  return result
}

function describeDockerCompatMode(mode) {
  switch (mode) {
    case 'not_required':
      return '当前平台无需兼容修复'
    case 'path':
      return 'docker-credential-desktop 已在 PATH'
    case 'prepend-path':
      return '将自动补充 Docker helper 目录到 PATH'
    case 'compat':
      return '将使用兼容 DOCKER_CONFIG 屏蔽 credential helper'
    default:
      return mode || '-'
  }
}

async function runDockerCompatRepair(repoRoot) {
  let result = repairDockerCompatibility(repoRoot)
  if (process.platform === 'win32' && !result.dockerReady) {
    console.log('正在等待 Docker Desktop 就绪并重试兼容修复...')
    await waitForDockerReady({}, repoRoot)
    result = repairDockerCompatibility(repoRoot)
  }

  console.log(formatKeyValues([
    { label: '兼容模式', value: describeDockerCompatMode(result.mode) },
    { label: '修复说明', value: result.detail || '-' },
    { label: 'Docker 连通', value: result.dockerReady ? '已就绪' : '未就绪' },
    { label: 'Helper 目录', value: result.helperDir || '-' },
    { label: '兼容 DOCKER_CONFIG', value: result.effectiveDockerConfig || '-' },
    { label: 'PATH 已修复', value: result.pathFixed ? '是' : '否' },
    { label: '兼容配置启用', value: result.compatConfigEnabled ? '是' : '否' },
  ]))

  return result
}

function printInstallerStatus(repoRoot) {
  const context = resolveRepoContext(repoRoot)
  const manifest = context.manifest || {}
  console.log(formatKeyValues([
    { label: '仓库路径', value: context.repoRoot },
    { label: '运行时 env', value: context.runtimeEnvPath },
    { label: '配置清单', value: context.paths.manifestPath },
    { label: '已安装时间', value: manifest.installedAt || '-' },
    { label: '平台', value: manifest.platform || process.platform },
    { label: '主命令入口', value: manifest.launcherPath || '-' },
    { label: '管理员工具', value: manifest.adminToolPath || '-' },
  ]))
}

async function runRepairScope(repoRoot, scope = 'all') {
  if (scope === 'docker-compat') {
    return runDockerCompatRepair(repoRoot)
  }
  const result = installGlobalLaunchers(repoRoot)
  if (scope === 'path') {
    console.log(`PATH 修复完成，可用命令目录：${result.binDir}`)
    return result
  }
  console.log(`已重装命令入口：${result.launcherPaths.join(', ')}`)
  return result
}

export async function runCli(argv, repoRoot) {
  const { options, positionals } = parseArgv(argv)
  if (options['env-file']) {
    process.env.INFINITECH_RUNTIME_ENV_PATH = options['env-file']
  }
  const context = resolveRepoContext(repoRoot, options['env-file'])
  const [group = 'menu', action = ''] = positionals

  if (options.help === 'true' || group === 'help') {
    printHelp()
    return
  }

  if ((group === 'menu' || (!group && argv.length === 0)) && !process.stdin.isTTY) {
    printHelp()
    return
  }

  if (group === 'menu' || (!group && argv.length === 0)) {
    return runMainMenu(context.repoRoot)
  }

  switch (group) {
    case 'overview':
      return showOverview(context.repoRoot)
    case 'stack': {
      const envValues = getRuntimeState(context.repoRoot).envValues
      const profiles = action === 'up-all' || action === 'restart-all'
        ? resolveProfilesForMode('full', envValues)
        : resolveProfilesForMode('full', envValues)
      switch (action) {
        case 'up':
          composeUp(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles,
            detach: options.attach !== 'true',
            build: options['no-build'] !== 'true',
          })
          return
        case 'up-core':
          composeUp(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: [],
            detach: true,
            build: true,
          })
          return
        case 'up-all':
          composeUp(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
            detach: true,
            build: true,
          })
          return
        case 'down':
          composeDown(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
            removeOrphans: true,
          })
          return
        case 'restart':
          composeDown(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
            removeOrphans: true,
          })
          composeUp(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
            detach: true,
            build: true,
          })
          return
        case 'logs':
          composeLogs(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
            services: positionals.slice(2),
            follow: true,
            tail: options.tail || '',
          })
          return
        case 'errors':
          return showRecentErrorLogs(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            services: positionals.slice(2),
            tail: options.tail || '400',
          })
        case 'ps':
          composePs(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
          })
          return
        case 'config':
          composeConfig(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', envValues),
          })
          return
        default:
          throw new Error(`不支持的 stack 子命令：${action}`)
      }
    }
    case 'security':
      switch (action) {
        case 'show-bootstrap': {
          const state = getRuntimeState(context.repoRoot)
          console.log(formatKeyValues([
            { label: '手机号', value: describeEnvValue(context.repoRoot, 'BOOTSTRAP_ADMIN_PHONE', state.envValues.BOOTSTRAP_ADMIN_PHONE) },
            { label: '名称', value: describeEnvValue(context.repoRoot, 'BOOTSTRAP_ADMIN_NAME', state.envValues.BOOTSTRAP_ADMIN_NAME) },
            { label: '密码', value: describeEnvValue(context.repoRoot, 'BOOTSTRAP_ADMIN_PASSWORD', state.envValues.BOOTSTRAP_ADMIN_PASSWORD) },
          ]))
          return
        }
        case 'rotate-bootstrap': {
          const result = await rotateBootstrap(context.repoRoot)
          printDiff(result.diff)
          printSensitiveReceipt(context.repoRoot, 'bootstrap-credentials', 'Bootstrap 凭据已轮换。', [
            { label: '手机号', value: result.generated.bootstrapAdminPhone },
            { label: '名称', value: result.generated.bootstrapAdminName },
            { label: '一次性 bootstrap 口令', value: result.generated.bootstrapAdminPassword },
          ])
          console.log(`新 bootstrap 手机号：${maskSecret(result.generated.bootstrapAdminPhone)}`)
          return
        }
        case 'show-verify': {
          const state = getRuntimeState(context.repoRoot)
          console.log(formatKeyValues([
            { label: '系统日志账号', value: describeEnvValue(context.repoRoot, 'SYSTEM_LOG_DELETE_ACCOUNT', state.envValues.SYSTEM_LOG_DELETE_ACCOUNT) },
            { label: '系统日志密码', value: describeEnvValue(context.repoRoot, 'SYSTEM_LOG_DELETE_PASSWORD', state.envValues.SYSTEM_LOG_DELETE_PASSWORD) },
            { label: '全量清空账号', value: describeEnvValue(context.repoRoot, 'CLEAR_ALL_DATA_VERIFY_ACCOUNT', state.envValues.CLEAR_ALL_DATA_VERIFY_ACCOUNT) },
            { label: '全量清空密码', value: describeEnvValue(context.repoRoot, 'CLEAR_ALL_DATA_VERIFY_PASSWORD', state.envValues.CLEAR_ALL_DATA_VERIFY_PASSWORD) },
          ]))
          return
        }
        case 'rotate-verify': {
          const result = await rotateVerifyCredentials(context.repoRoot)
          printDiff(result.diff)
          printSensitiveReceipt(context.repoRoot, 'verify-credentials', '敏感二次验证凭据已轮换。', [
            { label: '系统日志账号', value: result.generated.systemLogDeleteAccount },
            { label: '系统日志一次性验证口令', value: result.generated.systemLogDeletePassword },
            { label: '全量清空账号', value: result.generated.clearAllDataVerifyAccount },
            { label: '全量清空一次性验证口令', value: result.generated.clearAllDataVerifyPassword },
          ])
          console.log(`新系统日志验证账号：${maskSecret(result.generated.systemLogDeleteAccount)}`)
          console.log(`新全量清空验证账号：${maskSecret(result.generated.clearAllDataVerifyAccount)}`)
          return
        }
        default:
          throw new Error(`不支持的 security 子命令：${action}`)
      }
    case 'reset':
      if (action === 'init') {
        const result = await resetInit(context.repoRoot)
        printDiff(result.diff)
        console.log(`bootstrap 新账号：${result.generated.bootstrapAdminPhone}`)
        console.log(`bootstrap 新密码：${result.generated.bootstrapAdminPassword}`)
        console.log(`系统日志验证新账号：${result.generated.systemLogDeleteAccount}`)
        console.log(`系统日志验证新密码：${result.generated.systemLogDeletePassword}`)
        console.log(`全量清空验证新账号：${result.generated.clearAllDataVerifyAccount}`)
        console.log(`全量清空验证新密码：${result.generated.clearAllDataVerifyPassword}`)
        return
      }
      if (action === 'factory') {
        const result = await resetFactory(context.repoRoot)
        console.log(`已删除数据卷：${result.removedVolumes.join(', ') || '无'}`)
        console.log(`新 bootstrap 手机号：${result.generated.bootstrapAdminPhone}`)
        console.log(`新 bootstrap 密码：${result.generated.bootstrapAdminPassword}`)
        console.log(`业务后台入口：${result.endpoints.adminWeb}`)
        return
      }
      throw new Error(`不支持的 reset 子命令：${action}`)
    case 'admin': {
      const selector = {
        id: options.id,
        phone: options.phone,
        uid: options.uid,
        tsid: options.tsid,
      }
      switch (action) {
        case 'list':
          return listAdmins(context.repoRoot)
        case 'show':
          return showAdmin(context.repoRoot, selector)
        case 'create':
          return createAdmin(context.repoRoot, {
            phone: options.phone,
            name: options.name,
            type: options.type,
            password: options.password,
            generate: options.generate === 'true' || !options.password,
          })
        case 'update':
          return updateAdmin(context.repoRoot, {
            selector,
            newPhone: options['new-phone'] || '',
            name: options.name || '',
            type: options.type || '',
          })
        case 'reset-password':
          return resetAdminPassword(context.repoRoot, {
            selector,
            confirm: options.confirm || '',
            password: options.password || '',
            generate: options.generate === 'true' || !options.password,
          })
        case 'delete':
          return deleteAdmin(context.repoRoot, {
            selector,
            confirm: options.confirm || '',
          })
        default:
          throw new Error(`不支持的 admin 子命令：${action}`)
      }
    }
    case 'proxy':
      if (action === 'configure') {
        const result = await configureProxy(context.repoRoot, {
          publicDomain: options['public-domain'],
          adminDomain: options['admin-domain'],
          caddyEmail: options['caddy-email'],
          httpPort: options['http-port'],
          httpsPort: options['https-port'],
        })
        printDiff(result.diff)
        return
      }
      if (action === 'disable') {
        const result = await disableProxy(context.repoRoot)
        console.log(`反代已停用，备份：${result.backupPath || '-'}`)
        return
      }
      throw new Error(`不支持的 proxy 子命令：${action}`)
    case 'ports':
      if (action === 'edit') {
        const updates = {}
        for (const key of getKnownHostPortKeys(context.repoRoot)) {
          if (options[key]) {
            updates[key] = options[key]
          }
        }
        const result = await editHostPorts(context.repoRoot, updates)
        printDiff(result.diff)
        return
      }
      throw new Error(`不支持的 ports 子命令：${action}`)
    case 'env':
      switch (action) {
        case 'list':
          return listEnv(context.repoRoot)
        case 'get':
          return getEnv(context.repoRoot, positionals[2] || options.key)
        case 'set': {
          const raw = positionals[2] || options.entry || ''
          const [key, ...rest] = raw.split('=')
          if (!String(key || '').trim()) {
            throw new Error('env set 需要使用 KEY=VALUE 形式')
          }
          return setEnv(context.repoRoot, key, rest.join('='))
        }
        case 'unset':
          return unsetEnv(context.repoRoot, positionals[2] || options.key)
        case 'default':
          return restoreEnvDefault(context.repoRoot, positionals[2] || options.key)
        case 'preview': {
          const backupPath = positionals[2] || options.backup
          if (!backupPath) {
            throw new Error('env preview 需要提供备份文件名或完整路径')
          }
          const keys = String(options.keys || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
          return previewBackup(context.repoRoot, backupPath, keys)
        }
        case 'restore': {
          const backupPath = positionals[2] || options.backup
          if (!backupPath) {
            throw new Error('env restore 需要提供备份文件名或完整路径')
          }
          const keys = String(options.keys || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
          if (keys.length > 0) {
            return restorePartialEnv(context.repoRoot, backupPath, keys)
          }
          return restoreEnv(context.repoRoot, backupPath)
        }
        default:
          throw new Error(`不支持的 env 子命令：${action}`)
      }
    case 'doctor': {
      const report = await runDoctor(context.repoRoot)
      for (const item of report.checks) {
        console.log(`[${item.status}] ${item.title}: ${item.detail}`)
      }
      return
    }
    case 'repair':
      if (action === 'path' || action === 'launcher' || action === '') {
        return runRepairScope(context.repoRoot, action || 'all')
      }
      if (action === 'docker-compat' || action === 'docker') {
        return runRepairScope(context.repoRoot, 'docker-compat')
      }
      throw new Error(`不支持的 repair 子命令：${action}`)
    case 'advanced':
      switch (action) {
        case 'installer-status':
          return printInstallerStatus(context.repoRoot)
        case 'edit-env':
          return editEnvInEditor(context.repoRoot)
        case 'export-config':
          return exportCurrentConfig(context.repoRoot)
        case 'compose-config':
          return composeConfig(context.repoRoot, {
            envFile: context.runtimeEnvPath,
            profiles: resolveProfilesForMode('full', getRuntimeState(context.repoRoot).envValues),
          })
        default:
          throw new Error(`不支持的 advanced 子命令：${action}`)
      }
    default:
      throw new Error(`不支持的命令组：${group}`)
  }
}

export const managementActions = {
  showOverview,
  rotateBootstrap,
  rotateVerifyCredentials,
  resetInit,
  resetFactory,
  configureProxy,
  disableProxy,
  editHostPorts,
  listEnv,
  getEnv,
  setEnv,
  unsetEnv,
  restoreEnvDefault,
  restoreEnv,
  restorePartialEnv,
  previewBackup,
  listAdmins,
  showAdmin,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deleteAdmin,
  exportCurrentConfig,
  editEnvInEditor,
  runRepair,
  runRepairScope,
  runDockerCompatRepair,
  printInstallerStatus,
  runDoctor,
  listEnvBackups,
  listCommonConfigByGroup,
  getConfigMeta,
  getKnownHostPortKeys,
  getRuntimeState,
  describeEnvValue,
  promptConfirm,
  promptExact,
  promptText,
  composeLogs,
  composePs,
  composeConfig,
}
