# Infinitech

Infinitech is a multi-role local life services platform monorepo. The active product surface includes:

- consumer web and app clients
- merchant app
- rider app
- admin web console
- Go business API
- Node.js BFF
- a single real-time gateway (`socket-server`)
- shared mobile runtime modules

The engineering goal is not to claim "single machine, 100k online". The goal is to keep turning the codebase into a horizontally extensible, observable, testable, rollback-friendly production platform that does not fail because of avoidable single-point design, fake data, or weak defaults.

## Repository Scope

Active remediation scope:

- `backend/go`
- `backend/bff`
- `socket-server`
- `admin-vue`
- `user-vue`
- `app-mobile`
- `merchant-app`
- `rider-app`
- `shared/mobile-common`

Kept in the repository but not part of the current main remediation scope:

- `android-user-app`
- `ios-user-app`
- `admin-app`
- historical prototypes, demo assets, and non-critical legacy folders

## Production Baseline

The intended baseline is:

- primary database: `PostgreSQL`
- distributed cache and shared state: `Redis`
- single real-time service: `socket-server`
- business fact source: `backend/go`
- gateway and aggregation layer: `backend/bff`

Important boundaries:

- `SQLite` is not a production primary database
- `socket-server` is the only real-time gateway
- OpenClaw has been removed from the active platform
- mini-programs use system phone calls instead of in-app RTC audio
- planned in-app RTC audio is for `App / H5` only
- first-stage homepage promotion is manually operated by admins, not a self-serve bidding system

## Directory Guide

- `backend/go`: business API, persistence, config validation, readiness, dispatch workers
- `backend/bff`: API gateway, aggregation, admin-facing health aggregation, contact and proxy routes
- `socket-server`: single real-time gateway, Redis-backed shared state, Socket.IO namespaces
- `admin-vue`: operations and admin console
- `user-vue`: consumer uni-app client
- `app-mobile`: app-facing consumer uni-app client
- `merchant-app`: merchant uni-app client
- `rider-app`: rider uni-app client
- `shared/mobile-common`: cross-client shared mobile utilities
- `backend/docker`: local infrastructure compose files
- `scripts`: release preflight, smoke checks, helper scripts
- `.github/workflows`: CI

## What Has Already Been Remediated

### Architecture and runtime hardening

- the repo has been consolidated into a single main repository
- production-like environments now enforce `PostgreSQL + Redis`
- Go, BFF, and `socket-server` expose health and readiness endpoints
- request ids are propagated across Go, BFF, and `socket-server`
- core request size limits, timeouts, rate limits, and slow-request warnings are in place
- release preflight and HTTP smoke scripts are checked into the repo
- HTTP load smoke and release preflight can now enforce both `p95` and `p99` latency ceilings instead of only broad error-rate checks
- release preflight can now emit a structured JSON report for launch drills and audit retention
- `socket-server` is part of CI smoke validation

### Messaging and support system cleanup

- Go message APIs are the authority for conversations and history
- consumer, merchant, rider, and admin chat flows have been pushed toward "server-first, local fallback only"
- old socket history loading routes were removed from the default path
- `socket-server` no longer maintains SQLite chat history as a runtime fact source
- local message caches on active clients have been reduced to tightly bounded emergency display fallbacks
- unread sync now depends much more strictly on service-side read confirmation instead of local optimistic mutation
- chat time, temporary ids, and read receipts have been normalized across active clients
- the admin chat console no longer rewrites conversation summaries locally on incoming messages and now waits for the service conversation list refresh
- the admin chat console no longer writes incoming realtime messages into a local fallback store during the default operator path
- the admin local message fallback store now uses text chat/message ids, preserves real timestamps and statuses, and prunes aggressively instead of behaving like a long-lived second fact source
- the admin chat console no longer falls back to local history when service-side message history fetches fail, keeping the default operator path pinned to service authority
- active merchant and rider messaging entry points have been rewritten into clean UTF-8 copies so live chat, popup routing, and merchant support entry text no longer depend on mojibake-tainted legacy strings
- the rider global message manager has been rewritten into a clean, stable implementation so popup routing and notification text no longer depend on mojibake-tainted legacy strings
- the rider support chat page logic has now been rewritten into a clean UTF-8 server-first copy, removing the dead local-history replacement path and fixing the self/read status bug that previously checked `msg.self` instead of `msg.isSelf`
- the active merchant chat page plus rider task contact and task-detail flows have been cleaned into stable UTF-8 copies so send-state text, contact prompts, navigation fallbacks, and exception reporting no longer rely on mojibake-tainted strings
- the merchant live chat page has now been fully rewritten into a clean server-first copy, so service history, read sync, reconnect behavior, local-only clearing, and upload/send prompts no longer depend on mojibake-tainted legacy markup
- merchant chat and rider support chat now default to service-side history only; the old local history snapshot and SQLite history fallback paths are no longer part of the default runtime flow

