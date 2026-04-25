import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_REALTIME_LOAD_PLAN = Object.freeze({
  version: 1,
  target: {
    concurrentConnections: 100000,
    activeConnectionRatio: 0.5,
    profile: "mixed-mid-interaction",
  },
  topologyRequirements: {
    allowedSocketTransportModes: ["websocket-only", "sticky"],
    requireStickyConfirmationWhenSticky: true,
    requireDedicatedRealtimeRedis: true,
    requirePgBouncer: true,
    requireObservabilityReady: true,
    requiredNodeCountFields: ["apiNodeCount", "bffNodeCount", "socketNodeCount"],
    requiredEvidenceKeys: [
      "topologyDiagram",
      "loadGeneratorConfig",
      "metricsDashboard",
      "scenarioLog",
    ],
  },
  thresholds: {
    authSuccessRate: 0.9995,
    realtimeP95Ms: 150,
    realtimeP99Ms: 300,
    readApiP95Ms: 150,
    writeApiP95Ms: 250,
    rtcSignalP95Ms: 150,
    rtcInviteP95Ms: 2000,
    totalErrorRate: 0.001,
    nodeRecoveryP95Ms: 15000,
  },
  stages: [
    { stage: "10k", concurrentConnections: 10000, activeConnectionRatio: 0.5 },
    { stage: "30k", concurrentConnections: 30000, activeConnectionRatio: 0.5 },
    { stage: "60k", concurrentConnections: 60000, activeConnectionRatio: 0.5 },
    { stage: "100k", concurrentConnections: 100000, activeConnectionRatio: 0.5 },
  ],
  mandatoryScenarios: [
    "broadcastStorm",
    "reconnectStorm",
    "nodeFailure",
    "redisFailover",
    "rtcSignal",
  ],
});

async function writeReport(reportFile, report) {
  const target = String(reportFile || "").trim();
  if (!target) {
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Realtime load plan written to ${target}`);
}

async function main() {
  const reportFile = String(process.env.REALTIME_LOAD_PLAN_FILE || "").trim();
  await writeReport(reportFile, DEFAULT_REALTIME_LOAD_PLAN);
  if (!reportFile) {
    console.log(JSON.stringify(DEFAULT_REALTIME_LOAD_PLAN, null, 2));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      "Realtime load plan generation failed:",
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
