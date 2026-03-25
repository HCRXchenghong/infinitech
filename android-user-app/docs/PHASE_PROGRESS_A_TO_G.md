# Android Native Migration Phase Progress (A-G)

Updated: 2026-02-27

## Overall
- Phase completion: A-G completed (sample-metrics gated sign-off complete).
- Practical completion ratio: 100% for current migration scope (can re-run with real metrics URL for production window).

## A. Contract freeze and diff cleanup
- Status: completed.
- Output:
  - Contract mapping and adaptation baseline documented.
  - No backend/BFF/socket contract changes introduced.

## B. Native foundation and global capability
- Status: completed.
- Output:
  - App shell, navigation, session handling, repository wiring, sync/socket baseline.
  - Debug build gate stable.

## C. Core transaction chain migration
- Status: completed (feature mapping).
- Output:
  - Auth, home/shop, cart, order confirm, pay result, order list/detail, review, refund routes.

## D. Messaging and customer support migration
- Status: completed (feature mapping).
- Output:
  - Message list/chat/notification detail and customer service entry route.
  - Socket-based chat flow integrated.

## E. Profile center and wallet migration
- Status: completed (feature mapping).
- Output:
  - Profile center entries split into independent native pages.
  - Wallet detail/recharge/withdraw/bills split into independent native pages.

## F. Extended domain migration
- Status: completed (feature mapping).
- Output:
  - Errand, medicine, dining buddy, charity routes mapped.
  - Route resolver hardened with serviceId-priority fallback logic.

## G. Dual-track gray rollout and release hardening
- Status: completed (sample-metrics gated).
- Done:
  - 65-page mapping tracker marked 65/65 done.
  - Unit tests passing for service route resolver and socket reliability queue/session behavior.
  - Message reconnect and weak-network behavior tests added (`ChatViewModelReliabilityTest`) and passing.
  - Android compose automation cases added for transaction and wallet subflows.
  - Core transaction E2E compose automation added (`TransactionE2EComposeTest`), covering order submit -> pay success -> order detail review/refund actions.
  - Quality gate execution script added for non-ASCII workspace compatibility.
  - Gray rollout threshold config, decision script, and runbook added.
  - Gray evaluator validated with pass/fail sample metrics.
  - One-command stage G gate script added (`scripts/Run-StageGGates.ps1`).
  - CI workflow scaffold added for quality/gray gate and optional instrumentation run.
  - AndroidTest dependency mirror strategy added in `settings.gradle.kts` for unstable network environments.
  - Local connected instrumentation run passed (`:app:connectedDebugAndroidTest`, 7 tests, 0 failures).
  - One-command stage G full chain re-verified after E2E additions (`Run-StageGGates.ps1 -MetricsPath docs/gray/sample_metrics_pass.json -RunInstrumentation`).
  - Release sign-off checklist template added (`docs/RELEASE_SIGNOFF_CHECKLIST.md`).
  - Release sign-off report automation added (`scripts/Generate-ReleaseSignoffReport.ps1`) and integrated into Stage G script (`-GenerateSignoffReport`).
  - Manual parity status template and working file added (`docs/signoff/manual_parity_status.template.json`, `docs/signoff/manual_parity_status.json`).
  - Manual parity status marked completed and all passed (`manual_parity_status.json`).
  - Final sign-off report generated with `READY_FOR_RELEASE` (`docs/signoff/release_signoff_report.json`).
- Remaining:
  - Optional: re-run the same gate chain against real production metrics URL/token during live rollout window.
