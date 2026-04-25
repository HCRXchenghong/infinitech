# Realtime 100k Acceptance

This repository treats `100k` concurrent realtime validation as a formal acceptance stream, not a theoretical claim.

## Scope

- `100k` authenticated concurrent connections
- `50%` active connections
- Mixed realtime traffic with chat, notification, order/query paths, and RTC signaling
- RTC media throughput is tracked separately from socket signaling acceptance

## Thresholds

- Socket auth success rate `>= 99.95%`
- Core realtime chain `p95 < 150ms`
- Core realtime chain `p99 < 300ms`
- Read API `p95 < 150ms`
- Write API `p95 < 250ms`
- RTC signaling `p95 < 150ms`
- RTC invite delivery `p95 < 2s`
- Total error rate `< 0.1%`
- Node recovery `p95 < 15s`

## Required Stages

- `10k`
- `30k`
- `60k`
- `100k`

Each stage must include:

- Broadcast storm validation
- Reconnect storm validation
- Node failure validation
- Redis failover validation
- RTC signaling validation

Each stage report must also include:

- `topology.socketTransportMode`
- `topology.loadBalancerStrategy`
- `topology.redisTopology`
- `topology.dedicatedRealtimeRedis: true`
- `topology.pgBouncerEnabled: true`
- `topology.observabilityReady: true`
- positive `topology.apiNodeCount` / `bffNodeCount` / `socketNodeCount`
- `evidence.topologyDiagram`
- `evidence.loadGeneratorConfig`
- `evidence.metricsDashboard`
- `evidence.scenarioLog`

If `topology.socketTransportMode` is `sticky`, the report must also confirm `topology.stickySessionsConfirmed: true`.

## Evidence

- Generate the staged plan with `scripts/realtime-load-plan.mjs`
- Archive one JSON report per stage under `artifacts/realtime-load/`
- Validate the staged reports with `scripts/realtime-acceptance-gate.mjs`
- Do not claim `100k` support without the archived reports and a passing acceptance gate report
