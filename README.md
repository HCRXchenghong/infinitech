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
- `socket-server` is part of CI smoke validation

### Messaging and support system cleanup

- Go message APIs are the authority for conversations and history
- consumer, merchant, rider, and admin chat flows have been pushed toward "server-first, local fallback only"
- old socket history loading routes were removed from the default path
- `socket-server` no longer maintains SQLite chat history as a runtime fact source
- local message caches on active clients have been reduced to tightly bounded emergency display fallbacks
- unread sync now depends much more strictly on service-side read confirmation instead of local optimistic mutation
- chat time, temporary ids, and read receipts have been normalized across active clients

### Main flow cleanup

- address books are service-backed
- order confirmation reads real addresses instead of demo contact data
- many active fake success prompts, mock placeholders, and visible mojibake strings were removed
- invite, medicine, charity, VIP, rider insurance, support naming, and portal runtime settings were pushed into controlled service-side settings where operationally justified

### Push foundations

- device registration is connected across active clients
- push worker queue, stats, delivery materialization, and readiness signals exist
- admin pages can inspect push-related readiness and queue signals
- release preflight blocks obviously unsafe push worker states
- production-like environments now reject `PUSH_DISPATCH_PROVIDER=log` when dispatch is enabled

### Homepage operations

- admin-managed homepage campaign and slot management has been added
- homepage feed service has been introduced
- featured pages have been moved toward the unified homepage feed result

### Operational visibility

- admin dashboard and system logs now expose real readiness and Redis adapter state
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
```

Notes:

- `admin-vue` still emits the known `sql.js` browser externalize warning and large chunk warning during build
- those warnings are known and were not introduced by the latest remediation batches

## What Is Still Not Finished

These items are still open and should not be misrepresented as complete:

### P0: still important before claiming platform completion

- final messaging fact-source closure
  - conversation summaries and unread counts are much tighter now, but not every active surface is fully free from local assistance logic
- production-grade push provider integration
  - the worker framework exists, but the platform still needs a real production provider path beyond `log / webhook`
- App / H5 RTC audio implementation
  - service-side signaling, recording-retention policy flow, and complaint freeze flow are not complete
- full load, rollback, and failure-drill validation
  - smoke checks exist, but that is not the same as complete capacity certification

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
