import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSecretRotationTemplate,
  DEFAULT_SECRET_ROTATION_EVIDENCE_FILE,
  writeJsonReport,
} from "./secret-rotation-evidence.mjs";

const __filename = fileURLToPath(import.meta.url);

function parseEnvironmentList(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const outputFile = String(
    process.env.SECRET_ROTATION_EVIDENCE_FILE || DEFAULT_SECRET_ROTATION_EVIDENCE_FILE,
  ).trim();
  const environments = parseEnvironmentList(process.env.SECRET_ROTATION_ENVIRONMENTS);
  const payload = createSecretRotationTemplate({
    environments,
  });

  await writeJsonReport(outputFile, payload);
  console.log(`Secret rotation evidence template written to ${outputFile}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(
      "Secret rotation evidence template generation failed:",
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
