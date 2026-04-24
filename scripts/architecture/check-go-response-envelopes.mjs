import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const GO_RESPONSE_ENVELOPE_SCAN_DIRS = Object.freeze([
  "backend/go/internal/handler",
  "backend/go/internal/middleware",
]);
export const GO_RESPONSE_ENVELOPE_BLOCKED_PATTERNS = Object.freeze([
  { type: "Context.JSON", regex: /\b\w+\.JSON\(/g },
  { type: "Context.AbortWithStatusJSON", regex: /\b\w+\.AbortWithStatusJSON\(/g },
]);

async function listGoFilesRecursive(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listGoFilesRecursive(fullPath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".go") || entry.name.endsWith("_test.go")) {
      continue;
    }
    files.push(fullPath);
  }

  return files.sort();
}

function findLineNumber(source = "", index = 0) {
  return source.slice(0, index).split("\n").length;
}

export function findGoResponseEnvelopeViolations(fileEntries = []) {
  const violations = [];

  for (const entry of fileEntries) {
    const relativePath = String(entry.relativePath || "").replace(/\\/g, "/");
    const source = String(entry.source || "");

    for (const pattern of GO_RESPONSE_ENVELOPE_BLOCKED_PATTERNS) {
      const matches = Array.from(source.matchAll(pattern.regex));
      for (const match of matches) {
        const index = typeof match.index === "number" ? match.index : 0;
        violations.push({
          relativePath,
          type: pattern.type,
          line: findLineNumber(source, index),
          snippet: match[0],
        });
      }
    }
  }

  return violations.sort((left, right) => {
    if (left.relativePath !== right.relativePath) {
      return left.relativePath.localeCompare(right.relativePath);
    }
    return left.line - right.line;
  });
}

export async function collectGoResponseEnvelopeFileEntries(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const scanDirs = options.scanDirs || GO_RESPONSE_ENVELOPE_SCAN_DIRS;
  const files = [];

  for (const relativeDir of scanDirs) {
    const absoluteDir = path.resolve(repoRoot, relativeDir);
    const dirFiles = await listGoFilesRecursive(absoluteDir);
    for (const fullPath of dirFiles) {
      files.push({
        fullPath,
        relativePath: path.relative(repoRoot, fullPath).replace(/\\/g, "/"),
        source: await readFile(fullPath, "utf8"),
      });
    }
  }

  return files;
}

export async function assertGoResponseEnvelopeUsage(options = {}) {
  const fileEntries = Array.isArray(options.fileEntries)
    ? options.fileEntries
    : await collectGoResponseEnvelopeFileEntries(options);
  const violations = findGoResponseEnvelopeViolations(fileEntries);

  if (violations.length > 0) {
    const lines = violations.map(
      (item) =>
        `- ${item.relativePath}:${item.line} contains ${item.type} (${item.snippet.trim()})`,
    );
    throw new Error(
      [
        "go response envelope violations detected:",
        ...lines,
        "请改用 internal/apiresponse 与共享 envelope helper，而不是在 handler/middleware 里直接返回裸 JSON。",
      ].join("\n"),
    );
  }

  return {
    scannedFileCount: fileEntries.length,
    violationCount: 0,
  };
}

async function main() {
  const result = await assertGoResponseEnvelopeUsage();
  console.log(`go response envelope check passed (${result.scannedFileCount} files scanned)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
