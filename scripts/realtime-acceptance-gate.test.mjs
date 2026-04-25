import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_REALTIME_LOAD_PLAN } from "./realtime-load-plan.mjs";
import { evaluateRealtimeAcceptance } from "./realtime-acceptance-gate.mjs";

function createPassingStage(stage) {
  return {
    stage,
    status: "passed",
    metrics: {
      authSuccessRate: DEFAULT_REALTIME_LOAD_PLAN.thresholds.authSuccessRate,
      realtimeP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.realtimeP95Ms,
      realtimeP99Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.realtimeP99Ms,
      readApiP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.readApiP95Ms,
      writeApiP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.writeApiP95Ms,
      rtcSignalP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.rtcSignalP95Ms,
      rtcInviteP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.rtcInviteP95Ms,
      totalErrorRate: DEFAULT_REALTIME_LOAD_PLAN.thresholds.totalErrorRate,
      nodeRecoveryP95Ms: DEFAULT_REALTIME_LOAD_PLAN.thresholds.nodeRecoveryP95Ms,
    },
    scenarios: {
      broadcastStorm: "passed",
      reconnectStorm: "passed",
      nodeFailure: "passed",
      redisFailover: "passed",
      rtcSignal: "passed",
    },
    topology: {
      socketTransportMode: "websocket-only",
      stickySessionsConfirmed: false,
      loadBalancerStrategy: "least-connections",
      redisTopology: "dedicated-ha",
      dedicatedRealtimeRedis: true,
      pgBouncerEnabled: true,
      observabilityReady: true,
      apiNodeCount: 2,
      bffNodeCount: 2,
      socketNodeCount: 4,
    },
    evidence: {
      topologyDiagram: "artifacts/realtime-load/topology-stage.png",
      loadGeneratorConfig: "artifacts/realtime-load/k6-stage.js",
      metricsDashboard: "https://grafana.example.com/d/stage",
      scenarioLog: "artifacts/realtime-load/stage.log",
    },
  };
}

test("evaluateRealtimeAcceptance passes all required stages", () => {
  const failures = evaluateRealtimeAcceptance([
    createPassingStage("10k"),
    createPassingStage("30k"),
    createPassingStage("60k"),
    createPassingStage("100k"),
  ]);
  assert.deepEqual(failures, []);
});

test("evaluateRealtimeAcceptance reports missing stages and failed metrics", () => {
  const failures = evaluateRealtimeAcceptance([
    createPassingStage("10k"),
    {
      ...createPassingStage("30k"),
      metrics: {
        ...createPassingStage("30k").metrics,
        realtimeP95Ms: 999,
      },
      topology: {
        ...createPassingStage("30k").topology,
        pgBouncerEnabled: false,
      },
      evidence: {
        ...createPassingStage("30k").evidence,
        metricsDashboard: "",
      },
    },
  ]);
  assert.ok(failures.some((failure) => /30k realtimeP95Ms/.test(failure)));
  assert.ok(failures.some((failure) => /30k pgBouncerEnabled/.test(failure)));
  assert.ok(failures.some((failure) => /30k evidence metricsDashboard/.test(failure)));
  assert.ok(failures.some((failure) => /60k/.test(failure)));
  assert.ok(failures.some((failure) => /100k/.test(failure)));
});
