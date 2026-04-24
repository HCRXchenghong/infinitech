import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const MAX_SCAN_BYTES = 1024 * 1024;

const blockedTrackedPathPatterns = [
  {
    pattern: /(^|\/)\.env($|\.)/i,
    allow(relativePath) {
      return /\.env(\.[^.]+)?\.example$/i.test(relativePath);
    },
    reason: "tracked runtime env file",
  },
  {
    pattern: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
    allow: () => false,
    reason: "tracked private ssh key",
  },
  {
    pattern: /\.(p12|pfx|jks|keystore)$/i,
    allow: () => false,
    reason: "tracked credential bundle",
  },
];

const contentSecretMatchers = [
  {
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/m,
    reason: "private key material",
    allow(relativePath) {
      return (
        /\.env(\.[^.]+)?\.example$/i.test(relativePath) ||
        /(^|\/)(test|tests)\//i.test(relativePath) ||
        /\.(test|spec)\.[^.]+$/i.test(relativePath) ||
        /_test\.go$/i.test(relativePath)
      );
    },
  },
  {
    pattern: /\bghp_[A-Za-z0-9]{36,255}\b/,
    reason: "GitHub personal access token",
  },
  {
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    reason: "GitHub fine-grained token",
  },
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    reason: "AWS access key id",
  },
  {
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
    reason: "Slack token",
  },
  {
    pattern: /\bsk_live_[0-9A-Za-z]{10,}\b/,
    reason: "Stripe live secret",
  },
  {
    pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    reason: "Google API key",
  },
];

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".jar",
  ".apk",
  ".aab",
  ".keystore",
  ".p12",
  ".pfx",
  ".jks",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".mov",
  ".heic",
  ".heif",
  ".db",
  ".sqlite",
]);

function listTrackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\0")
    .map((value) => value.trim())
    .filter(Boolean);
}

function shouldSkipContentScan(relativePath, buffer) {
  if (buffer.length === 0 || buffer.length > MAX_SCAN_BYTES) {
    return true;
  }

  const extension = path.extname(relativePath).toLowerCase();
  if (binaryExtensions.has(extension)) {
    return true;
  }

  for (const byte of buffer) {
    if (byte === 0) {
      return true;
    }
  }

  return false;
}

function findTrackedPathIssues(relativePath) {
  return blockedTrackedPathPatterns
    .filter(({ pattern, allow }) => pattern.test(relativePath) && !allow(relativePath))
    .map(({ reason }) => ({
      path: relativePath,
      reason,
    }));
}

function findContentIssues(relativePath, source) {
  return contentSecretMatchers
    .filter(({ pattern, allow = () => false }) => pattern.test(source) && !allow(relativePath, source))
    .map(({ reason }) => ({
      path: relativePath,
      reason,
    }));
}

function isMissingTrackedFileError(error) {
  return error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

export function collectCommittedSecretIssues(files, options = {}) {
  const resolveFileBuffer =
    typeof options.resolveFileBuffer === "function"
      ? options.resolveFileBuffer
      : (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath));
  const issues = [];

  for (const relativePath of files) {
    let buffer;
    try {
      buffer = resolveFileBuffer(relativePath);
    } catch (error) {
      if (isMissingTrackedFileError(error)) {
        continue;
      }
      throw error;
    }

    issues.push(...findTrackedPathIssues(relativePath));
    if (!Buffer.isBuffer(buffer) || shouldSkipContentScan(relativePath, buffer)) {
      continue;
    }

    issues.push(...findContentIssues(relativePath, buffer.toString("utf8")));
  }

  return issues;
}

function main() {
  const trackedFiles = listTrackedFiles();
  const issues = collectCommittedSecretIssues(trackedFiles);

  if (issues.length > 0) {
    const lines = issues.map((issue) => `- ${issue.path}: ${issue.reason}`);
    throw new Error(
      [
        "committed secret scan failed:",
        ...lines,
        "请移除敏感内容，或改成 .env.example / 占位符配置后再提交。",
      ].join("\n"),
    );
  }

  console.log(`committed secret scan passed (${trackedFiles.length} tracked files scanned)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
