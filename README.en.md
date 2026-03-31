# Infinitech

[中文](./README.md) | English

Infinitech is a multi-client platform repository for local lifestyle services. It is not a single-site app and not a demo project. The repository is designed to continuously consolidate the following capabilities into one engineering baseline:

- food delivery
- group buying
- errands / local delivery
- customer apps
- merchant apps
- rider apps
- admin console
- realtime messaging
- push notifications
- in-app RTC contact for `App / H5`

If this is your first time opening the repository, the easiest way to think about it is as an engineering foundation for a local services platform:

- backend sources of truth are kept as unified as possible
- realtime infrastructure is kept as single-path as possible
- multi-client apps share schema and runtime helpers wherever possible
- releases require executable checks, drills, and signoff gates


## Quick Start

If you want to get the stack up quickly, use one of these two paths first.

### Bootstrap directly from GitHub

If `--target-dir` is not provided, the bootstrap script will prompt for a local install directory first. You can also pass the target path explicitly.

Linux / macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash
```

Windows:

PowerShell (Recommended):

```powershell
irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 | iex
```

CMD:

```cmd
powershell -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1' | iex"
```

Notes:

- Both blocks are meant to be copied directly in the corresponding terminal
- On Windows, both terminal types now use the same raw `bootstrap-install.ps1` path for the GitHub bootstrap flow
- This is the most stable Windows path and closest to the `curl | bash` style on Linux / macOS

### Install and deploy from a local checkout

Windows:

PowerShell (Recommended):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-all.ps1
```

CMD:

```cmd
scripts\install-all.cmd
```

Ubuntu / Debian / macOS:

```bash
bash scripts/install-all.sh
```

## Project Positioning

From a product perspective, Infinitech is a shared platform base for multiple fulfillment domains rather than several isolated systems glued together.

The current design principles are:

- core facts such as `Shop / Product / Order / Message / Address` should have a single authoritative source wherever possible
- differences between delivery, group buying, and errands should mostly live in the fulfillment domain rather than splitting the core models into multiple versions
- `socket-server` is the only realtime gateway
- client-side local caches are acceleration and fallback layers, not business truth
- the production baseline is fixed to `PostgreSQL + Redis`

## Current Status

The repository has already gone through a major engineering cleanup. Key results include:

- the production database baseline is fixed to `PostgreSQL`
- `Redis` is already used in rate limiting, session flows, and shared realtime state
- the main business source of truth has been consolidated into `backend/go`
- `socket-server` has been reduced to a single realtime gateway
- major messaging flows are now `server-first`
- the upload path supports local HEIC conversion and no longer depends on a separate conversion port by default
- release support now includes `preflight / smoke / drill / evidence / signoff`

There are still a few things that must be executed in a real environment before anyone can honestly claim the platform is fully ready:

1. real-device push provider cutover and validation
2. real-device `App / H5` RTC validation
3. real failure injection with recovery / rollback verification

## Feature Scope

### Customer Apps

- registration / login / password recovery / profile editing
- address book
- delivery browsing, ordering, checkout, and order lifecycle
- group buying browsing, purchase, and redemption flows
- errands, pharmacy, and other extension entries
- messaging, customer service conversations, uploads
- merchant contact, support contact, and RTC contact entry points

### Merchant Apps

- login / store onboarding / store profile maintenance
- menu and product management
- delivery and group-buy order handling
- customer service chat
- image uploads

### Rider Apps

- login
- task hall / task detail
- customer service messaging
- document and avatar uploads

### Admin Console

- operational settings
- homepage feed / campaign slots / recommendation management
- push management
- phone contact audit
- RTC call audit
- system health, logs, and release signals

## Repository Structure

- `backend/go`
  - core business APIs
  - domain models, repositories, services
  - messaging source of truth
  - push worker
  - RTC audit and retention cleanup
- `backend/bff`
  - Node.js BFF
  - upload proxy
  - admin aggregation
  - health aggregation
  - release drill / signoff integration
- `socket-server`
  - single realtime gateway
  - Socket.IO
  - Redis-backed shared state
  - RTC signaling namespace
- `admin-vue`
  - admin web console
- `user-vue`
  - customer uni-app client
- `app-mobile`
  - app-flavored customer uni-app client
- `merchant-app`
  - merchant uni-app client
- `rider-app`
  - rider uni-app client
- `shared/mobile-common`
  - shared schema, sync layer, RTC helpers, runtime tools
- `tools/heic-converter`
  - local HEIC conversion module
- `backend/docker`
  - Dockerfiles, Compose stack, Caddy reverse proxy config
- `scripts`
  - one-click install
  - one-click deploy
  - release checks, drills, evidence chain, signoff scripts

## Current Architecture Boundaries

### Authoritative Boundaries

- business source of truth: `backend/go`
- single realtime service: `socket-server`
- aggregation / upload proxy / admin health views: `backend/bff`
- client-side cache: acceleration and failure fallback only

### Legacy Paths That Are No Longer Recommended

- `SQLite` as the production primary database
- a second socket service
- local message caches acting as long-term business truth
- requiring a dedicated HEIC microservice by default

## HEIC Image Handling

`tools/heic-converter` has already been reduced from a standalone service into an in-repo local conversion module.

The default behavior is now:

