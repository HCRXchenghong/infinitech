import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const MOBILE_SHARED_RUNTIME_IMPORT_TOKENS = Object.freeze([
  "packages/mobile-core/src/",
  "packages/client-sdk/src/",
  "packages/contracts/src/",
]);
export const MOBILE_SHARED_RUNTIME_HINT =
  "镜像移动端壳层文件必须直接消费 packages/mobile-core / packages/client-sdk / packages/contracts；如果不是同一业务，请改名或追加编号，避免继续沿用同一路径形成伪共享。";
export const MOBILE_SHARED_RUNTIME_GROUPS = Object.freeze([
  {
    name: "consumer",
    roots: Object.freeze([
      path.join(REPO_ROOT, "user-vue"),
      path.join(REPO_ROOT, "app-mobile"),
    ]),
    scopes: Object.freeze(["shared-ui", "utils"]),
  },
  {
    name: "role",
    roots: Object.freeze([
      path.join(REPO_ROOT, "merchant-app"),
      path.join(REPO_ROOT, "rider-app"),
    ]),
    scopes: Object.freeze(["shared-ui", "utils"]),
  },
]);

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "dist",
  "node_modules",
  "unpackage",
]);

const SUPPORTED_EXTENSIONS = new Set([".js", ".ts", ".d.ts"]);

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

    if (
      entry.isFile() &&
      (SUPPORTED_EXTENSIONS.has(path.extname(entry.name)) || entry.name.endsWith(".d.ts"))
    ) {
      bucket.push(fullPath);
    }
  }
}

function stripComments(source = "") {
  return String(source || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
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

function resolveShellName(filePath, roots) {
  const resolved = path.resolve(filePath);
  for (const root of roots) {
    if (resolved.startsWith(root + path.sep)) {
      return path.basename(root);
    }
  }
  return "";
}

function hasSharedRuntimeImport(source = "", importTokens = MOBILE_SHARED_RUNTIME_IMPORT_TOKENS) {
  return importTokens.some((token) => String(source || "").includes(token));
}

export function isThinReexportShellSource(source = "") {
  const normalizedSource = stripComments(source).trim();
  if (!normalizedSource) {
    return true;
  }

  if (/\b(?:function|const|let|var|class|if|for|while|switch|try|catch|new|return)\b/.test(normalizedSource)) {
    return false;
  }

  return /^(?:\s*(?:import[\s\S]*?from\s*["'][^"']+["'];?|export\s+(?:type\s+)?(?:\{[\s\S]*?\}|\*)\s*(?:from\s*["'][^"']+["'])?;?)\s*)+$/m
    .test(normalizedSource);
}

function isTypeDeclarationShell(filePath, source = "") {
  if (!String(filePath || "").endsWith(".d.ts")) {
    return false;
  }
  const normalizedSource = stripComments(source).trim();
  return normalizedSource.length > 0;
}

export function groupMirroredMobileShellFiles(filePaths = [], options = {}) {
  const roots = Array.isArray(options.roots) && options.roots.length > 0
    ? options.roots.map((root) => path.resolve(root))
    : [];
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
    .filter(([, items]) => new Set(items.map((item) => item.shell)).size > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, files]) => ({
      relativePath,
      files: files.sort((left, right) => left.path.localeCompare(right.path)),
    }));
}

export async function collectMobileShellFiles(options = {}) {
  const groups = Array.isArray(options.groups) && options.groups.length > 0
    ? options.groups
    : MOBILE_SHARED_RUNTIME_GROUPS;
  const files = [];

  for (const group of groups) {
    const roots = group.roots.map((root) => path.resolve(root));
    const scopes = Array.isArray(group.scopes) ? group.scopes : [];
    for (const root of roots) {
      for (const scope of scopes) {
        await collectFilesRecursively(path.join(root, scope), files);
      }
    }
  }

  return files.sort();
}

export async function findMobileSharedRuntimeViolations(options = {}) {
  const groups = Array.isArray(options.groups) && options.groups.length > 0
    ? options.groups
    : MOBILE_SHARED_RUNTIME_GROUPS;
  const importTokens = Array.isArray(options.importTokens) && options.importTokens.length > 0
    ? options.importTokens
    : MOBILE_SHARED_RUNTIME_IMPORT_TOKENS;
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths.map((filePath) => path.resolve(filePath))
    : await collectMobileShellFiles({ groups });
  const fileSourceMap = new Map(
    Array.isArray(options.sourceFiles)
      ? options.sourceFiles.map((item) => [path.resolve(item.path), String(item.source || "")])
      : await Promise.all(
          filePaths.map(async (filePath) => [path.resolve(filePath), await readFile(filePath, "utf8")]),
        ),
  );
  const violations = [];

  for (const group of groups) {
    const roots = group.roots.map((root) => path.resolve(root));
    const mirroredGroups = groupMirroredMobileShellFiles(
      filePaths.filter((filePath) => roots.some((root) => filePath.startsWith(root + path.sep))),
      { roots },
    );

    for (const mirroredGroup of mirroredGroups) {
      const offenders = mirroredGroup.files
        .filter((file) => {
          const source = fileSourceMap.get(file.path) || "";
          return !hasSharedRuntimeImport(source, importTokens) &&
            !isThinReexportShellSource(source) &&
            !isTypeDeclarationShell(file.path, source);
        })
        .map((file) => file.path);

      if (offenders.length > 0) {
        violations.push({
          groupName: group.name,
          relativePath: mirroredGroup.relativePath,
          files: mirroredGroup.files.map((file) => file.path),
          offenders: offenders.sort(),
        });
      }
    }
  }

  return {
    fileCount: filePaths.length,
    violationCount: violations.length,
    violations,
  };
}

export async function assertMobileSharedRuntimeAdoption(options = {}) {
  const result = await findMobileSharedRuntimeViolations(options);

  if (result.violations.length > 0) {
    const details = result.violations.map(
      ({ groupName, relativePath, files, offenders }) =>
        [
          `- ${groupName}:${relativePath}`,
          `  mirrored files: ${files.join(", ")}`,
          `  offending shells: ${offenders.join(", ")}`,
        ].join("\n"),
    );
    throw new Error(
      [
        "mobile shared runtime adoption drift detected:",
        ...details,
        MOBILE_SHARED_RUNTIME_HINT,
      ].join("\n"),
    );
  }

  return result;
}

async function main() {
  const result = await assertMobileSharedRuntimeAdoption();
  console.log(
    `mobile shared runtime adoption check passed (${result.fileCount} scanned files, ${result.violationCount} violations)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
