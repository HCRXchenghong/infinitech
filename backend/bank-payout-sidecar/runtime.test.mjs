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

test('bank runtime only becomes ready for configured provider adapters', () => {
  const runtime = createBankPayoutRuntime({
    ENV: 'development',
    BANK_PAYOUT_SIDECAR_API_SECRET: 'bank-secret',
  })

  assert.equal(runtime.currentMode({}), 'unconfigured')
  assert.equal(
    runtime.currentMode({
      providerUrl: 'https://bank.example.com/payouts',
      merchantId: 'merchant-1',
      apiKey: 'provider-api-key',
      notifyUrl: 'https://example.com/payouts/notify',
    }),
    'configured-adapter',
  )

  const summary = runtime.configSummary({
    providerUrl: 'https://bank.example.com/payouts',
    merchantId: 'merchant-1',
    apiKey: 'provider-api-key',
    notifyUrl: 'https://example.com/payouts/notify',
  })
  assert.equal(summary.sidecarMode, 'configured-adapter')
  assert.equal(summary.providerUrlConfigured, true)
  assert.equal(summary.merchantIdConfigured, true)
  assert.equal(summary.apiKeyConfigured, true)
  assert.equal(summary.notifyUrlConfigured, true)
  assert.equal('allowStub' in summary, false)
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
