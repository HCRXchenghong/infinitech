import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { DEFAULT_REALTIME_LOAD_PLAN } from "./realtime-load-plan.mjs";

export const DEFAULT_STAGE_ORDER = Object.freeze(["10k", "30k", "60k", "100k"]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeReport(reportFile, report) {
  const target = String(reportFile || "").trim();
  if (!target) {
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Realtime acceptance report written to ${target}`);
}

function normalizeStageReport(report = {}) {
  return {
    stage: String(report.stage || "").trim(),
    status: String(report.status || "").trim().toLowerCase(),
    metrics: report.metrics && typeof report.metrics === "object" ? report.metrics : {},
    scenarios: report.scenarios && typeof report.scenarios === "object" ? report.scenarios : {},
    topology: report.topology && typeof report.topology === "object" ? report.topology : {},
    evidence: report.evidence && typeof report.evidence === "object" ? report.evidence : {},
  };
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function hasEvidenceValue(value) {
  if (typeof value === "string") {
    return normalizeText(value).length > 0;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasEvidenceValue(item));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return Boolean(
    normalizeText(value.path) ||
    normalizeText(value.url) ||
    normalizeText(value.note),
  );
}

function evaluateRealtimeTopology(failures, stage, topology = {}, plan = DEFAULT_REALTIME_LOAD_PLAN) {
  const requirements = plan.topologyRequirements || {};
  const allowedSocketTransportModes = Array.isArray(requirements.allowedSocketTransportModes)
    ? requirements.allowedSocketTransportModes.map((value) => normalizeText(value).toLowerCase()).filter(Boolean)
    : [];
  const socketTransportMode = normalizeText(topology.socketTransportMode).toLowerCase();
  if (!socketTransportMode || !allowedSocketTransportModes.includes(socketTransportMode)) {
    failures.push(`stage ${stage} socketTransportMode invalid`);
  }
  if (socketTransportMode === "sticky" && requirements.requireStickyConfirmationWhenSticky === true) {
    if (topology.stickySessionsConfirmed !== true) {
      failures.push(`stage ${stage} stickySessionsConfirmed missing`);
    }
  }
  if (!normalizeText(topology.loadBalancerStrategy)) {
    failures.push(`stage ${stage} loadBalancerStrategy missing`);
  }
  if (!normalizeText(topology.redisTopology)) {
    failures.push(`stage ${stage} redisTopology missing`);
  }
  if (requirements.requireDedicatedRealtimeRedis === true && topology.dedicatedRealtimeRedis !== true) {
    failures.push(`stage ${stage} dedicatedRealtimeRedis not confirmed`);
  }
  if (requirements.requirePgBouncer === true && topology.pgBouncerEnabled !== true) {
    failures.push(`stage ${stage} pgBouncerEnabled not confirmed`);
  }
  if (requirements.requireObservabilityReady === true && topology.observabilityReady !== true) {
    failures.push(`stage ${stage} observabilityReady not confirmed`);
  }
  for (const field of Array.isArray(requirements.requiredNodeCountFields) ? requirements.requiredNodeCountFields : []) {
    if (Number(topology[field]) < 1) {
      failures.push(`stage ${stage} ${field} missing`);
    }
  }
}

function evaluateRealtimeEvidence(failures, stage, evidence = {}, plan = DEFAULT_REALTIME_LOAD_PLAN) {
  const requirements = plan.topologyRequirements || {};
  for (const key of Array.isArray(requirements.requiredEvidenceKeys) ? requirements.requiredEvidenceKeys : []) {
    if (!hasEvidenceValue(evidence[key])) {
      failures.push(`stage ${stage} evidence ${key} missing`);
    }
  }
}

export function evaluateRealtimeAcceptance(reports = [], plan = DEFAULT_REALTIME_LOAD_PLAN) {
  const failures = [];
  const reportMap = new Map(
    reports.map((report) => {
      const normalized = normalizeStageReport(report);
      return [normalized.stage, normalized];
    }),
  );

  for (const stage of DEFAULT_STAGE_ORDER) {
    const report = reportMap.get(stage);
    if (!report) {
      failures.push(`missing realtime load report for stage ${stage}`);
      continue;
    }
    if (report.status !== "passed") {
      failures.push(`stage ${stage} status is ${report.status || "missing"}`);
    }

    const metrics = report.metrics;
    evaluateRealtimeTopology(failures, stage, report.topology, plan);
    evaluateRealtimeEvidence(failures, stage, report.evidence, plan);
    if (Number(metrics.authSuccessRate) < plan.thresholds.authSuccessRate) {
      failures.push(`stage ${stage} authSuccessRate below target`);
    }
    if (Number(metrics.realtimeP95Ms) > plan.thresholds.realtimeP95Ms) {
      failures.push(`stage ${stage} realtimeP95Ms above target`);
    }
    if (Number(metrics.realtimeP99Ms) > plan.thresholds.realtimeP99Ms) {
      failures.push(`stage ${stage} realtimeP99Ms above target`);
    }
    if (Number(metrics.readApiP95Ms) > plan.thresholds.readApiP95Ms) {
      failures.push(`stage ${stage} readApiP95Ms above target`);
    }
    if (Number(metrics.writeApiP95Ms) > plan.thresholds.writeApiP95Ms) {
      failures.push(`stage ${stage} writeApiP95Ms above target`);
    }
    if (Number(metrics.rtcSignalP95Ms) > plan.thresholds.rtcSignalP95Ms) {
      failures.push(`stage ${stage} rtcSignalP95Ms above target`);
    }
    if (Number(metrics.rtcInviteP95Ms) > plan.thresholds.rtcInviteP95Ms) {
      failures.push(`stage ${stage} rtcInviteP95Ms above target`);
    }
    if (Number(metrics.totalErrorRate) > plan.thresholds.totalErrorRate) {
      failures.push(`stage ${stage} totalErrorRate above target`);
    }
    if (Number(metrics.nodeRecoveryP95Ms) > plan.thresholds.nodeRecoveryP95Ms) {
      failures.push(`stage ${stage} nodeRecoveryP95Ms above target`);
    }

    for (const scenario of plan.mandatoryScenarios) {
      if (String(report.scenarios[scenario] || "").trim().toLowerCase() !== "passed") {
        failures.push(`stage ${stage} scenario ${scenario} not passed`);
      }
    }
  }

  return failures;
}

export async function assertRealtimeAcceptance(options = {}) {
  const reportFiles = Array.isArray(options.reportFiles) && options.reportFiles.length > 0
    ? options.reportFiles
    : DEFAULT_STAGE_ORDER.map((stage) =>
        path.resolve(
          process.cwd(),
          String(process.env[`REALTIME_REPORT_${stage.toUpperCase()}`] || `artifacts/realtime-load/${stage}.json`),
        ),
      );
  const reports = await Promise.all(reportFiles.map((filePath) => readJson(filePath)));
  const failures = evaluateRealtimeAcceptance(reports);
  if (failures.length > 0) {
    throw new Error(
      [
        "realtime acceptance gate failed:",
        ...failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }
  return {
    stageCount: reports.length,
  };
}

async function main() {
  const reportFile = String(process.env.REALTIME_ACCEPTANCE_REPORT_FILE || "").trim();
  try {
    const result = await assertRealtimeAcceptance();
    await writeReport(reportFile, {
      status: "passed",
      stageCount: result.stageCount,
      completedAt: new Date().toISOString(),
    });
    console.log(`realtime acceptance gate passed (${result.stageCount} stages)`);
  } catch (error) {
    await writeReport(reportFile, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      "Realtime acceptance gate crashed:",
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
