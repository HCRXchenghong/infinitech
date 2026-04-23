import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const CONSUMER_SHELL_ROOTS = Object.freeze([
  path.join(REPO_ROOT, "user-vue"),
  path.join(REPO_ROOT, "app-mobile"),
]);
export const CONSUMER_SHELL_SCOPES = Object.freeze(["pages", "components"]);
export const CONSUMER_SHARED_CORE_IMPORT_TOKEN = "packages/mobile-core/src/";
export const CONSUMER_SHARED_CORE_HINT =
  "请把共享业务逻辑收敛到 packages/mobile-core，端侧只保留壳层；如果不是同一业务，请改名避免镜像路径重名。";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "dist",
  "node_modules",
  "unpackage",
]);

const SUPPORTED_EXTENSIONS = new Set([".vue", ".js", ".ts"]);

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
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectFilesRecursively(fullPath, bucket);
      continue;
    }
    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
      bucket.push(fullPath);
    }
  }
}

export async function collectConsumerShellFiles(options = {}) {
  const roots = Array.isArray(options.roots) && options.roots.length > 0
    ? options.roots.map((root) => path.resolve(root))
    : CONSUMER_SHELL_ROOTS;
  const scopes = Array.isArray(options.scopes) && options.scopes.length > 0
    ? options.scopes
    : CONSUMER_SHELL_SCOPES;
  const files = [];

  for (const root of roots) {
    for (const scope of scopes) {
      const scopeRoot = path.join(root, scope);
      await collectFilesRecursively(scopeRoot, files);
    }
  }

  return files.sort();
}

function resolveShellName(filePath, roots) {
  const resolved = path.resolve(filePath);
  for (const root of roots) {
    if (resolved.startsWith(root + path.sep)) {
      return path.basename(root);
    }
  }
  return "";
}

function resolveMirrorRelativePath(filePath, roots) {
  const resolved = path.resolve(filePath);
  for (const root of roots) {
    if (resolved.startsWith(root + path.sep)) {
      return resolved.slice(root.length + 1);
    }
  }
  return path.basename(resolved);
}

export function groupMirroredConsumerShellFiles(filePaths = [], options = {}) {
  const roots = Array.isArray(options.roots) && options.roots.length > 0
    ? options.roots.map((root) => path.resolve(root))
    : CONSUMER_SHELL_ROOTS;
  const grouped = new Map();

  for (const filePath of filePaths) {
    const absolutePath = path.resolve(filePath);
    const relativePath = resolveMirrorRelativePath(absolutePath, roots);
    const shell = resolveShellName(absolutePath, roots);
    if (!shell) {
      continue;
    }
    if (!grouped.has(relativePath)) {
      grouped.set(relativePath, []);
    }
    grouped.get(relativePath).push({
      shell,
      path: absolutePath,
    });
  }

  return Array.from(grouped.entries())
    .filter(([, items]) => {
      const shells = new Set(items.map((item) => item.shell));
      return shells.size > 1;
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, items]) => ({
      relativePath,
      files: items.sort((left, right) => left.path.localeCompare(right.path)),
    }));
}

export async function findConsumerShellSharedCoreViolations(filePaths = [], options = {}) {
  const mirroredGroups = groupMirroredConsumerShellFiles(filePaths, options);
  const importToken = options.importToken || CONSUMER_SHARED_CORE_IMPORT_TOKEN;
  const violations = [];

  for (const group of mirroredGroups) {
    const offenders = [];
    for (const file of group.files) {
      const source = await readFile(file.path, "utf8");
      if (!source.includes(importToken)) {
        offenders.push(file.path);
      }
    }
    if (offenders.length > 0) {
      violations.push({
        relativePath: group.relativePath,
        offenders: offenders.sort(),
        files: group.files.map((file) => file.path),
      });
    }
  }

  return {
    mirroredGroups,
    violations,
  };
}

export async function assertConsumerShellsUseSharedCore(options = {}) {
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths.map((filePath) => path.resolve(filePath))
    : await collectConsumerShellFiles(options);
  const { mirroredGroups, violations } = await findConsumerShellSharedCoreViolations(
    filePaths,
    options,
  );

  if (violations.length > 0) {
    const details = violations.map(
      ({ relativePath, offenders, files }) =>
        [
          `- ${relativePath}`,
          `  mirrored files: ${files.join(", ")}`,
          `  missing shared core import: ${offenders.join(", ")}`,
        ].join("\n"),
    );
    throw new Error(
      [
        "consumer mirrored shells must import packages/mobile-core:",
        ...details,
        CONSUMER_SHARED_CORE_HINT,
      ].join("\n"),
    );
  }

  return {
    fileCount: filePaths.length,
    mirroredGroupCount: mirroredGroups.length,
    violationCount: 0,
  };
}

async function main() {
  const result = await assertConsumerShellsUseSharedCore();
  console.log(
    `consumer shared shell check passed (${result.mirroredGroupCount} mirrored files across ${result.fileCount} scanned files)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
