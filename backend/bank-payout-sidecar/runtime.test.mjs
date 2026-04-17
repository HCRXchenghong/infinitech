import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createBankPayoutRuntime,
  verifyConfiguredAdapterSignature,
} from './runtime.js'

test('bank runtime requires an explicit sidecar api secret', () => {
  assert.throws(
    () => createBankPayoutRuntime({ ENV: 'development' }),
    /BANK_PAYOUT_SIDECAR_API_SECRET is required/,
  )
})

test('bank runtime only enables stub mode from environment flags', () => {
  const runtime = createBankPayoutRuntime({
    ENV: 'development',
    BANK_PAYOUT_SIDECAR_API_SECRET: 'bank-secret',
    BANK_PAYOUT_ALLOW_STUB: 'true',
  })

  assert.equal(runtime.allowStubRequested, true)
  assert.equal(runtime.allowStub, true)
  assert.equal(runtime.currentMode({ allowStub: false }), 'stub')
  assert.equal(runtime.currentMode({ allowStub: true }), 'stub')

  const summary = runtime.configSummary({ allowStub: true })
  assert.equal(summary.allowStubRequested, true)
  assert.equal(summary.allowStub, true)
  assert.equal(summary.allowStubBlocked, false)
})

test('bank runtime blocks stub mode in production-like environments', () => {
  const runtime = createBankPayoutRuntime({
    ENV: 'production',
    BANK_PAYOUT_SIDECAR_API_SECRET: 'bank-secret',
    BANK_PAYOUT_ALLOW_STUB: 'true',
  })

  assert.equal(runtime.allowStubRequested, true)
  assert.equal(runtime.allowStub, false)
  assert.equal(runtime.currentMode({}), 'unconfigured')
  assert.equal(runtime.configSummary({}).allowStubBlocked, true)
})

test('bank runtime verifies authenticated sidecar requests', () => {
  const runtime = createBankPayoutRuntime({
    ENV: 'development',
    BANK_PAYOUT_SIDECAR_API_SECRET: 'bank-secret',
  })

  assert.equal(runtime.verifySidecarRequest({ 'x-sidecar-secret': 'bank-secret' }), true)
  assert.equal(runtime.verifySidecarRequest({ 'x-sidecar-secret': 'wrong-secret' }), false)
})

test('bank configured adapter signature check uses timing-safe equality', () => {
  assert.equal(
    verifyConfiguredAdapterSignature('provider-api-key', { apiKey: 'provider-api-key' }),
    true,
  )
  assert.equal(
    verifyConfiguredAdapterSignature('provider-api-key', { apiKey: 'wrong-api-key' }),
    false,
  )
})
