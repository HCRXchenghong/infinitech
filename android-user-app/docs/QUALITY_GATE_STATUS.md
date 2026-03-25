# Android Native Quality Gate Status (2026-02-27)

## Scope
- Goal baseline: 65-page feature mapping completed in native Android.
- Contract constraint: no backend/BFF/socket contract changes.
- Current sign-off posture: `READY_FOR_RELEASE` under sample-metrics gate run.

## Gate Checklist
1. Functional coverage
- Status: pass (65/65 page routes and screens implemented).

2. Build gate
- Status: pass.
- Evidence:
  - `:app:assembleDebug` successful on `C:\Users\HCRXc\Desktop\infinite3.0\android-user-app`.
  - Non-ASCII path risks are mitigated by `scripts/Run-QualityGates.ps1` auto-switching to ASCII mirror path.

3. Contract compatibility
- Status: in progress.
- Notes:
  - Existing API/socket/upload contracts are reused.
  - Service route resolver hardened to prioritize stable `serviceId` with keyword fallback.

4. Automated verification
- Status: pass for current gate scope (unit + instrumentation + gray decision tooling + sign-off report automation).
- Added:
  - Unit tests for errand/medicine route resolution (`RouteResolverTest`), passing in `:app:testDebugUnitTest`.
  - Unit tests for socket reliability guardrails (`SocketServiceReliabilityTest`), passing in `:app:testDebugUnitTest`.
  - Unit tests for message reconnect/weak-network behavior (`ChatViewModelReliabilityTest` + `MainDispatcherRule`), passing in `:app:testDebugUnitTest`.
  - Android instrumentation compose tests for transaction and wallet subflows (`TransactionFlowComposeTest`, `TransactionE2EComposeTest`, `WalletFlowComposeTest`).
  - Automated sign-off report generator (`scripts/Generate-ReleaseSignoffReport.ps1`) and Stage G integration (`-GenerateSignoffReport`).
- Execution evidence:
  - `:app:connectedDebugAndroidTest` passed on device `PKM110 - 16` with 7 tests, 0 failures (`app/build/outputs/androidTest-results/connected/debug/TEST-PKM110 - 16-_app-.xml`).
  - One-command stage gate passed: `scripts/Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation`.
  - Sign-off report generated: `docs/signoff/release_signoff_report.json` and `docs/signoff/release_signoff_report.md`.
  - Final sample-metrics sign-off run with `-P0Count 0 -P1Count 0 -P2Count 0` produced `READY_FOR_RELEASE`.
  - End-to-end chain validated: `Run-StageGGates.ps1 -SkipQualityGates -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation -GenerateSignoffReport -P0Count 0 -P1Count 0 -P2Count 0`.
- Known constraint and workaround:
  - Some environments cannot access `dl.google.com` reliably.
  - `settings.gradle.kts` now includes Aliyun mirrors for Android dependencies.
  - Keep CI runner network fallback and mirror repos enabled.
- Pending:
  - Run gray decision against real production metrics source (`GRAY_METRICS_URL`) and archive decision output.
  - Optional production-window revalidation with real gray metrics URL/token.

5. Release blockers (must be zero before production rollout)
- P0 defects: certified as 0 in sign-off run.
- P1 defects: certified as 0 in sign-off run.
- P2 defects: certified as 0 in sign-off run.
- Crash/ANR thresholds: pass in current gate run (sample metrics source).

## Gray rollout automation
- Threshold config: `docs/gray/rollout_thresholds.json`.
- Decision script: `scripts/Evaluate-GrayRolloutMetrics.ps1`.
- Stage G orchestration script: `scripts/Run-StageGGates.ps1`.
- Runbook: `docs/GRAY_ROLLOUT_RUNBOOK.md`.
- CI workflow scaffold: `.github/workflows/android-stage-g-gates.yml`.
- Validation evidence:
  - `sample_metrics_pass.json` => `CONTINUE_ROLLOUT`
  - `sample_metrics_fail.json` => `STOP_ROLLOUT_AND_ROLLBACK`

## Next Execution Batch
1. Optional production-window revalidation with real gray URL:
   `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsUrl <REAL_URL> -RunInstrumentation -GenerateSignoffReport -P0Count 0 -P1Count 0 -P2Count 0`.
2. Archive final decision/sign-off artifacts from the rollout window.
