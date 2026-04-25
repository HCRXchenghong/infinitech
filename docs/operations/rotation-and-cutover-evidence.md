# Rotation And Cutover Evidence

This repository treats secret rotation, release cutover, rollback, and realtime load evidence as first-class acceptance artifacts.

## Secret Rotation

- Generate the evidence template with `node scripts/security/generate-secret-rotation-evidence.mjs`
- Default output path: `artifacts/security/secret-rotation.json`
- The template must be completed for `dev`, `test`, `staging`, and `prod`
- Every sensitive key must carry:
  - `valueReference`
  - `previousVersionRevoked: true`
  - at least one audit or change evidence item
- Every environment must carry:
  - `changeTicket`
  - `rotatedAt`
  - `approvedBy`
  - environment-level evidence
- Validate the completed report with `node scripts/security/check-secret-rotation-evidence.mjs`

## Release Cutover

- Build the release bundle with `node scripts/release-go-live-bundle.mjs`
- Required generated and completed artifacts:
  - `secret-rotation-gate`
  - `preflight`
  - `live-cutover`
  - `rollback-verify`
  - `failure-verify`
  - `realtime-acceptance`
  - `manual-attestation`
  - `evidence-gate`
  - `final-signoff`
- The bundle scripts under `scripts/release-*` are the only supported path for release evidence assembly
- `release-evidence-gate` now requires a passing secret-rotation gate report and a passing realtime-acceptance gate report in addition to the cutover/rollback/failure reports
- Do not claim staging rehearsal or production cutover completion without the archived JSON reports, completed manual attestation payload, secret-rotation gate result, and realtime-acceptance gate result

## Realtime 100k

- Generate the load plan with `node scripts/realtime-load-plan.mjs`
- Archive stage reports under `artifacts/realtime-load/10k.json`, `30k.json`, `60k.json`, and `100k.json`
- Validate the staged reports with `node scripts/realtime-acceptance-gate.mjs`
- Each stage report must also carry the fixed topology/evidence fields required by the acceptance gate
- Do not claim `100k` readiness without a passing acceptance gate result and the underlying stage reports
