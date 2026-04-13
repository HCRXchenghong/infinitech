# Infinitech 1.0.1

Infinitech is a local-services monorepo that ships the full platform stack in one repository: customer apps, merchant app, rider app, admin web, official site, BFF, Go business API, realtime socket gateway, payment sidecars, and deployment tooling.

This repository is currently aligned on version `1.0.1`.

## What Is Included

- `admin-vue`
  Admin web, official site, invite pages, download pages, runtime settings, chat console, and operations tools.
- `user-vue`
  Customer-facing uni-app project for mini-program style builds.
- `app-mobile`
  Customer-facing app build.
- `merchant-app`
  Merchant uni-app client.
- `rider-app`
  Rider uni-app client.
- `admin-app`
  Admin uni-app client.
- `backend/go`
  Core business API, settings, orders, wallet, notifications, official site support, and admin services.
- `backend/bff`
  Web-facing aggregation layer, upload proxy, admin API facade, and runtime config bridge.
- `socket-server`
  Socket.IO realtime gateway for chat, business notifications, and RTC signaling.
- `backend/alipay-sidecar`
  Alipay integration sidecar.
- `backend/bank-payout-sidecar`
  Bank payout integration sidecar.
- `shared`
  Shared mobile runtime helpers, realtime bridge utilities, and multi-end notification logic.
- `scripts`
  Install, deploy, and maintenance helpers.
- `android-user-app` / `ios-user-app`
  Native customer app shells kept at version `1.0.1`.

## Current Highlights

- Unified message and order notification sounds across admin, official site, customer, merchant, and rider flows.
- Official site pages and official support chat are integrated end-to-end through `admin-vue`, `backend/bff`, `backend/go`, and `socket-server`.
- Runtime service settings are centrally managed in admin and propagated to public/mobile clients.
- The repository is organized as one deployable workspace instead of split service repos.

## Repo Layout

```text
.
├── admin-app
├── admin-vue
├── android-user-app
├── app-mobile
├── backend
│   ├── alipay-sidecar
│   ├── bank-payout-sidecar
│   ├── bff
│   ├── docker
│   └── go
├── ios-user-app
├── merchant-app
├── rider-app
├── scripts
├── shared
├── socket-server
├── tools
└── user-vue
```

## Core Ports

| Port | Service |
| --- | --- |
| `8888` | Admin web |
| `1888` | Official site |
| `1788` | Invite / claim pages |
| `1798` | Download pages |
| `25500` | BFF |
| `1029` | Go API |
| `9898` | Socket server |
| `10301` | Alipay sidecar |
| `10302` | Bank payout sidecar |
| `5432` | PostgreSQL |
| `2550` | Redis |

## Quick Start

1. Install dependencies.

```bash
./scripts/install-all.sh
```

2. Prepare environment files from the included `*.env.example` templates.

3. Start infrastructure and services.

```bash
cd backend/docker
docker compose up -d
```

4. Start the web/admin side during development.

```bash
cd admin-vue
npm run dev
```

5. Start backend services as needed.

```bash
cd backend/bff && npm run dev
cd backend/go && go run ./cmd/main.go
cd socket-server && npm run dev
```

## Useful Validation Commands

```bash
cd admin-vue && npm run build
cd backend/go && go test ./...
cd user-vue && npm run build:mp-weixin
cd rider-app && npm run build:app
```

Some uni-app targets still depend on local HBuilderX / `uni` CLI availability.

## Version Policy

- Repository release line stays on `1.0.1`.
- Web, mobile, native shell, admin, and sidecar package versions are kept consistent where applicable.
- Generated artifacts are not part of the repository history.

## Notes

- Runtime uploads, local screenshots, and ad-hoc verification artifacts are intentionally excluded from version control.
- Project documentation is intentionally kept lean in this repo: `README.md` for the current workspace overview and `CHANGELOG.md` for release notes.