### Main flow cleanup

- address books are service-backed
- order confirmation reads real addresses instead of demo contact data
- consumer web and app order-confirm pages now prefer fresh server address lists whenever the user is signed in, with local address cache only serving as a failure fallback
- shared sync layers across consumer, merchant, and rider clients have been rewritten into a cleaner server-first shape with more bounded local fallback behavior
- stale client-side `menus` sync and cache tails have been removed from active shared sync contracts so current clients no longer treat menu data as a separate dataset
- consumer web and app home pages have been rewritten into clean UTF-8 copies so active location, weather, category routing, and homepage feed copy no longer depend on mojibake-tainted strings
- invite pages now only use server-issued invite codes or previously cached real invite codes and no longer fabricate temporary invite codes on the client
- many active fake success prompts, mock placeholders, and visible mojibake strings were removed
- invite, medicine, charity, VIP, rider insurance, support naming, and portal runtime settings were pushed into controlled service-side settings where operationally justified
- system phone contact clicks are now not only recorded but also queryable from the admin console, so hotline usage can be audited without direct database access

### Push foundations

- device registration is connected across active clients
- push worker queue, stats, delivery materialization, and readiness signals exist
- admin pages can inspect push-related readiness and queue signals
- push worker readiness now surfaces FCM token/API target and transport-safety signals through Go, BFF health aggregation, and release preflight
- push worker readiness now also publishes a single production-ready verdict plus explicit provider issues, so admin health views and release preflight no longer need to infer production safety from scattered fields
- release preflight blocks obviously unsafe push worker states
- admin-only manual push dispatch cycle and a scripted push-delivery drill now exist, so release drills can create a real test push message, force a dispatch cycle, poll delivery results, and clean up the drill record
- production-like environments now reject `PUSH_DISPATCH_PROVIDER=log` when dispatch is enabled
- the webhook push path now supports optional auth headers, signed payloads, and logical rejection handling instead of treating every HTTP 200 as success
- production-like webhook dispatch must now use `https` and be signed or authenticated; insecure, unsigned, and unauthenticated webhook delivery is blocked at config validation and release preflight
- production-like webhook dispatch is now also blocked from targeting localhost, private IP ranges, and obvious internal-only hostnames
- the push worker now has a first real vendor-grade provider path for FCM HTTP v1, instead of only `log / webhook`
- FCM dispatch config is now validated more strictly before startup, including client-email format and parseable RSA private-key checks
- the push dispatcher now treats provider rejections and obvious client/auth HTTP failures as terminal errors instead of blindly retrying them into queue buildup
- socket readiness, BFF health aggregation, and release preflight no longer carry obsolete runtime fallback-buffer assertions after the SQLite history path was removed

### Homepage operations

- admin-managed homepage campaign and slot management has been added
- homepage feed service has been introduced
- featured pages have been moved toward the unified homepage feed result

### Operational visibility

