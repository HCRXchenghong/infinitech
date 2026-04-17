import test from 'node:test'
import assert from 'node:assert/strict'

import { createAlipayRuntime } from './runtime.js'

test('alipay runtime requires an explicit sidecar api secret', () => {
  assert.throws(
    () => createAlipayRuntime({ ENV: 'development' }),
    /ALIPAY_SIDECAR_API_SECRET is required/,
  )
})

test('alipay runtime enters stub mode only when explicitly enabled outside production', () => {
  const runtime = createAlipayRuntime({
    ENV: 'development',
    ALIPAY_SIDECAR_API_SECRET: 'alipay-secret',
    ALIPAY_SIDECAR_ALLOW_STUB: 'true',
  })

  assert.equal(runtime.allowStubRequested, true)
  assert.equal(runtime.allowStub, true)
  assert.equal(runtime.currentMode(), 'stub')
  assert.equal(runtime.configSummary().allowStubBlocked, false)
})

test('alipay runtime blocks stub mode in production-like environments', () => {
  const runtime = createAlipayRuntime({
    ENV: 'staging',
    ALIPAY_SIDECAR_API_SECRET: 'alipay-secret',
    ALIPAY_SIDECAR_ALLOW_STUB: 'true',
  })

  assert.equal(runtime.allowStubRequested, true)
  assert.equal(runtime.allowStub, false)
  assert.equal(runtime.currentMode(), 'unconfigured')
  assert.equal(runtime.configSummary().allowStubBlocked, true)
})

test('alipay runtime becomes official-sdk when official env config is complete', () => {
  const runtime = createAlipayRuntime({
    ENV: 'production',
    ALIPAY_SIDECAR_API_SECRET: 'alipay-secret',
    ALIPAY_APP_ID: 'app-id',
    ALIPAY_PRIVATE_KEY: 'private-key',
    ALIPAY_PUBLIC_KEY: 'public-key',
    ALIPAY_NOTIFY_URL: 'https://example.com/alipay/notify',
  })

  assert.equal(runtime.isReady(), true)
  assert.equal(runtime.currentMode(), 'official-sdk')
})

test('alipay runtime verifies authenticated sidecar requests', () => {
  const runtime = createAlipayRuntime({
    ENV: 'development',
    ALIPAY_SIDECAR_API_SECRET: 'alipay-secret',
  })

  assert.equal(runtime.verifySidecarRequest({ 'x-sidecar-secret': 'alipay-secret' }), true)
  assert.equal(runtime.verifySidecarRequest({ 'x-sidecar-secret': 'wrong-secret' }), false)
})
