# iOS Native Migration Bootstrap (Phase-1)

This folder now contains the first implementation slice of the migration plan:

- iOS app scaffold with layered architecture (`App/Presentation/Domain/Data/Infrastructure`)
- BFF mobile APIs
  - `POST /api/mobile/push/devices/register`
  - `POST /api/mobile/push/devices/unregister`
  - `POST /api/mobile/push/ack`
  - `GET /api/mobile/maps/search`
  - `GET /api/mobile/maps/reverse-geocode`
- Go backend support
  - `push_devices`, `push_deliveries`, `push_templates` models
  - mobile push handlers + services
  - mobile map handlers + OSM proxy service

## Runtime Config (Go)

- `OSM_GEOCODER_SEARCH_URL` default: `http://127.0.0.1:8082/search`
- `OSM_GEOCODER_REVERSE_URL` default: `http://127.0.0.1:8082/reverse`
- `OSM_GEOCODER_TIMEOUT_SECONDS` default: `5`

## Notes

- MapLibre is treated as optional bootstrap dependency in this phase. The `OSMMapView` is intentionally minimal and ready for SDK wiring.
- APNs route + device lifecycle API is now available server-side; actual APNs delivery worker will be implemented in the next iteration.
- Current iOS UI is a migration shell for Home/Orders/Messages/Profile + address fallback path.

## Quick Build (iOS Simulator)

```bash
cd ios-user-app/悦享e食
./scripts/build_ios_sim.sh
```

This script builds the app for simulator with workspace-local DerivedData and simulator signing disabled, which is suitable for local CI/dev machines.

## Quick Run (See Frontend in Simulator)

```bash
cd ios-user-app/悦享e食
./scripts/run_ios_sim.sh
```

This command will:

1. Build the app for iOS Simulator.
2. Boot an available iPhone simulator.
3. Install the app into simulator.
4. Launch the app automatically.
5. Auto-start local backend stack (`Go 1029 + BFF 25500`) before launch.

If it says no available simulator:

1. Open Xcode.
2. Go to `Settings -> Platforms`.
3. Install at least one iOS Simulator runtime.
4. Run `./scripts/run_ios_sim.sh` again.

## Backend Only (for login/API debug)

```bash
cd ios-user-app/悦享e食
./scripts/start_local_backend.sh
```

Script behavior:

1. Ensures `Go :1029` and `BFF :25500` are both listening and HTTP-healthy.
2. If a port is occupied but unhealthy, it will attempt recovery before continuing.
3. Exits with clear log path when startup/health check fails.

## Local HTTP (Simulator)

- Project enables `NSAppTransportSecurity -> NSAllowsLocalNetworking = YES`.
- This allows local debug endpoints like `http://127.0.0.1:25500` on iOS Simulator.

## Next Implementation Batch

1. Replace placeholder tab scenes with full page-by-page migrated features.
2. Add token-refresh interceptor parity with old app logic.
3. Implement APNs delivery worker (`.p8`) + retry/dead-letter policy.
4. Complete MapLibre SDK integration and search/reverse geocode UX.
5. Build UI automation + unit test coverage gate.
