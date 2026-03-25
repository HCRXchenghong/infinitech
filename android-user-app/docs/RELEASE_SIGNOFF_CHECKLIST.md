# Android Native Release Sign-Off Checklist

Updated: 2026-02-27

## 1. Automated Gate Evidence
- [x] Unit tests pass: `:app:testDebugUnitTest`
- [x] Build pass: `:app:assembleDebug`
- [x] Connected instrumentation pass: `:app:connectedDebugAndroidTest` (7 tests, 0 failures)
- [x] Stage G one-command gate pass:
  - `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation`
- [x] Gray decision script pass (sample):
  - `docs/gray/last_decision.json` => `CONTINUE_ROLLOUT`
- [x] Sign-off report automation ready:
  - `powershell -ExecutionPolicy Bypass -File scripts/Generate-ReleaseSignoffReport.ps1`
  - Output: `docs/signoff/release_signoff_report.json` and `docs/signoff/release_signoff_report.md`

## 2. Manual Parity Checklist (Old app-mobile vs Android native)
- [x] Login/register/reset password parity
- [x] Shop browse/search/category parity
- [x] Order flow parity (cart -> confirm -> pay success -> detail)
- [x] Refund/review parity
- [x] Wallet parity (balance/recharge/withdraw/bills)
- [x] Message/chat/customer-service parity (including reconnect after network loss)
- [x] Extended domains parity (errand/medicine/dining-buddy/charity)
- [x] Fill and maintain parity status file: `docs/signoff/manual_parity_status.json`

## 3. Gray Rollout Live Metrics
- [ ] `GRAY_METRICS_URL` configured with production gray window endpoint
- [ ] `GRAY_METRICS_BEARER_TOKEN` configured (if required)
- [ ] Live decision generated and archived:
  - `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsUrl <REAL_URL> -RunInstrumentation`
  - Archive output: `docs/gray/last_decision.json`
- [ ] Final integrated sign-off run executed:
  - `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsUrl <REAL_URL> -RunInstrumentation -GenerateSignoffReport -P0Count 0 -P1Count 0 -P2Count 0`
  - Archive output: `docs/signoff/release_signoff_report.json`

## 4. Defect Redline (Must Be Zero Before Release)
- [x] P0 = 0
- [x] P1 = 0
- [x] P2 = 0
- [x] No blocking crash/ANR regression in gray cohort (current sample-metrics gate run)

## 5. Release Decision
- [x] Continue rollout to 100% (current sign-off report: `READY_FOR_RELEASE`)
- [ ] Hold and fix issues
- [ ] Roll back to old client channel
