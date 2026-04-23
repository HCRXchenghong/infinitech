import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const NPM_AUDIT_REGISTRY = "https://registry.npmjs.org";

const backendAuditProjects = [
  { name: "backend/bff", path: "backend/bff" },
  { name: "socket-server", path: "socket-server" },
  { name: "backend/alipay-sidecar", path: "backend/alipay-sidecar" },
];

function parseAuditReport(rawOutput) {
  const trimmed = String(rawOutput || "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    } catch (_nestedError) {
      return null;
    }
  }
}

export function summarizeAuditMetadata(report = {}) {
  const metadata = report?.metadata?.vulnerabilities || {};
  return {
    info: Number(metadata.info || 0),
    low: Number(metadata.low || 0),
    moderate: Number(metadata.moderate || 0),
    high: Number(metadata.high || 0),
    critical: Number(metadata.critical || 0),
    total: Number(metadata.total || 0),
  };
}

export function runBackendAuditProject(project) {
  const absolutePath = path.join(repoRoot, project.path);
  if (!fs.existsSync(path.join(absolutePath, "package-lock.json"))) {
    return {
      ...project,
      skipped: true,
      reason: "missing package-lock.json",
    };
  }

  const result = spawnSync(
    "npm",
    ["audit", "--audit-level=high", "--omit=dev", "--json"],
    {
      cwd: absolutePath,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_registry: NPM_AUDIT_REGISTRY,
      },
    },
  );

  if (result.error) {
    throw result.error;
  }

  const report = parseAuditReport(result.stdout || result.stderr);
  if (!report) {
    throw new Error(
      `unable to parse npm audit report for ${project.name}\n${String(
        result.stderr || result.stdout || "",
      ).trim()}`,
    );
  }

  return {
    ...project,
    status: Number(result.status || 0),
    report,
    counts: summarizeAuditMetadata(report),
  };
}

function main() {
  const failures = [];

  for (const project of backendAuditProjects) {
    const result = runBackendAuditProject(project);
    if (result.skipped) {
      console.log(`${project.name}: skipped (${result.reason})`);
      continue;
    }

    console.log(
      `${project.name}: high=${result.counts.high} critical=${result.counts.critical} total=${result.counts.total}`,
    );

    if (result.counts.high > 0 || result.counts.critical > 0) {
      failures.push(result);
      continue;
    }

    if (result.status !== 0) {
      throw new Error(`${project.name}: npm audit exited with status ${result.status}`);
    }
  }

  if (failures.length > 0) {
    const failureLines = failures.map(
      (failure) =>
        `- ${failure.name}: high=${failure.counts.high} critical=${failure.counts.critical}`,
    );
    throw new Error(
      [
        "backend dependency audit failed:",
        ...failureLines,
        `已强制使用 ${NPM_AUDIT_REGISTRY} 作为审计源，请先修复 lockfile 后再提交。`,
      ].join("\n"),
    );
  }

  console.log("backend dependency audit passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