- admin dashboard and system logs now expose real readiness and Redis adapter state
- the active admin dashboard and rider ranking page have been rewritten into clean UTF-8 implementations so weather, online presence, ranking tables, and readiness copy no longer depend on mojibake-tainted legacy strings
- admin-side health aggregation and system-log signals have been trimmed to current live fallback metrics instead of obsolete historical fallback counters
- the admin console now includes a dedicated phone contact audit page for filtering actor/target roles, results, and related order or room references
- the admin console now also includes a dedicated RTC call audit page, the Go API now has a first server-side RTC audit model plus create/status-update, detail-query, history-query, and admin-list endpoints, and `socket-server` now exposes a first RTC signaling namespace for invite/status/signal relay flow
- the RTC audit chain now also supports admin-side complaint and recording-retention review actions, so reported calls can be frozen and resolved calls can be marked for cleanup from the admin console instead of only being viewed
- user and app order-contact flows now expose a first `/pages/rtc/call/index` entry wired from the contact modal into the RTC signaling/audit path, so RTC no longer exists only as hidden APIs and admin audit pages
- user and app `App.vue` lifecycles now also keep a lightweight RTC invite bridge alive for authenticated consumer sessions, so incoming `/rtc` invite events can open the RTC call page even when the user is not already sitting inside a chat page
- user and app RTC call pages now also ship a shared WebRTC media helper for microphone bootstrap, offer/answer exchange, ICE candidate relay, and hidden remote-audio playback on capable runtimes, so the client path is no longer limited to status-only signaling
- admin service settings now also expose the RTC runtime switch, unanswered timeout, and ICE / TURN server list used by the active user and app RTC flows
- the realtime gateway now auto-times out unanswered RTC calls after a bounded ring window and emits a service-side timeout status instead of leaving initiated calls hanging indefinitely
- user and app RTC call pages now run off a shared clean page factory, include bounded unanswered-call auto-timeout behavior, and no longer rely on the mojibake-tainted earlier implementation
- release drills now also have a first structured `rtc-call-drill` step that can create, advance, inspect, and optionally admin-verify an RTC call audit record through the same BFF/Go paths used by the product
- the active system logs page has been rewritten into a clean UTF-8 implementation so readiness, Redis, push worker, and audit signals are readable without mojibake-tainted labels
- admin system logs now surface push production-readiness and production-issue signals as first-class tags instead of leaving them buried in raw detail strings
- release preflight checks BFF ready, Go ready, socket ready, system health, queue age, fallback state, and other launch blockers

## Current Release Gates

Before a release, the repository should at minimum pass:

```powershell
cd backend/go
go test ./...
go build ./cmd

cd ../bff
cmd /c npm test -- --runInBand
cmd /c npm run lint

cd ../../admin-vue
cmd /c npm run build

cd ../socket-server
cmd /c npm run check

cd ..
node scripts/release-preflight.mjs
node scripts/http-load-smoke.mjs
node scripts/push-delivery-drill.mjs
node scripts/rtc-call-drill.mjs
node scripts/release-drill.mjs
node scripts/release-live-cutover.mjs
node scripts/release-rollback-verify.mjs
node scripts/release-evidence-gate.mjs
```

Notes:

- `PREFLIGHT_REPORT_FILE=artifacts/release-preflight.json node scripts/release-preflight.mjs` keeps a structured release drill report for launch review and audit retention
- `LOAD_REPORT_FILE=artifacts/http-load-smoke.json node scripts/http-load-smoke.mjs` keeps a structured HTTP smoke report for capacity drill review
- `PUSH_DRILL_REPORT_FILE=artifacts/push-delivery-drill.json ADMIN_TOKEN=<admin-token> node scripts/push-delivery-drill.mjs` runs an admin push delivery drill and keeps a structured provider-verification report
- the push drill now also fetches Go `/ready` first and can hard-block on worker running state, production-ready state, and the expected active provider before any drill message is sent
- the push drill also supports `PUSH_DRILL_REQUIRE_PROVIDER`, `PUSH_DRILL_REQUIRE_ACKNOWLEDGED`, and `PUSH_DRILL_REQUIRE_READ` so production cutover drills can assert the real provider path and receipt quality instead of only checking "request was accepted"
- the push drill also supports `PUSH_DRILL_REQUIRE_USER_TYPE`, `PUSH_DRILL_REQUIRE_USER_ID`, `PUSH_DRILL_REQUIRE_APP_ENV`, and `PUSH_DRILL_REQUIRE_DEVICE_TOKEN_SUFFIX` so production cutover drills can insist that a specific real test account or device actually received the delivery
- `RTC_DRILL_REPORT_FILE=artifacts/rtc-call-drill.json RTC_DRILL_AUTH_TOKEN=<user-token> RTC_DRILL_CALLEE_ROLE=<role> RTC_DRILL_CALLEE_ID=<id> node scripts/rtc-call-drill.mjs` runs a structured RTC lifecycle drill against the live BFF/Go paths and can optionally verify admin visibility when `ADMIN_TOKEN` is also present
- the RTC call drill now also validates public runtime settings before creating the call, including the RTC enable switch, unanswered timeout, ICE server count, and optional TURN-server presence
- `RTC_RETENTION_DRILL_REPORT_FILE=artifacts/rtc-retention-drill.json ADMIN_TOKEN=<admin-token> node scripts/rtc-retention-drill.mjs` triggers one RTC retention cleanup cycle through the admin API and keeps a structured cleanup report for launch review
- Go now runs an RTC recording-retention cleanup worker by default; standard retained calls are auto-marked `cleared` after the configured retention window, while reported complaints remain frozen until an admin review changes their state
- BFF health aggregation and release preflight now surface RTC retention-worker running/error signals directly, so launch drills can block if the cleanup worker is enabled but not actually healthy
- `node scripts/release-drill.mjs` now runs release preflight, HTTP smoke, push-delivery drill, RTC drill, and RTC retention drill in one pass when the corresponding auth env vars are available, and writes a combined summary under `artifacts/release-drills/<timestamp>/`
- `node scripts/release-live-cutover.mjs` is the strict launch gate for real cutover rehearsal: it requires admin auth, push target constraints, push provider expectations, RTC callee identity, then runs the full release drill and fails if any required drill is skipped or does not pass
- `ROLLBACK_BASELINE_REPORT=<before.json> ROLLBACK_CANDIDATE_REPORT=<after.json> node scripts/release-rollback-verify.mjs` compares two structured drill summaries and fails if latency or delivery signals regress past the allowed rollback thresholds
- `FAILURE_BASELINE_REPORT=<steady.json> FAILURE_DEGRADED_REPORT=<fault.json> FAILURE_RESTORED_REPORT=<restored.json> node scripts/release-failure-verify.mjs` verifies that a manual fault drill actually degrades when expected and then recovers within the allowed latency, push, RTC, and RTC-retention drill thresholds
- `LIVE_CUTOVER_REPORT=<live-cutover.json> ROLLBACK_VERIFY_REPORT=<rollback-verify.json> FAILURE_VERIFY_REPORT=<failure-verify.json> node scripts/release-evidence-gate.mjs` is the final sign-off gate for launch evidence: it requires a passed live cutover report, a passed rollback verification report, and a passed failure verification report, and it can optionally enforce a maximum report age with `EVIDENCE_MAX_REPORT_AGE_MINUTES`
- `admin-vue` still emits the known `sql.js` browser externalize warning and large chunk warning during build
- those warnings are known and were not introduced by the latest remediation batches