- active upload paths go through `BFF -> Go /api/upload`
- both the Go service and `socket-server` can call the local HEIC conversion module
- Docker images package `tools/heic-converter` together with the main services
- no dedicated HEIC conversion port is required by default

If you deploy through Docker or the one-click installer, HEIC conversion is available together with the main stack.  
If you do local non-Docker development, install the converter first:

```bash
cd tools/heic-converter
npm ci
```

## Local Regression Commands

Go:

```powershell
cd backend/go
go test ./...
go build ./cmd
```

BFF:

```powershell
cd backend/bff
cmd /c npm test -- --runInBand
cmd /c npm run lint
```

Admin:

```powershell
cd admin-vue
cmd /c npm run build
```

Realtime service:

```powershell
cd socket-server
cmd /c npm run check
```

## Zero-to-One Install and Deploy

If the target machine is fresh, use the installer instead of manually preparing dependencies first.

The installer will:

- detect the operating system and architecture
- check and install `Git / Docker / Docker Compose / Node.js`
- provide a numeric mirror-source menu
- generate a unified runtime environment file
- trigger the full Docker deployment automatically

### Supported Platforms

- Windows 10 / 11
- Windows Server
- macOS Apple Silicon (M series)
- Ubuntu
- Debian

### Mirror Source Options

The installer includes:

1. official sources (default)
2. Alibaba Cloud
3. Tencent Cloud
4. Huawei Cloud
5. Tsinghua / goproxy.cn combination

The selected mirror profile affects:

- Docker base images
- `npm` registry
- `GOPROXY`
- Alpine package mirrors

## Pull From GitHub and Deploy Directly

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash
```

Specify directory or branch:

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash -s -- --target-dir=/opt/infinitech --branch=main
```

### Windows

PowerShell (Recommended):

```powershell
irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 | iex
```

CMD:

```cmd
powershell -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1' | iex"
```

Example with a custom directory:

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1'))) -TargetDir 'D:\infinitech'
```

```cmd
powershell -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1'))) -TargetDir 'D:\infinitech'"
```

## Local Installer Entry Points

Windows:

PowerShell (Recommended):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-all.ps1
```

CMD:

```cmd
scripts\install-all.cmd
```

Ubuntu / Debian / macOS:

```bash
bash scripts/install-all.sh
```

Unified Node entry:

```powershell
node scripts/install-all.mjs
```

Prepare the environment only, without deploying immediately:

```powershell
node scripts/install-all.mjs --no-deploy
```

## One-Click Deployment

Unified entry:

```powershell
node scripts/deploy-all.mjs
```

If no action is passed, the script enters the numeric menu.

### Menu Actions

1. Start core services
2. Start core services with attached logs
3. Start the full stack with reverse proxy and domain setup
4. Stop and remove containers
5. Rebuild and restart
6. View logs
7. View container status
8. Output Compose config

### Local Shortcut Entry Points

Windows:

```powershell
scripts\deploy-all.cmd
```

Linux / macOS:

```bash
bash scripts/deploy-all.sh
```

### Direct Command Mode

```powershell
node scripts/deploy-all.mjs up
node scripts/deploy-all.mjs down
node scripts/deploy-all.mjs restart
node scripts/deploy-all.mjs logs
node scripts/deploy-all.mjs ps
node scripts/deploy-all.mjs config
```

### With Domain and Reverse Proxy

```powershell
node scripts/deploy-all.mjs up --proxy --public-domain=api.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
```

Runtime environment file:

```text
backend/docker/.deploy.runtime.env
```

## Full Docker Startup

Core orchestration file:

- [`backend/docker/docker-compose.yml`](./backend/docker/docker-compose.yml)

Default core services:

- `admin-web`
- `postgres`
- `redis`
- `go-api`
- `socket-server`
- `bff`

Optional profiles:

- `reverse-proxy`
- `legacy-mysql`
- `messaging`

### Default Ports

- Admin Web: `http://127.0.0.1:8080`
- Go API: `http://127.0.0.1:1029/ready`
- BFF: `http://127.0.0.1:25500/ready`
- Socket Server: `http://127.0.0.1:9898/ready`
- PostgreSQL: `127.0.0.1:5432`
- Redis: `127.0.0.1:2550`

### Service Topology

- `admin-web`
  - static admin web app
- `postgres`
  - primary business database
- `redis`
  - sessions, rate limiting, shared realtime state
- `go-api`
  - core business APIs, messaging source of truth, push worker, RTC audit
- `socket-server`
  - single realtime gateway, RTC signaling, upload entry
- `bff`
  - web aggregation layer, upload proxy, admin health endpoints
- `reverse-proxy`
  - optional Caddy reverse proxy

## Release Tooling

This repository no longer uses a “just run it and hope” release process. It includes a full release support chain.

Major scripts include:

- `scripts/release-preflight.mjs`
- `scripts/http-load-smoke.mjs`
- `scripts/push-delivery-drill.mjs`
- `scripts/rtc-call-drill.mjs`
- `scripts/rtc-retention-drill.mjs`
- `scripts/release-drill.mjs`
- `scripts/release-live-cutover.mjs`
- `scripts/release-evidence-gate.mjs`
- `scripts/release-final-signoff.mjs`

## What Still Requires Real Environment Execution

The code and scripts are largely converged, but these still must be executed in a real environment before go-live:

1. real-device push provider cutover and validation
2. real-device `App / H5` RTC validation
3. real failure injection with recovery / rollback verification
