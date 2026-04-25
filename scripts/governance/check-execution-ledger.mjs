import path from "node:path";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const EXECUTION_LEDGER_PATH = "EXECUTION_LEDGER.md";
export const TASK_ID_PATTERN = /^TASK-[A-Z0-9-]+$/;
export const REQUIRED_LABELS = Object.freeze([
  "Source",
  "Goal",
  "Scope",
  "Planned Changes",
  "Risks",
  "Acceptance",
  "Evidence",
  "Dependencies",
]);
const FORBIDDEN_TASK_PATTERNS = [
  /\bstatus\s*:/i,
  /\bdone\b/i,
  /\bcompleted\b/i,
  /已完成/,
];
const IGNORED_DIFF_PREFIXES = [
  "artifacts/",
  "coverage/",
  "dist/",
  "node_modules/",
];

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function splitTaskSections(source = "") {
  const matches = Array.from(source.matchAll(/^##\s+(.+)\s*$/gm));
  return matches.map((match, index) => {
    const heading = String(match[1] || "").trim();
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    return {
      taskId: heading,
      body: source.slice(start, end).trim(),
    };
  });
}

export function parseExecutionLedger(source = "") {
  const sections = splitTaskSections(source);
  return sections.map((section) => {
    const fields = new Map();
    for (const label of REQUIRED_LABELS) {
      const regex = new RegExp(`^- ${label}:\\s*(.+)$`, "m");
      const match = section.body.match(regex);
      fields.set(label, match ? String(match[1] || "").trim() : "");
    }
    return {
      taskId: section.taskId,
      body: section.body,
      fields,
    };
  });
}

function normalizeChangedFilePath(value = "") {
  return String(value || "").trim().replace(/\\/g, "/");
}

function mergeChangedFiles(...groups) {
  const merged = new Set();
  for (const group of groups) {
    for (const entry of group || []) {
      const normalized = normalizeChangedFilePath(entry);
      if (normalized) {
        merged.add(normalized);
      }
    }
  }
  return Array.from(merged);
}

export function isSubstantiveChangedPath(relativePath = "") {
  const normalized = normalizeChangedFilePath(relativePath);
  if (!normalized || normalized === EXECUTION_LEDGER_PATH) {
    return false;
  }
  return !IGNORED_DIFF_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function validateExecutionLedger({
  exists = false,
  source = "",
  changedFiles = [],
} = {}) {
  if (!exists) {
    return {
      taskCount: 0,
      failures: [],
    };
  }

  const failures = [];
  const normalizedSource = String(source || "");
  if (!normalizedSource.trim()) {
    failures.push("execution ledger is empty; delete EXECUTION_LEDGER.md when no active tasks remain");
    return {
      taskCount: 0,
      failures,
    };
  }

  const tasks = parseExecutionLedger(normalizedSource);
  if (tasks.length === 0) {
    failures.push("execution ledger must contain at least one active task section");
  }

  const seenTaskIds = new Set();
  for (const task of tasks) {
    if (!TASK_ID_PATTERN.test(task.taskId)) {
      failures.push(`invalid task id: ${task.taskId}`);
    }
    if (seenTaskIds.has(task.taskId)) {
      failures.push(`duplicate task id: ${task.taskId}`);
    }
    seenTaskIds.add(task.taskId);

    for (const pattern of FORBIDDEN_TASK_PATTERNS) {
      if (pattern.test(task.body)) {
        failures.push(`task ${task.taskId} contains forbidden completion/status marker`);
      }
    }

    for (const label of REQUIRED_LABELS) {
      if (!task.fields.get(label)) {
        failures.push(`task ${task.taskId} is missing field: ${label}`);
      }
    }
  }

  const normalizedChangedFiles = changedFiles.map(normalizeChangedFilePath).filter(Boolean);
  const substantiveChangedFiles = normalizedChangedFiles.filter(isSubstantiveChangedPath);
  const ledgerChanged = normalizedChangedFiles.includes(EXECUTION_LEDGER_PATH);
  if (substantiveChangedFiles.length > 0 && !ledgerChanged) {
    failures.push(
      `execution ledger must be updated together with substantive repo changes: ${substantiveChangedFiles.join(", ")}`,
    );
  }

  return {
    taskCount: tasks.length,
    failures,
  };
}

function tryGitDiff(args, repoRoot) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map(normalizeChangedFilePath)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function resolveChangedFiles(options = {}) {
  if (Array.isArray(options.changedFiles)) {
    return options.changedFiles.map(normalizeChangedFilePath).filter(Boolean);
  }

  const repoRoot = options.repoRoot || REPO_ROOT;
  const env = options.env || process.env;
  const workingTreeDiff = Array.isArray(options.workingTreeChangedFiles)
    ? options.workingTreeChangedFiles
    : tryGitDiff(["diff", "--name-only", "HEAD"], repoRoot);
  const stagedDiff = Array.isArray(options.stagedChangedFiles)
    ? options.stagedChangedFiles
    : tryGitDiff(["diff", "--cached", "--name-only"], repoRoot);
  const untrackedFiles = Array.isArray(options.untrackedFiles)
    ? options.untrackedFiles
    : tryGitDiff(["ls-files", "--others", "--exclude-standard"], repoRoot);
  const localChanges = mergeChangedFiles(workingTreeDiff, stagedDiff, untrackedFiles);
  if (localChanges.length > 0) {
    return localChanges;
  }

  if (env.GITHUB_EVENT_NAME === "pull_request" && env.GITHUB_BASE_REF) {
    const prDiff = Array.isArray(options.prChangedFiles)
      ? options.prChangedFiles
      : tryGitDiff(["diff", "--name-only", `origin/${env.GITHUB_BASE_REF}...HEAD`], repoRoot);
    if (prDiff.length > 0) {
      return mergeChangedFiles(prDiff);
    }
  }

  const pushDiff = Array.isArray(options.pushChangedFiles)
    ? options.pushChangedFiles
    : tryGitDiff(["diff", "--name-only", "HEAD~1", "HEAD"], repoRoot);
  if (pushDiff.length > 0) {
    return mergeChangedFiles(pushDiff);
  }

  return [];
}

export async function assertExecutionLedger(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const ledgerPath = path.join(repoRoot, EXECUTION_LEDGER_PATH);
  const exists = await pathExists(ledgerPath);
  const source = exists ? await readFile(ledgerPath, "utf8") : "";
  const changedFiles = resolveChangedFiles(options);
  const result = validateExecutionLedger({
    exists,
    source,
    changedFiles,
  });

  if (result.failures.length > 0) {
    throw new Error(
      [
        "execution ledger violations detected:",
        ...result.failures.map((failure) => `- ${failure}`),
        "整改期内，所有新任务都必须先写入 EXECUTION_LEDGER.md；任务收掉后再删除对应条目。",
      ].join("\n"),
    );
  }

  return {
    exists,
    taskCount: result.taskCount,
    changedFileCount: changedFiles.length,
  };
}

async function main() {
  const result = await assertExecutionLedger();
  if (!result.exists) {
    console.log("execution ledger check passed (no active execution ledger present)");
    return;
  }
  console.log(
    `execution ledger check passed (${result.taskCount} active tasks, ${result.changedFileCount} changed files considered)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