## What Is Still Not Finished

These items are still open and should not be misrepresented as complete:

### P0: still important before claiming platform completion

- final messaging fact-source closure
  - conversation summaries and unread counts are much tighter now, but not every active surface is fully free from local assistance logic
- production-grade push provider integration
  - the platform now has secure webhook and FCM HTTP v1 dispatch paths plus a scripted delivery drill, but real production rollout still needs live provider cutover and a validated launch run with real devices
- App / H5 RTC audio implementation
  - a first server-side RTC audit model, query APIs, socket signaling namespace, client API wrappers, order-contact entry pages, shared RTC contact helper, consumer-app invite bridge, client-side media negotiation helper, and admin-side complaint / retention review flow now exist, but true App-side runtime validation and full lifecycle policy automation are not complete
- full load, rollback, and failure-drill validation
  - smoke checks, rollback verification, and failure verification exist, but that is not the same as complete capacity certification

### P1: still worth completing soon

- homepage promotion feed closure
  - the admin side is in place, but the front-end surfaces still have some compatibility logic around the unified feed result
- remaining local compatibility tails
  - a few sync and client fallback paths still keep conservative local recovery logic for safety

### Out of current main scope

- deep remediation of `android-user-app`
- deep remediation of `ios-user-app`
- old `admin-app`

## Operational Principles

- do not add a second real-time service
- do not reintroduce local mock data into active business flows
- do not expand runtime-config usage for static text that rarely changes
- prefer server authority over client snapshots
- keep local fallback windows small and disposable
- treat release preflight failures as blockers, not warnings

## Current Real-Time Boundary

- `socket-server` is the only real-time gateway
- Go remains the business fact source
- BFF remains the outer aggregation and admin-facing gateway
- new real-time features should build on this boundary, not around it

## Homepage Promotion Direction

The current first-stage direction is:

- manual admin-operated campaigns
- support for both shop and product promotion slots
- manual slot locking takes priority over paid campaign positioning
- no self-serve merchant bidding
- no automatic CPC or CPM charging in this stage

## RTC Direction

Planned boundary:

- `App / H5`: 1v1 in-app audio only
- mini-program: system phone call only
- no video
- no live streaming
- no arbitrary raw-id dialing

## Final Notes

- This repository should keep only one root documentation entry point: this `README.md`.
- If a remediation batch is completed, validated, and pushed, update this file instead of creating more Markdown silos.
- Do not claim the platform is fully complete until the remaining P0 items above are actually closed.
