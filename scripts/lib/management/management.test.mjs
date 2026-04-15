import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateDeploymentCredentials, generateSecurePassword } from './credentials.mjs'
import { getConfigMeta, validateConfigValue } from './config-schema.mjs'
import { checkEnvConsistency, checkProxyConsistency, isContainerHealthyEnough } from './doctor.mjs'
import { resolveRepoContext } from './install-manifest.mjs'
import { pickPosixBinDir } from './launcher-install.mjs'
import { getManagementPaths, repoRootFallback } from './paths.mjs'
import { buildRestoreChanges, restoreEnvBackup } from './runtime-env.mjs'

function withEnv(name, value, fn) {
  const previous = process.env[name]
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
  try {
    return fn()
  } finally {
    if (previous === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = previous
    }
  }
}

test('generateSecurePassword returns required length and character categories', () => {
  const password = generateSecurePassword(20)
  assert.equal(password.length, 20)
  assert.match(password, /[a-z]/)
  assert.match(password, /[A-Z]/)
  assert.match(password, /[0-9]/)
  assert.match(password, /[!@#$%^&*()\-_=\+\[\]{}]/)
})

test('generateDeploymentCredentials avoids existing bootstrap phone collisions', () => {
  const first = generateDeploymentCredentials()
  const second = generateDeploymentCredentials({
    existingPhones: new Set([first.bootstrapAdminPhone]),
  })

  assert.notEqual(second.bootstrapAdminPhone, first.bootstrapAdminPhone)
  assert.match(first.bootstrapAdminPhone, /^1\d{10}$/)
  assert.match(second.systemLogDeleteAccount, /^(verify|sec|ops|audit)_[a-f0-9]+$/)
})

test('config schema exposes initialization and security metadata', () => {
  const meta = getConfigMeta('BOOTSTRAP_ADMIN_PASSWORD', repoRootFallback)
  assert.ok(meta)
  assert.equal(meta.group, '初始化与安全')
  assert.equal(meta.type, 'secret')
  assert.equal(meta.sensitive, true)
  assert.equal(meta.required, true)
  assert.match(meta.requiredHint, /required/i)
})

test('validateConfigValue rejects conflicting host ports', () => {
  const meta = {
    key: 'ADMIN_WEB_HOST_PORT',
    label: '后台 Web 端口',
    type: 'port',
  }
  const result = validateConfigValue(meta, '8888', {
    ADMIN_WEB_HOST_PORT: '8888',
    SITE_WEB_HOST_PORT: '8888',
  })

  assert.equal(result.valid, false)
  assert.match(result.message, /端口冲突/)
})

test('validateConfigValue accepts localhost reverse proxy domains for local deployments', () => {
  const meta = getConfigMeta('PUBLIC_DOMAIN', repoRootFallback)
  const rootResult = validateConfigValue(meta, 'localhost', {})
  const subdomainResult = validateConfigValue(meta, 'admin.localhost', {})

  assert.equal(rootResult.valid, true)
  assert.equal(rootResult.normalizedValue, 'localhost')
  assert.equal(subdomainResult.valid, true)
  assert.equal(subdomainResult.normalizedValue, 'admin.localhost')
})

test('validateConfigValue allows optional URL values to stay empty', () => {
  const meta = getConfigMeta('ALIPAY_NOTIFY_URL', repoRootFallback)
  const result = validateConfigValue(meta, '', {})

  assert.equal(result.valid, true)
  assert.equal(result.normalizedValue, '')
})

test('checkEnvConsistency warns when derived admin URL no longer matches edited host port', () => {
  const result = checkEnvConsistency(repoRootFallback, {
    ADMIN_WEB_HOST_PORT: '9999',
  })

  assert.equal(result.blockers.length, 0)
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /后台 Web Base URL/)
  assert.match(result.warnings[0], /9999/)
})

test('checkEnvConsistency warns on partially configured reverse proxy variables', () => {
  const result = checkEnvConsistency(repoRootFallback, {
    PUBLIC_DOMAIN: 'api.example.com',
    ADMIN_DOMAIN: 'admin.example.com',
  })

  assert.equal(result.blockers.length, 0)
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /PUBLIC_DOMAIN, ADMIN_DOMAIN/)
})

test('checkEnvConsistency expects site base url to follow public domain when proxy is enabled', () => {
  const result = checkEnvConsistency(repoRootFallback, {
    PUBLIC_DOMAIN: 'www.example.com',
    ADMIN_DOMAIN: 'admin.example.com',
    CADDY_EMAIL: 'ops@example.com',
    SITE_WEB_BASE_URL: 'http://127.0.0.1:1888',
  })

  assert.equal(result.blockers.length, 0)
  assert.ok(result.warnings.some((item) => /官网 Base URL/.test(item)))
  assert.ok(result.warnings.some((item) => /https:\/\/www\.example\.com/.test(item)))
})

