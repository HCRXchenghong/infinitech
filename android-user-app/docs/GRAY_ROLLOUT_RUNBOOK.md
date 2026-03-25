# Gray Rollout Runbook

## Objective
- Run native Android in dual-track mode with strict rollback guardrails.

## Gate Inputs
- Threshold file: `docs/gray/rollout_thresholds.json`
- Runtime metric snapshot (JSON) from file or observability endpoint

## Automated Decision
1. Evaluate from local JSON:
   - `powershell -ExecutionPolicy Bypass -File scripts/Evaluate-GrayRolloutMetrics.ps1 -MetricsPath docs/gray/sample_metrics_pass.json`
2. Evaluate from live endpoint:
   - `powershell -ExecutionPolicy Bypass -File scripts/Evaluate-GrayRolloutMetrics.ps1 -MetricsUrl https://metrics.example.com/android/gray-window -AuthBearerToken $env:GRAY_METRICS_BEARER_TOKEN -OutputDecisionPath docs/gray/last_decision.json`
3. Decision output:
   - `CONTINUE_ROLLOUT`: all metrics within thresholds.
   - `STOP_ROLLOUT_AND_ROLLBACK`: at least one metric breaches threshold.

## One-Command Stage G Gate
- Run quality gate + gray evaluation + optional instrumentation:
- `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json`
- Optional instrumentation mode (needs connected device/emulator):
- `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation`
- Optional sign-off report generation:
- `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation -GenerateSignoffReport`
- Real metrics mode:
- `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsUrl https://metrics.example.com/android/gray-window -RunInstrumentation`
- Real metrics + final sign-off counts mode:
- `powershell -ExecutionPolicy Bypass -File scripts/Run-StageGGates.ps1 -MetricsUrl https://metrics.example.com/android/gray-window -RunInstrumentation -GenerateSignoffReport -P0Count 0 -P1Count 0 -P2Count 0`
- You can also export `GRAY_METRICS_URL` / `GRAY_METRICS_BEARER_TOKEN` and run without explicit URL args.

## Rollout Stages
1. Stage 0 (`1%`)
- Duration: 30 minutes.
- Require zero rollback signals.
2. Stage 1 (`5%`)
- Duration: 60 minutes.
- Require continuous metric stability.
3. Stage 2 (`20%`)
- Duration: 2 hours.
- Require stability + order/pay/refund consistency check.
4. Stage 3 (`50%`)
- Duration: 4 hours.
- Require no P0/P1 incidents.
5. Stage 4 (`100%`)
- Full rollout after business-hour verification.

## Immediate Rollback Triggers
- Crash rate > threshold.
- ANR rate > threshold.
- Payment success rate < threshold.
- Socket connect success rate < threshold.
- API failure rate > threshold.

## Operations Notes
- If rollback is triggered, freeze rollout and switch traffic back to old client channel.
- Keep new client available only for internal validation cohort until recovered.
- Keep `docs/gray/last_decision.json` in CI artifacts for audit.
- On Windows hosts, `Run-StageGGates.ps1` auto-selects Android Studio JBR and falls back to local SDK `adb.exe` when `adb` is not on `PATH`.
