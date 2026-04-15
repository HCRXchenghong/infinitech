import os from 'node:os'
import { runAdminMaintenance } from './lib/management/admin-maintenance.mjs'
import { buildMirrorEnv, MIRROR_PROFILES } from './lib/management/mirror-profiles.mjs'
import { generateDeploymentCredentials } from './lib/management/credentials.mjs'
import { installGlobalLaunchers } from './lib/management/launcher-install.mjs'
import { getManagementPaths, repoRootFallback } from './lib/management/paths.mjs'
import { buildAllowedOrigins, composeDown, composeUp, removeManagedVolumes, resolveProfilesForMode } from './lib/management/orchestrator.mjs'
import { readEnvFile, writeEnvFile, writeSensitiveReceipt } from './lib/management/runtime-env.mjs'
import { maskSecret, promptChoice, promptText } from './lib/management/utils.mjs'

function parseArgs(argv) {
  const flags = {
    mirrorProfile: '',
    withProxy: false,
    publicDomain: '',
    adminDomain: '',
    caddyEmail: '',
    noDeploy: false,
    yes: false,
    resetMode: '',
  }

  for (const token of argv) {
    if (token === '--proxy' || token === '--reverse-proxy') {
      flags.withProxy = true
      continue
    }
    if (token === '--no-deploy' || token === '--install-only') {
      flags.noDeploy = true
      continue
    }
    if (token === '--yes') {
      flags.yes = true
      continue
    }
    if (token.startsWith('--mirror-profile=')) {
      flags.mirrorProfile = token.slice('--mirror-profile='.length).trim().toLowerCase()
      continue
    }
    if (token.startsWith('--public-domain=')) {
      flags.publicDomain = token.slice('--public-domain='.length).trim()
      flags.withProxy = true
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
    if (token.startsWith('--reset=')) {
      flags.resetMode = token.slice('--reset='.length).trim().toLowerCase()
      continue
    }
  }

  return flags
}

function detectSystemLabel() {
  return `${process.platform} ${os.arch()}`
}

async function chooseMirrorProfile(flags) {
  if (flags.mirrorProfile && MIRROR_PROFILES[flags.mirrorProfile]) {
    return flags.mirrorProfile
  }
  if (flags.yes || !process.stdin.isTTY) {
    return 'official'
  }

  const choice = await promptChoice('请选择镜像源', [
    '官方源（默认）',
    '阿里云镜像',
    '腾讯云镜像',
    '华为云镜像',
    '清华 / goproxy.cn 组合镜像',
  ], 0)

  return ['official', 'aliyun', 'tencent', 'huawei', 'tsinghua'][choice] || 'official'
}

async function chooseDeploymentMode(flags, currentValues) {
  if (flags.withProxy) {
    return {
      withProxy: true,
      publicDomain: flags.publicDomain || currentValues.PUBLIC_DOMAIN || 'www.example.com',
      adminDomain: flags.adminDomain || currentValues.ADMIN_DOMAIN || `admin.${flags.publicDomain || currentValues.PUBLIC_DOMAIN || 'www.example.com'}`,
      caddyEmail: flags.caddyEmail || currentValues.CADDY_EMAIL || 'ops@example.com',
      httpPort: currentValues.REVERSE_PROXY_HTTP_PORT || '80',
      httpsPort: currentValues.REVERSE_PROXY_HTTPS_PORT || '443',
    }
  }

  if (flags.yes || !process.stdin.isTTY) {
    return {
      withProxy: Boolean(currentValues.PUBLIC_DOMAIN && currentValues.ADMIN_DOMAIN && currentValues.CADDY_EMAIL),
      publicDomain: currentValues.PUBLIC_DOMAIN || '',
      adminDomain: currentValues.ADMIN_DOMAIN || '',
      caddyEmail: currentValues.CADDY_EMAIL || '',
      httpPort: currentValues.REVERSE_PROXY_HTTP_PORT || '80',
      httpsPort: currentValues.REVERSE_PROXY_HTTPS_PORT || '443',
    }
  }

  const choice = await promptChoice('请选择部署方式', [
    '启动核心服务（默认）',
    '启动完整服务 + 域名反向代理',
  ], 0)

  if (choice !== 1) {
    return {
      withProxy: Boolean(currentValues.PUBLIC_DOMAIN && currentValues.ADMIN_DOMAIN && currentValues.CADDY_EMAIL),
      publicDomain: currentValues.PUBLIC_DOMAIN || '',
      adminDomain: currentValues.ADMIN_DOMAIN || '',
      caddyEmail: currentValues.CADDY_EMAIL || '',
      httpPort: currentValues.REVERSE_PROXY_HTTP_PORT || '80',
      httpsPort: currentValues.REVERSE_PROXY_HTTPS_PORT || '443',
    }
  }

  const publicDomain = await promptText('请输入官网域名', currentValues.PUBLIC_DOMAIN || 'www.example.com')
  const adminDomain = await promptText('请输入后台域名', currentValues.ADMIN_DOMAIN || `admin.${publicDomain}`)
  const caddyEmail = await promptText('请输入 Caddy 证书邮箱', currentValues.CADDY_EMAIL || 'ops@example.com')
  const httpPort = await promptText('请输入反代 HTTP 端口', currentValues.REVERSE_PROXY_HTTP_PORT || '80')
  const httpsPort = await promptText('请输入反代 HTTPS 端口', currentValues.REVERSE_PROXY_HTTPS_PORT || '443')
  return {
    withProxy: true,
    publicDomain,
    adminDomain,
    caddyEmail,
    httpPort,
    httpsPort,
  }
}

function getExistingAdminPhones() {
  try {
    const payload = runAdminMaintenance(repoRootFallback, { action: 'list' })
    return new Set((payload.admins || []).map((item) => String(item.phone || '').trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

async function chooseResetMode(flags, currentValues) {
  if (flags.resetMode) {
    return flags.resetMode
  }
  if (flags.yes || !process.stdin.isTTY) {
    return 'keep'
  }

  const hasExistingRuntime = Object.keys(currentValues).length > 0
  if (!hasExistingRuntime) {
    return 'keep'
  }

  const choice = await promptChoice('检测到已有部署配置，选择本次处理方式', [
    '保留现有配置并继续部署（默认）',
    '仅重置初始化凭据',
    '恢复出厂并重新部署',
  ], 0)

  return ['keep', 'init', 'factory'][choice] || 'keep'
}

function buildNextRuntimeValues(currentValues, mirrorProfile, deployMode, resetMode, existingPhones = new Set()) {
  const nextValues = {
    ...currentValues,
    ...buildMirrorEnv(mirrorProfile),
    ADMIN_WEB_HOST_PORT: currentValues.ADMIN_WEB_HOST_PORT || '8888',
    SITE_WEB_HOST_PORT: currentValues.SITE_WEB_HOST_PORT || '1888',
    INVITE_WEB_HOST_PORT: currentValues.INVITE_WEB_HOST_PORT || '1788',
    GO_API_HOST_PORT: currentValues.GO_API_HOST_PORT || '1029',
    BFF_HOST_PORT: currentValues.BFF_HOST_PORT || '25500',
    SOCKET_HOST_PORT: currentValues.SOCKET_HOST_PORT || '9898',
    POSTGRES_HOST_PORT: currentValues.POSTGRES_HOST_PORT || '5432',
    REDIS_HOST_PORT: currentValues.REDIS_HOST_PORT || '2550',
    ALIPAY_SIDECAR_HOST_PORT: currentValues.ALIPAY_SIDECAR_HOST_PORT || '10301',
    BANK_PAYOUT_SIDECAR_HOST_PORT: currentValues.BANK_PAYOUT_SIDECAR_HOST_PORT || '10302',
    ADMIN_WEB_BASE_URL: currentValues.ADMIN_WEB_BASE_URL || 'http://127.0.0.1:8888',
    SITE_WEB_BASE_URL: currentValues.SITE_WEB_BASE_URL || 'http://127.0.0.1:1888',
    PUBLIC_LANDING_BASE_URL: currentValues.PUBLIC_LANDING_BASE_URL || 'http://127.0.0.1:1788',
    ONBOARDING_INVITE_BASE_URL: currentValues.ONBOARDING_INVITE_BASE_URL || 'http://127.0.0.1:1788',
    COUPON_CLAIM_LINK_BASE_URL: currentValues.COUPON_CLAIM_LINK_BASE_URL || 'http://127.0.0.1:1788',
  }

  delete nextValues.DOWNLOAD_WEB_HOST_PORT
  delete nextValues.DOWNLOAD_WEB_BASE_URL

  if (deployMode.withProxy) {
    nextValues.PUBLIC_DOMAIN = deployMode.publicDomain
    nextValues.ADMIN_DOMAIN = deployMode.adminDomain
    nextValues.CADDY_EMAIL = deployMode.caddyEmail
    nextValues.REVERSE_PROXY_HTTP_PORT = deployMode.httpPort || currentValues.REVERSE_PROXY_HTTP_PORT || '80'
    nextValues.REVERSE_PROXY_HTTPS_PORT = deployMode.httpsPort || currentValues.REVERSE_PROXY_HTTPS_PORT || '443'
    const httpsPort = String(nextValues.REVERSE_PROXY_HTTPS_PORT || '443')
    nextValues.SITE_WEB_BASE_URL = httpsPort === '443'
      ? `https://${deployMode.publicDomain}`
      : `https://${deployMode.publicDomain}:${httpsPort}`
    nextValues.ADMIN_WEB_BASE_URL = httpsPort === '443'
      ? `https://${deployMode.adminDomain}`
      : `https://${deployMode.adminDomain}:${httpsPort}`
    nextValues.ALLOWED_ORIGINS = buildAllowedOrigins(deployMode.publicDomain, deployMode.adminDomain, {
      httpPort: nextValues.REVERSE_PROXY_HTTP_PORT,
      httpsPort: nextValues.REVERSE_PROXY_HTTPS_PORT,
    })
  } else {
    nextValues.ALLOWED_ORIGINS = buildAllowedOrigins('', '', {
      httpPort: nextValues.REVERSE_PROXY_HTTP_PORT,
      httpsPort: nextValues.REVERSE_PROXY_HTTPS_PORT,
    })
  }

  const shouldRotateCredentials =
    resetMode === 'init' ||
    resetMode === 'factory' ||
    !currentValues.BOOTSTRAP_ADMIN_PHONE ||
    !currentValues.BOOTSTRAP_ADMIN_PASSWORD ||
    !currentValues.SYSTEM_LOG_DELETE_ACCOUNT ||
    !currentValues.SYSTEM_LOG_DELETE_PASSWORD

  if (shouldRotateCredentials) {
    const generated = generateDeploymentCredentials({ existingPhones })
    nextValues.BOOTSTRAP_ADMIN_PHONE = generated.bootstrapAdminPhone
    nextValues.BOOTSTRAP_ADMIN_NAME = generated.bootstrapAdminName
    nextValues.BOOTSTRAP_ADMIN_PASSWORD = generated.bootstrapAdminPassword
    nextValues.SYSTEM_LOG_DELETE_ACCOUNT = generated.systemLogDeleteAccount
    nextValues.SYSTEM_LOG_DELETE_PASSWORD = generated.systemLogDeletePassword
  }

  return nextValues
}

function printSummary(envFile, runtimeValues, launcherInfo) {
  const receiptPath = writeSensitiveReceipt(repoRootFallback, 'install-credentials', [
    { label: 'Bootstrap 手机号', value: runtimeValues.BOOTSTRAP_ADMIN_PHONE },
    { label: 'Bootstrap 名称', value: runtimeValues.BOOTSTRAP_ADMIN_NAME },
    { label: 'Bootstrap 一次性口令', value: runtimeValues.BOOTSTRAP_ADMIN_PASSWORD },
    { label: '二次验证账号', value: runtimeValues.SYSTEM_LOG_DELETE_ACCOUNT },
    { label: '二次验证口令', value: runtimeValues.SYSTEM_LOG_DELETE_PASSWORD },
  ])
  console.log('\n运行时环境文件已写入：')
  console.log(`  ${envFile}`)
  console.log('\n全局命令已安装：')
  console.log(`  ${launcherInfo.launcherPaths.join('\n  ')}`)
  console.log('\n首次初始化管理员信息：')
  console.log(`  手机号: ${maskSecret(runtimeValues.BOOTSTRAP_ADMIN_PHONE)}`)
  console.log(`  名称:   ${runtimeValues.BOOTSTRAP_ADMIN_NAME}`)
  console.log('  口令:   已写入安全回执')
  console.log('\n敏感操作二次验证信息：')
  console.log(`  账号: ${maskSecret(runtimeValues.SYSTEM_LOG_DELETE_ACCOUNT)}`)
  console.log('  口令: 已写入安全回执')
  console.log('\n敏感凭据回执：')
  console.log(`  ${receiptPath}`)
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const paths = getManagementPaths(repoRootFallback)
  const currentValues = readEnvFile(paths.defaultEnvFile)

  console.log(`检测到系统：${detectSystemLabel()}`)

  const mirrorProfile = await chooseMirrorProfile(flags)
  const deployMode = await chooseDeploymentMode(flags, currentValues)
  const resetMode = await chooseResetMode(flags, currentValues)
  const existingPhones = getExistingAdminPhones()
  const nextValues = buildNextRuntimeValues(currentValues, mirrorProfile, deployMode, resetMode, existingPhones)
  writeEnvFile(paths.defaultEnvFile, nextValues)

  const launcherInfo = installGlobalLaunchers(repoRootFallback)
  printSummary(paths.defaultEnvFile, nextValues, launcherInfo)

  if (flags.noDeploy) {
    console.log('\n按要求仅完成安装与配置，未启动容器。')
    return
  }

  const profiles = resolveProfilesForMode('full', nextValues)
  if (resetMode === 'factory') {
    console.log('\n正在执行恢复出厂并重新部署...')
    composeDown(repoRootFallback, {
      envFile: paths.defaultEnvFile,
      profiles,
      removeOrphans: true,
    })
    const removedVolumes = removeManagedVolumes(repoRootFallback, {
      envFile: paths.defaultEnvFile,
      profiles,
      preserve: ['caddy_data', 'caddy_config'],
    })
    if (removedVolumes.length > 0) {
      console.log(`已删除数据卷：${removedVolumes.join(', ')}`)
    }
  }

  console.log('\n开始启动 Docker 全栈服务...')
  composeUp(repoRootFallback, {
    envFile: paths.defaultEnvFile,
    profiles,
    detach: true,
    build: true,
  })

  console.log('\n安装完成。以后可直接在任意目录输入 `infinitech` 或 `infinite` 进入系统管理菜单。')
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
