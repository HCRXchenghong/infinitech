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
  throw new Error(`bank payout sidecar did not become ready within ${timeoutMs}ms`)
}

async function startServer(t, envOverrides = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000)
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    env: {
      ...process.env,
      ENV: 'development',
      BANK_PAYOUT_SIDECAR_PORT: String(port),
      BANK_PAYOUT_SIDECAR_API_SECRET: 'bank-sidecar-secret',
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

test('bank payout create rejects requests without a configured adapter', async (t) => {
  const { baseUrl } = await startServer(t)

  const response = await fetch(`${baseUrl}/v1/payouts/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-sidecar-secret': 'bank-sidecar-secret',
    },
    body: JSON.stringify({
      requestId: 'WITHDRAW-REQ-STUB',
      transactionId: 'WITHDRAW-TXN-STUB',
      withdrawAccount: '6222020000000000000',
      amount: 1888,
      actualAmount: 1888,
    }),
  })

  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.success, false)
  assert.equal(
    payload.error,
    'bank payout sidecar is not fully configured',
  )
})

test('bank payout notify verify requires configured adapter signature', async (t) => {
  const { baseUrl } = await startServer(t)

  const requestBody = {
    params: {
      requestId: 'WITHDRAW-REQ-ADAPTER',
      status: 'success',
      thirdPartyOrderId: 'BANK-PAYOUT-2001',
    },
    providerUrl: 'https://bank.example.com/payouts',
    merchantId: 'merchant-1',
    apiKey: 'provider-api-key',
    notifyUrl: 'https://example.com/payouts/notify',
  }

  const invalidResponse = await fetch(`${baseUrl}/v1/notify/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-sidecar-secret': 'bank-sidecar-secret',
    },
    body: JSON.stringify({
      ...requestBody,
      headers: {
        'x-bank-signature': 'wrong-signature',
      },
    }),
  })
  assert.equal(invalidResponse.status, 400)
  const invalidPayload = await invalidResponse.json()
  assert.equal(invalidPayload.success, false)
  assert.equal(
    invalidPayload.error,
    'bank payout callback signature verification failed',
  )

  const validResponse = await fetch(`${baseUrl}/v1/notify/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-sidecar-secret': 'bank-sidecar-secret',
    },
    body: JSON.stringify({
      ...requestBody,
      headers: {
        'x-bank-signature': 'provider-api-key',
      },
    }),
  })
  assert.equal(validResponse.status, 200)
  const validPayload = await validResponse.json()
  assert.equal(validPayload.success, true)
  assert.equal(validPayload.verified, true)
  assert.equal(validPayload.message, 'Bank payout sidecar verified provider callback.')
  assert.equal(validPayload.eventType, 'payout.success')
  assert.equal(validPayload.thirdPartyOrderId, 'BANK-PAYOUT-2001')
})
