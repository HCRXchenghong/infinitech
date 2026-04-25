import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SECRET_ROTATION_EVIDENCE_FILE,
  readJsonReport,
  validateSecretRotationEvidence,
  writeJsonReport,
} from "./secret-rotation-evidence.mjs";

const __filename = fileURLToPath(import.meta.url);

export async function assertSecretRotationEvidence(options = {}) {
  const evidenceFile = String(
    options.evidenceFile ||
    process.env.SECRET_ROTATION_EVIDENCE_FILE ||
    DEFAULT_SECRET_ROTATION_EVIDENCE_FILE,
  ).trim();
  const report = await readJsonReport(evidenceFile);
  const failures = validateSecretRotationEvidence(report, options);
  if (failures.length > 0) {
    throw new Error(
      [
        "secret rotation evidence gate failed:",
        ...failures.map((failure) => `- ${failure}`),
      ].join("\n"),
    );
  }
  return {
    evidenceFile,
    environmentCount: Array.isArray(report.environments) ? report.environments.length : 0,
  };
}

async function main() {
  const reportFile = String(process.env.SECRET_ROTATION_GATE_REPORT_FILE || "").trim();
  try {
    const result = await assertSecretRotationEvidence();
    await writeJsonReport(reportFile, {
      status: "passed",
      evidenceFile: result.evidenceFile,
      environmentCount: result.environmentCount,
      completedAt: new Date().toISOString(),
    });
    console.log(
      `Secret rotation evidence gate passed (${result.environmentCount} environments)`,
    );
  } catch (error) {
    await writeJsonReport(reportFile, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(
      "Secret rotation evidence gate crashed:",
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