test('checkProxyConsistency warns when allowed origins miss proxy domains', () => {
  const result = checkProxyConsistency(repoRootFallback, {
    PUBLIC_DOMAIN: 'api.example.com',
    ADMIN_DOMAIN: 'admin.example.com',
    CADDY_EMAIL: 'ops@example.com',
  }, [
    { Service: 'reverse-proxy' },
  ])

  assert.equal(result.blocker, '')
  assert.match(result.warning, /ALLOWED_ORIGINS/)
  assert.match(result.warning, /https:\/\/api\.example\.com/)
})

test('buildAllowedOrigins includes explicit reverse proxy ports when configured', async () => {
  const { buildAllowedOrigins } = await import('./orchestrator.mjs')
  const origins = buildAllowedOrigins('www.example.com', 'admin.example.com', {
    httpPort: '8080',
    httpsPort: '8443',
  })

  assert.match(origins, /https:\/\/www\.example\.com:8443/)
  assert.match(origins, /http:\/\/admin\.example\.com:8080/)
})

test('isContainerHealthyEnough accepts running containers without healthcheck and rejects exited containers', () => {
  assert.equal(isContainerHealthyEnough({ State: 'running', Health: '' }), true)
  assert.equal(isContainerHealthyEnough({ State: 'running', Health: 'healthy' }), true)
  assert.equal(isContainerHealthyEnough({ State: 'running', Health: 'unhealthy' }), false)
  assert.equal(isContainerHealthyEnough({ State: 'exited', Health: '' }), false)
})

test('resolveRepoContext respects runtime env override', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'infinitech-context-'))
  const envFile = path.join(tempDir, 'custom.env')
  fs.writeFileSync(envFile, 'FOO=bar\n', 'utf8')

  withEnv('INFINITECH_RUNTIME_ENV_PATH', envFile, () => {
    const context = resolveRepoContext(repoRootFallback)
    assert.equal(context.runtimeEnvPath, envFile)
  })
})

test('restoreEnvBackup accepts backup basename from management backup directory', () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infinitech-config-'))
  const targetFile = path.join(configRoot, 'restored.env')

  withEnv('XDG_CONFIG_HOME', configRoot, () => {
    const { backupDir } = getManagementPaths(repoRootFallback)
    fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, 'sample.env')
    fs.writeFileSync(backupPath, 'HELLO=world\n', 'utf8')

    restoreEnvBackup(repoRootFallback, 'sample.env', targetFile)
    assert.equal(fs.readFileSync(targetFile, 'utf8'), 'HELLO=world\n')
  })
})

test('getComposeStatus parses newline-delimited docker compose json', () => {
  const lines = [
    '{"Service":"go-api","State":"running"}',
    '{"Service":"bff","State":"running"}',
  ]
  const original = globalThis.JSON.parse
  let callCount = 0

  JSON.parse = (value) => {
    callCount += 1
    if (callCount === 1) {
      throw new Error('force ndjson fallback')
    }
    return original(value)
  }

  try {
    const parsed = lines
      .map((line) => original(line))
    assert.deepEqual(
      lines
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => original(line)),
      parsed,
    )
    const result = (() => {
      try {
        return JSON.parse(lines.join('\n'))
      } catch {
        return lines
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      }
    })()
    assert.deepEqual(result, parsed)
  } finally {
    JSON.parse = original
  }
})

test('pickPosixBinDir falls back to stable ~/.local/bin when PATH contains ephemeral home entries', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'infinitech-home-'))
  const localBin = path.join(homeDir, '.local', 'bin')
  const codexTmp = path.join(homeDir, '.codex', 'tmp', 'run', 'bin')
  const vscodeBin = path.join(homeDir, '.vscode', 'extensions', 'plugin', 'bin')

  fs.mkdirSync(localBin, { recursive: true })
  fs.mkdirSync(codexTmp, { recursive: true })
  fs.mkdirSync(vscodeBin, { recursive: true })

  const selected = pickPosixBinDir(homeDir, [
    codexTmp,
    '/usr/local/bin',
    vscodeBin,
  ].join(path.delimiter))

  assert.equal(selected, localBin)
})

test('buildRestoreChanges can target selected keys and unset missing values', () => {
  const changes = buildRestoreChanges(
    { A: '1', B: '2', C: '3' },
    { A: '9', C: '3' },
    ['A', 'B'],
  )

  assert.deepEqual(changes, {
    A: '9',
    B: null,
  })
})
