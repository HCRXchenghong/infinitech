import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const REQUIRED_FILES = Object.freeze([
  "socket-server/runtimeConfig.js",
  "socket-server/index.js",
  "packages/client-sdk/src/socket-io.js",
  "scripts/realtime-load-plan.mjs",
  "scripts/realtime-acceptance-gate.mjs",
  "docs/operations/realtime-100k-acceptance.md",
]);
export const FILE_ASSERTIONS = Object.freeze([
  {
    relativePath: "socket-server/runtimeConfig.js",
    needles: [
      "SOCKET_TRANSPORT_MODE",
      "SOCKET_TARGET_CONCURRENT_CONNECTIONS",
      "SOCKET_ACTIVE_CONNECTION_RATIO",
    ],
  },
  {
    relativePath: "socket-server/index.js",
    needles: [
      "transports: SOCKET_IO_TRANSPORTS",
      "capacityMode",
      "stickySessionsConfirmed",
    ],
  },
  {
    relativePath: "packages/client-sdk/src/socket-io.js",
    needles: [
      "transport=websocket",
      "scheduleReconnect",
      "reconnect",
    ],
  },
  {
    relativePath: "docs/operations/realtime-100k-acceptance.md",
    needles: [
      "100k",
      "p95 < 150ms",
      "p99 < 300ms",
      "RTC",
    ],
  },
]);

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function collectRealtimeCapacityBaselineState(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const missingFiles = [];
  const contentFailures = [];

  for (const relativePath of REQUIRED_FILES) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!(await pathExists(fullPath))) {
      missingFiles.push(relativePath);
    }
  }

  for (const assertion of FILE_ASSERTIONS) {
    const fullPath = path.join(repoRoot, assertion.relativePath);
    if (!(await pathExists(fullPath))) {
      continue;
    }
    const source = await readFile(fullPath, "utf8");
    for (const needle of assertion.needles) {
      if (!source.includes(needle)) {
        contentFailures.push(`${assertion.relativePath} is missing "${needle}"`);
      }
    }
  }

  return {
    missingFiles: missingFiles.sort(),
    contentFailures: contentFailures.sort(),
  };
}

export async function assertRealtimeCapacityBaseline(options = {}) {
  const result = await collectRealtimeCapacityBaselineState(options);
  const failures = [];

  if (result.missingFiles.length > 0) {
    failures.push(`missing realtime baseline files: ${result.missingFiles.join(", ")}`);
  }
  failures.push(...result.contentFailures);

  if (failures.length > 0) {
    throw new Error(
      [
        "realtime capacity baseline violations detected:",
        ...failures.map((failure) => `- ${failure}`),
        "请把十万压测专项脚本、socket transport 策略、客户端 websocket/reconnect 基线一起收口。",
      ].join("\n"),
    );
  }

  return {
    fileCount: REQUIRED_FILES.length,
  };
}

async function main() {
  const result = await assertRealtimeCapacityBaseline();
  console.log(`realtime capacity baseline check passed (${result.fileCount} files verified)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
