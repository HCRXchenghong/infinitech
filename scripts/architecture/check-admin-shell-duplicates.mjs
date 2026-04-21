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
export const ADMIN_DESKTOP_ALLOWED_DUPLICATE_BASENAMES = new Set([
  "App.vue",
  "Cargo.toml",
  "README.md",
  "env.d.ts",
  "index.html",
  "main.rs",
  "main.ts",
  "package.json",
  "styles.css",
  "tauri.conf.json",
  "tsconfig.json",
  "vite.config.mts",
]);
export const ADMIN_DESKTOP_DUPLICATE_NAME_HINT =
  "请换个名称、在后面加编号，或收敛进 packages/admin-core";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "dist",
  "node_modules",
  "target",
]);

async function collectFilesRecursively(rootDir, bucket) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectFilesRecursively(fullPath, bucket);
      continue;
    }
    if (entry.isFile()) {
      bucket.push(fullPath);
    }
  }
}

export async function collectAdminDesktopShellFiles(options = {}) {
  const roots = Array.isArray(options.roots) && options.roots.length > 0
    ? options.roots.map((root) => path.resolve(root))
    : ADMIN_DESKTOP_SHELL_ROOTS;
  const files = [];

  for (const root of roots) {
    await collectFilesRecursively(root, files);
  }

  return files.sort();
}

export function findUnexpectedDuplicateBasenames(filePaths = [], options = {}) {
  const allowedBasenames = options.allowedBasenames || ADMIN_DESKTOP_ALLOWED_DUPLICATE_BASENAMES;
  const basenameGroups = new Map();

  for (const filePath of filePaths) {
    const basename = path.basename(filePath);
    if (!basenameGroups.has(basename)) {
      basenameGroups.set(basename, []);
    }
    basenameGroups.get(basename).push(path.resolve(filePath));
  }

  return Array.from(basenameGroups.entries())
    .filter(([basename, matches]) => matches.length > 1 && !allowedBasenames.has(basename))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([basename, matches]) => ({
      basename,
      paths: matches.sort(),
    }));
}

export function buildAdminDesktopDuplicateRenameSuggestion(basename = "") {
  const parsed = path.parse(String(basename || "").trim());
  const stem = parsed.name || "BusinessView";
  const ext = parsed.ext || "";
  return `建议改成 ${stem}Win${ext} / ${stem}Mac${ext}，或改成更明确的业务名`;
}

export async function assertNoUnexpectedAdminDesktopShellDuplicates(options = {}) {
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths.map((filePath) => path.resolve(filePath))
    : await collectAdminDesktopShellFiles(options);
  const duplicates = findUnexpectedDuplicateBasenames(filePaths, options);

  if (duplicates.length > 0) {
    const duplicateLines = duplicates.map(
      ({ basename, paths }) =>
        `- ${basename}: ${paths.join(", ")}\n  ${buildAdminDesktopDuplicateRenameSuggestion(basename)}`,
    );
    throw new Error(
      [
        "admin desktop shell duplicate basenames detected:",
        ...duplicateLines,
        ADMIN_DESKTOP_DUPLICATE_NAME_HINT,
      ].join("\n"),
    );
  }

  return {
    fileCount: filePaths.length,
    duplicateCount: 0,
  };
}

async function main() {
  const result = await assertNoUnexpectedAdminDesktopShellDuplicates();
  console.log(
    `admin desktop shell duplicate name check passed (${result.fileCount} files scanned)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
