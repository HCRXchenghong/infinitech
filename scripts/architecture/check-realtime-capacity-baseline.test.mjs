import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  assertRealtimeCapacityBaseline,
  collectRealtimeCapacityBaselineState,
} from "./check-realtime-capacity-baseline.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-realtime-baseline-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

async function seedFixture(rootDir) {
  await writeFixtureFile(
    rootDir,
    "socket-server/runtimeConfig.js",
    "const SOCKET_TRANSPORT_MODE = 'websocket_only';\nconst SOCKET_TARGET_CONCURRENT_CONNECTIONS = 100000;\nconst SOCKET_ACTIVE_CONNECTION_RATIO = 0.5;\n",
  );
  await writeFixtureFile(
    rootDir,
    "socket-server/index.js",
    "const io = { transports: SOCKET_IO_TRANSPORTS };\nconst capacityMode = 'normal';\nconst stickySessionsConfirmed = true;\n",
  );
  await writeFixtureFile(
    rootDir,
    "packages/client-sdk/src/socket-io.js",
    "function scheduleReconnect() {}\nconst mode = 'reconnect';\nconst url = '?transport=websocket';\n",
  );
  await writeFixtureFile(rootDir, "scripts/realtime-load-plan.mjs", "export {};\n");
  await writeFixtureFile(rootDir, "scripts/realtime-acceptance-gate.mjs", "export {};\n");
  await writeFixtureFile(
    rootDir,
    "docs/operations/realtime-100k-acceptance.md",
    "# 100k\np95 < 150ms\np99 < 300ms\nRTC\n",
  );
}

test("realtime capacity baseline passes when required files and markers exist", async () => {
  const fixtureRoot = await createFixtureRoot();
  try {
    await seedFixture(fixtureRoot);
    const result = await collectRealtimeCapacityBaselineState({ repoRoot: fixtureRoot });
    assert.equal(result.missingFiles.length, 0);
    assert.equal(result.contentFailures.length, 0);
    await assertRealtimeCapacityBaseline({ repoRoot: fixtureRoot });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("realtime capacity baseline rejects missing files and markers", async () => {
  const fixtureRoot = await createFixtureRoot();
  try {
    await seedFixture(fixtureRoot);
    await writeFixtureFile(fixtureRoot, "socket-server/index.js", "const io = {};\n");
    await assert.rejects(
      () => assertRealtimeCapacityBaseline({ repoRoot: fixtureRoot }),
      (error) => {
        assert.match(error.message, /capacityMode/);
        assert.match(error.message, /stickySessionsConfirmed/);
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
