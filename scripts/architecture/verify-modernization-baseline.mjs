import path from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const REQUIRED_PATHS = Object.freeze([
  "packages/contracts",
  "packages/client-sdk",
  "packages/domain-core",
  "packages/mobile-core",
  "packages/admin-core",
  "admin-vue",
  "admin-win",
  "admin-mac",
  "packages/admin-core/src/route-registry.js",
  "packages/admin-core/src/DesktopShellApp.vue",
  "packages/client-sdk/src/socket-io.js",
  "socket-server/index.js",
  "docs/architecture/platform-modernization-baseline.md",
]);
export const FORBIDDEN_PATHS = Object.freeze([
  "admin-app",
  "shared/mobile-common",
]);
export const CODE_SCAN_ROOTS = Object.freeze([
  "user-vue",
  "app-mobile",
  "merchant-app",
  "rider-app",
  "admin-vue",
  "admin-win",
  "admin-mac",
  "packages",
  "backend",
  "socket-server",
]);
export const SCANNED_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".vue",
  ".go",
  ".json",
]);
export const IGNORED_NAMES = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
  "unpackage",
]);
export const REQUIRED_ROOT_WORKSPACES = Object.freeze([
  "packages/*",
  "admin-vue",
  "admin-win",
  "admin-mac",
]);
export const REQUIRED_README_TOKENS = Object.freeze([
  "admin-vue",
  "admin-win",
  "admin-mac",
  "packages",
]);
export const FORBIDDEN_DOC_TOKENS = Object.freeze([
  "admin-app",
  "shared/mobile-common",
  "## Next Migration Steps",
]);

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function collectFilesRecursively(rootDir, bucket) {
  let entries = [];
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await collectFilesRecursively(fullPath, bucket);
      continue;
    }

    if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      bucket.push(fullPath);
    }
  }
}

function findLineNumber(source = "", index = 0) {
  return source.slice(0, index).split("\n").length;
}

function findTokenViolations(relativePath, source, tokens) {
  const violations = [];
  for (const token of tokens) {
    let cursor = source.indexOf(token);
    while (cursor >= 0) {
      violations.push({
        relativePath,
        token,
        line: findLineNumber(source, cursor),
      });
      cursor = source.indexOf(token, cursor + token.length);
    }
  }
  return violations;
}

export async function collectModernizationBaselineState(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const requiredPaths = [];
  const missingPaths = [];
  const forbiddenPaths = [];
  const scannedFiles = [];
  const sourceViolations = [];

  for (const relativePath of REQUIRED_PATHS) {
    const fullPath = path.join(repoRoot, relativePath);
    if (await pathExists(fullPath)) {
      requiredPaths.push(relativePath);
    } else {
      missingPaths.push(relativePath);
    }
  }

  for (const relativePath of FORBIDDEN_PATHS) {
    const fullPath = path.join(repoRoot, relativePath);
    if (await pathExists(fullPath)) {
      forbiddenPaths.push(relativePath);
    }
  }

  const rootPackage = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const workspaces = Array.isArray(rootPackage.workspaces)
    ? rootPackage.workspaces
    : [];
  const missingWorkspaces = REQUIRED_ROOT_WORKSPACES.filter(
    (workspace) => !workspaces.includes(workspace),
  );
  const extraForbiddenWorkspaces = workspaces.filter((workspace) =>
    workspace === "admin-app" || workspace.startsWith("shared/mobile-common"),
  );

  const readmeSource = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const docSource = await readFile(
    path.join(repoRoot, "docs/architecture/platform-modernization-baseline.md"),
    "utf8",
  );

  const missingReadmeTokens = REQUIRED_README_TOKENS.filter(
    (token) => !readmeSource.includes(token),
  );

  const readmeViolations = findTokenViolations("README.md", readmeSource, [
    "admin-app",
    "shared/mobile-common",
  ]);
  const docViolations = findTokenViolations(
    "docs/architecture/platform-modernization-baseline.md",
    docSource,
    FORBIDDEN_DOC_TOKENS,
  );

  for (const scanRoot of CODE_SCAN_ROOTS) {
    await collectFilesRecursively(path.join(repoRoot, scanRoot), scannedFiles);
  }

  for (const filePath of scannedFiles) {
    const source = await readFile(filePath, "utf8");
    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    sourceViolations.push(
      ...findTokenViolations(relativePath, source, [
        "shared/mobile-common",
        "../admin-app",
        "../../admin-app",
        "/admin-app/",
      ]),
    );
  }

  return {
    requiredPathCount: requiredPaths.length,
    scannedFileCount: scannedFiles.length,
    missingPaths: missingPaths.sort(),
    forbiddenPaths: forbiddenPaths.sort(),
    missingWorkspaces: missingWorkspaces.sort(),
    extraForbiddenWorkspaces: extraForbiddenWorkspaces.sort(),
    missingReadmeTokens: missingReadmeTokens.sort(),
    readmeViolations: readmeViolations.sort((left, right) =>
      `${left.relativePath}:${left.line}`.localeCompare(`${right.relativePath}:${right.line}`),
    ),
    docViolations: docViolations.sort((left, right) =>
      `${left.relativePath}:${left.line}`.localeCompare(`${right.relativePath}:${right.line}`),
    ),
    sourceViolations: sourceViolations.sort((left, right) =>
      `${left.relativePath}:${left.line}`.localeCompare(`${right.relativePath}:${right.line}`),
    ),
  };
}

export async function assertModernizationBaseline(options = {}) {
  const result = await collectModernizationBaselineState(options);
  const failures = [];

  if (result.missingPaths.length > 0) {
    failures.push(`missing required paths: ${result.missingPaths.join(", ")}`);
  }
  if (result.forbiddenPaths.length > 0) {
    failures.push(`forbidden legacy paths remain: ${result.forbiddenPaths.join(", ")}`);
  }
  if (result.missingWorkspaces.length > 0) {
    failures.push(`missing root workspaces: ${result.missingWorkspaces.join(", ")}`);
  }
  if (result.extraForbiddenWorkspaces.length > 0) {
    failures.push(
      `forbidden workspaces remain registered: ${result.extraForbiddenWorkspaces.join(", ")}`,
    );
  }
  if (result.missingReadmeTokens.length > 0) {
    failures.push(`README is missing required tokens: ${result.missingReadmeTokens.join(", ")}`);
  }

  for (const violation of result.readmeViolations) {
    failures.push(
      `README legacy token remains at ${violation.relativePath}:${violation.line} (${violation.token})`,
    );
  }
  for (const violation of result.docViolations) {
    failures.push(
      `baseline doc legacy token remains at ${violation.relativePath}:${violation.line} (${violation.token})`,
    );
  }
  for (const violation of result.sourceViolations) {
    failures.push(
      `runtime source still references legacy path at ${violation.relativePath}:${violation.line} (${violation.token})`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      [
        "modernization baseline violations detected:",
        ...failures.map((failure) => `- ${failure}`),
        "请删除 admin-app / shared/mobile-common，并保持当前正式交付形态与共享层基线一致。",
      ].join("\n"),
    );
  }

  return result;
}

async function main() {
  const result = await assertModernizationBaseline();
  console.log(
    `modernization baseline check passed (${result.requiredPathCount} required paths, ${result.scannedFileCount} scanned files)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
