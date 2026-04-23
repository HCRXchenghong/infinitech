import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const ADMIN_DESKTOP_SHELL_ROOTS = Object.freeze([
  path.join(REPO_ROOT, "admin-win"),
  path.join(REPO_ROOT, "admin-mac"),
]);
export const ADMIN_DESKTOP_ALLOWED_FILES = new Set([
  "README.md",
  "index.html",
  "package.json",
  "tsconfig.json",
  "vite.config.mts",
  "src/env.d.ts",
  "src/main.ts",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
]);
export const ADMIN_DESKTOP_SCOPE_HINT =
  "桌面端只允许保留入口壳层与打包配置；业务页面/业务逻辑请收敛到 admin-vue 或 packages/admin-core。";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "dist",
  "node_modules",
  "target",
]);

async function collectRelativeFiles(rootDir, baseDir, bucket) {
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
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectRelativeFiles(fullPath, baseDir, bucket);
      continue;
    }
    if (entry.isFile()) {
      bucket.push(path.relative(baseDir, fullPath).split(path.sep).join("/"));
    }
  }
}

export async function collectAdminDesktopShellScope(options = {}) {
  const roots = Array.isArray(options.roots) && options.roots.length > 0
    ? options.roots.map((root) => path.resolve(root))
    : ADMIN_DESKTOP_SHELL_ROOTS;
  const result = [];

  for (const root of roots) {
    const files = [];
    await collectRelativeFiles(root, root, files);
    result.push({
      shell: path.basename(root),
      root,
      files: files.sort(),
    });
  }

  return result.sort((left, right) => left.root.localeCompare(right.root));
}

export function findAdminDesktopScopeViolations(shells = [], options = {}) {
  const allowedFiles = options.allowedFiles || ADMIN_DESKTOP_ALLOWED_FILES;
  const violations = [];

  for (const shell of shells) {
    const unexpectedFiles = shell.files.filter((relativePath) => !allowedFiles.has(relativePath));
    if (unexpectedFiles.length > 0) {
      violations.push({
        shell: shell.shell,
        root: shell.root,
        unexpectedFiles,
      });
    }
  }

  return violations;
}

export async function assertAdminDesktopShellScope(options = {}) {
  const shells = await collectAdminDesktopShellScope(options);
  const violations = findAdminDesktopScopeViolations(shells, options);

  if (violations.length > 0) {
    const details = violations.map(
      ({ shell, root, unexpectedFiles }) =>
        `- ${shell} (${root}): ${unexpectedFiles.join(", ")}`,
    );
    throw new Error(
      [
        "admin desktop shells contain unexpected business files:",
        ...details,
        ADMIN_DESKTOP_SCOPE_HINT,
      ].join("\n"),
    );
  }

  return {
    shellCount: shells.length,
    fileCount: shells.reduce((sum, shell) => sum + shell.files.length, 0),
    violationCount: 0,
  };
}

async function main() {
  const result = await assertAdminDesktopShellScope();
  console.log(
    `admin desktop shell scope check passed (${result.fileCount} files across ${result.shellCount} shells)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
