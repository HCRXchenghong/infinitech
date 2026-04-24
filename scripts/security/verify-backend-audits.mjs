import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const NPM_AUDIT_REGISTRY = "https://registry.npmjs.org";
const AUDITED_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];

const backendAuditProjects = [
  { name: "backend/bff", path: "backend/bff" },
  { name: "socket-server", path: "socket-server" },
  { name: "backend/bank-payout-sidecar", path: "backend/bank-payout-sidecar" },
  { name: "backend/alipay-sidecar", path: "backend/alipay-sidecar" },
];

function readJsonFile(absolutePath, fallbackValue = {}) {
  if (!fs.existsSync(absolutePath)) {
    return fallbackValue;
  }

  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

export function summarizeManifestDependencyCounts(manifest = {}) {
  const byField = Object.fromEntries(
    AUDITED_DEPENDENCY_FIELDS.map((field) => [
      field,
      Object.keys(manifest?.[field] || {}).length,
    ]),
  );

  return {
    ...byField,
    total: AUDITED_DEPENDENCY_FIELDS.reduce(
      (count, field) => count + byField[field],
      0,
    ),
  };
}

export function resolveBackendAuditProjectState(project) {
  const absolutePath = path.join(repoRoot, project.path);
  const manifest = readJsonFile(path.join(absolutePath, "package.json"));
  const dependencyCounts = summarizeManifestDependencyCounts(manifest);

  return {
    absolutePath,
    manifest,
    hasLockfile: fs.existsSync(path.join(absolutePath, "package-lock.json")),
    dependencyCounts,
  };
}

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
  const projectState = resolveBackendAuditProjectState(project);

  if (!projectState.hasLockfile) {
    if (projectState.dependencyCounts.total === 0) {
      return {
        ...project,
        skipped: true,
        reason: "no external dependencies",
      };
    }

    throw new Error(
      `${project.name}: package-lock.json is required when package.json declares dependencies`,
    );
  }

  const absolutePath = projectState.absolutePath;
  const result = spawnSync(
    "npm",
    [
      "audit",
      "--audit-level=high",
      "--omit=dev",
      "--json",
      `--registry=${NPM_AUDIT_REGISTRY}`,
    ],
    {
      cwd: absolutePath,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_registry: NPM_AUDIT_REGISTRY,
        npm_config_audit_registry: NPM_AUDIT_REGISTRY,
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
    dependencyCounts: projectState.dependencyCounts,
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
