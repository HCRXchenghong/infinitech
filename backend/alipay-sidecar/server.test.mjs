import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cwd = path.dirname(fileURLToPath(import.meta.url))

async function waitForServer(baseUrl, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) {
        return
      }
    } catch {}
    await delay(100)
  }
  throw new Error(`alipay sidecar did not become ready within ${timeoutMs}ms`)
}

async function startServer(t, envOverrides = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000)
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    env: {
      ...process.env,
      ENV: 'development',
      ALIPAY_SIDECAR_PORT: String(port),
      ALIPAY_SIDECAR_API_SECRET: 'alipay-sidecar-secret',
      ...envOverrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk)
  })

  t.after(() => {
    child.kill('SIGTERM')
  })

  const baseUrl = `http://127.0.0.1:${port}`
  try {
    await waitForServer(baseUrl)
  } catch (error) {
    child.kill('SIGTERM')
    const detail = stderr.trim()
    throw new Error(detail ? `${error.message}\n${detail}` : error.message)
  }

  return { baseUrl }
}

test('alipay payment create rejects requests without official sidecar config', async (t) => {
  const { baseUrl } = await startServer(t)

  const response = await fetch(`${baseUrl}/v1/payments/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-sidecar-secret': 'alipay-sidecar-secret',
    },
    body: JSON.stringify({
      outTradeNo: 'ALI-ORDER-1001',
      scene: 'app',
      amount: 1888,
      description: '平台支付',
      notifyUrl: 'https://example.com/alipay/notify',
    }),
  })

  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.success, false)
  assert.equal(payload.error, 'alipay sidecar is not fully configured')
})
