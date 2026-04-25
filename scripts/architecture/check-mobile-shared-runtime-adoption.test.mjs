import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  MOBILE_SHARED_RUNTIME_HINT,
  assertMobileSharedRuntimeAdoption,
  collectMobileShellFiles,
  groupMirroredMobileShellFiles,
  isThinReexportShellSource,
} from "./check-mobile-shared-runtime-adoption.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-mobile-shared-runtime-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

test("isThinReexportShellSource accepts import/export bridges and rejects local logic", () => {
  assert.equal(
    isThinReexportShellSource(
      [
        'import config from "./config";',
        'export { bootstrapUserApp } from "./runtime";',
      ].join("\n"),
    ),
    true,
  );

  assert.equal(
    isThinReexportShellSource(
      [
        'import config from "./config";',
        "const runtime = createRuntime(config);",
        "export default runtime;",
      ].join("\n"),
    ),
    false,
  );
});

test("mobile shared runtime adoption passes mirrored shells backed by shared packages or thin bridges", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");
  const merchantRoot = path.join(fixtureRoot, "merchant-app");
  const riderRoot = path.join(fixtureRoot, "rider-app");
  const groups = [
    {
      name: "consumer",
      roots: [userRoot, appRoot],
      scopes: ["shared-ui", "utils"],
    },
    {
      name: "role",
      roots: [merchantRoot, riderRoot],
      scopes: ["shared-ui", "utils"],
    },
  ];

  try {
    await writeFixtureFile(
      userRoot,
      "shared-ui/service-runtime.js",
      'import { createDefaultConsumerServiceRuntime } from "../../packages/mobile-core/src/consumer-service-shell.js";\nexport default createDefaultConsumerServiceRuntime({});\n',
    );
    await writeFixtureFile(
      appRoot,
      "shared-ui/service-runtime.js",
      'import { createDefaultConsumerServiceRuntime } from "../../packages/mobile-core/src/consumer-service-shell.js";\nexport default createDefaultConsumerServiceRuntime({});\n',
    );
    await writeFixtureFile(
      userRoot,
      "shared-ui/api.js",
      'export { request, uploadCommonImage } from "./service-runtime.js";\n',
    );
    await writeFixtureFile(
      appRoot,
      "shared-ui/api.js",
      'export { request, uploadCommonImage } from "./service-runtime.js";\n',
    );
    await writeFixtureFile(
      userRoot,
      "shared-ui/db.d.ts",
      "export interface LocalDB { query(sql: string): Promise<unknown>; }\n",
    );
    await writeFixtureFile(
      appRoot,
      "shared-ui/db.d.ts",
      "export interface LocalDB { query(sql: string): Promise<unknown>; }\n",
    );
    await writeFixtureFile(
      merchantRoot,
      "shared-ui/realtime-notify.ts",
      'import { createDefaultRoleRealtimeNotifyBindings } from "../../packages/client-sdk/src/role-notify-shell.js";\nexport const notify = createDefaultRoleRealtimeNotifyBindings({});\n',
    );
    await writeFixtureFile(
      riderRoot,
      "shared-ui/realtime-notify.ts",
      'import { createDefaultRoleRealtimeNotifyBindings } from "../../packages/client-sdk/src/role-notify-shell.js";\nexport const notify = createDefaultRoleRealtimeNotifyBindings({});\n',
    );
    await writeFixtureFile(
      merchantRoot,
      "utils/socket-io.ts",
      'export { default } from "../../packages/client-sdk/src/socket-io.js";\n',
    );
    await writeFixtureFile(
      riderRoot,
      "utils/socket-io.ts",
      'export { default } from "../../packages/client-sdk/src/socket-io.js";\n',
    );

    const files = await collectMobileShellFiles({ groups });
    const consumerMirrors = groupMirroredMobileShellFiles(
      files.filter((filePath) => filePath.includes(`${path.sep}user-vue${path.sep}`) || filePath.includes(`${path.sep}app-mobile${path.sep}`)),
      { roots: [userRoot, appRoot] },
    );
    assert.deepEqual(
      consumerMirrors.map((group) => group.relativePath),
      ["shared-ui/api.js", "shared-ui/db.d.ts", "shared-ui/service-runtime.js"],
    );

    const result = await assertMobileSharedRuntimeAdoption({ groups });
    assert.deepEqual(
      {
        fileCount: result.fileCount,
        violationCount: result.violationCount,
      },
      {
        fileCount: 10,
        violationCount: 0,
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("mobile shared runtime adoption rejects mirrored shells with local parallel logic", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");
  const groups = [
    {
      name: "consumer",
      roots: [userRoot, appRoot],
      scopes: ["shared-ui", "utils"],
    },
  ];

  try {
    await writeFixtureFile(
      userRoot,
      "shared-ui/sync.ts",
      [
        'import config from "./config";',
        "const createSyncRuntime = () => ({ config });",
        "export default createSyncRuntime();",
      ].join("\n"),
    );
    await writeFixtureFile(
      appRoot,
      "shared-ui/sync.ts",
      'export { getSyncService as default } from "./service-runtime.js";\n',
    );

    await assert.rejects(
      () => assertMobileSharedRuntimeAdoption({ groups }),
      (error) => {
        assert.match(error.message, /consumer:shared-ui\/sync\.ts/);
        assert.match(error.message, /user-vue/);
        assert.match(error.message, new RegExp(MOBILE_SHARED_RUNTIME_HINT));
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
