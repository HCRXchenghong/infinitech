import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  assertModernizationBaseline,
  collectModernizationBaselineState,
} from "./verify-modernization-baseline.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-modernization-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

async function seedBaselineFixture(rootDir) {
  await writeFixtureFile(
    rootDir,
    "package.json",
    JSON.stringify({
      workspaces: ["packages/*", "admin-vue", "admin-win", "admin-mac"],
    }),
  );
  await writeFixtureFile(rootDir, "README.md", "admin-vue\nadmin-win\nadmin-mac\npackages\n");
  await writeFixtureFile(
    rootDir,
    "docs/architecture/platform-modernization-baseline.md",
    "# baseline\n",
  );
  await writeFixtureFile(rootDir, "packages/contracts/index.js", "export {};\n");
  await writeFixtureFile(rootDir, "packages/client-sdk/src/socket-io.js", "export default {};\n");
  await writeFixtureFile(rootDir, "packages/domain-core/index.js", "export {};\n");
  await writeFixtureFile(rootDir, "packages/mobile-core/index.js", "export {};\n");
  await writeFixtureFile(rootDir, "packages/admin-core/src/route-registry.js", "export {};\n");
  await writeFixtureFile(
    rootDir,
    "packages/admin-core/src/DesktopShellApp.vue",
    "<template />\n",
  );
  await writeFixtureFile(rootDir, "admin-vue/src/main.js", "export {};\n");
  await writeFixtureFile(rootDir, "admin-win/src/main.ts", "export {};\n");
  await writeFixtureFile(rootDir, "admin-mac/src/main.ts", "export {};\n");
  await writeFixtureFile(
    rootDir,
    "socket-server/index.js",
    "console.log('socket');\n",
  );
}

test("modernization baseline passes on current target delivery shape", async () => {
  const fixtureRoot = await createFixtureRoot();

  try {
    await seedBaselineFixture(fixtureRoot);
    const result = await collectModernizationBaselineState({ repoRoot: fixtureRoot });
    assert.equal(result.missingPaths.length, 0);
    assert.equal(result.forbiddenPaths.length, 0);
    assert.equal(result.sourceViolations.length, 0);

    await assertModernizationBaseline({ repoRoot: fixtureRoot });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("modernization baseline rejects legacy admin-app and shared mobile references", async () => {
  const fixtureRoot = await createFixtureRoot();

  try {
    await seedBaselineFixture(fixtureRoot);
    await writeFixtureFile(fixtureRoot, "admin-app/package.json", "{}\n");
    await writeFixtureFile(
      fixtureRoot,
      "user-vue/utils/legacy.js",
      'export * from "../../shared/mobile-common/socket-io.ts";\n',
    );
    await writeFixtureFile(
      fixtureRoot,
      "README.md",
      "admin-vue\nadmin-win\nadmin-mac\npackages\nadmin-app\n",
    );
    await assert.rejects(
      () => assertModernizationBaseline({ repoRoot: fixtureRoot }),
      (error) => {
        assert.match(error.message, /admin-app/);
        assert.match(error.message, /shared\/mobile-common/);
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
