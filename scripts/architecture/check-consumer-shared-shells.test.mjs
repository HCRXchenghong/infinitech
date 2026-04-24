import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  CONSUMER_SHARED_CORE_HINT,
  assertConsumerShellsUseSharedCore,
  collectConsumerShellFiles,
  groupMirroredConsumerShellFiles,
} from "./check-consumer-shared-shells.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-consumer-shell-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

test("consumer shared shell guard ignores non mirrored files and skipped directories", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");

  try {
    await writeFixtureFile(
      userRoot,
      "pages/index/index.vue",
      'import HomePage from "../../../packages/mobile-core/src/HomeIndexPage.vue";\nexport default HomePage;\n',
    );
    await writeFixtureFile(
      appRoot,
      "pages/index/index.vue",
      'import HomePage from "../../../packages/mobile-core/src/HomeIndexPage.vue";\nexport default HomePage;\n',
    );
    await writeFixtureFile(
      userRoot,
      "components/WeatherModal.vue",
      'import WeatherModal from "../../packages/mobile-core/src/HomeWeatherModal.vue";\nexport default WeatherModal;\n',
    );
    await writeFixtureFile(appRoot, "dist/components/WeatherModal.vue", "<template />\n");

    const files = await collectConsumerShellFiles({ roots: [userRoot, appRoot] });
    assert.equal(
      files.some((filePath) => filePath.includes(`${path.sep}dist${path.sep}`)),
      false,
    );

    const mirrored = groupMirroredConsumerShellFiles(files, { roots: [userRoot, appRoot] });
    assert.equal(mirrored.length, 1);
    assert.equal(mirrored[0].relativePath, "pages/index/index.vue");

    const result = await assertConsumerShellsUseSharedCore({
      roots: [userRoot, appRoot],
    });
    assert.deepEqual(result, {
      fileCount: 3,
      mirroredGroupCount: 1,
      violationCount: 0,
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("consumer shared shell guard rejects mirrored files that bypass mobile core", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");

  try {
    await writeFixtureFile(
      userRoot,
      "pages/profile/edit/index.vue",
      "<script setup>\nconst localOnly = true;\n</script>\n",
    );
    await writeFixtureFile(
      appRoot,
      "pages/profile/edit/index.vue",
      'import SharedProfileEditPage from "../../../../packages/mobile-core/src/profile-edit.js";\nexport default SharedProfileEditPage;\n',
    );

    await assert.rejects(
      () =>
        assertConsumerShellsUseSharedCore({
          roots: [userRoot, appRoot],
        }),
      (error) => {
        assert.match(error.message, /pages\/profile\/edit\/index\.vue/);
        assert.match(error.message, /user-vue/);
        assert.match(error.message, new RegExp(CONSUMER_SHARED_CORE_HINT));
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("consumer shared shell guard groups mirrored components and scripts by relative path", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");

  try {
    await writeFixtureFile(
      userRoot,
      "components/WeatherModal.vue",
      'import WeatherModal from "../../packages/mobile-core/src/HomeWeatherModal.vue";\nexport default WeatherModal;\n',
    );
    await writeFixtureFile(
      appRoot,
      "components/WeatherModal.vue",
      'import WeatherModal from "../../packages/mobile-core/src/HomeWeatherModal.vue";\nexport default WeatherModal;\n',
    );
    await writeFixtureFile(
      userRoot,
      "pages/profile/vip-center/vip-data.js",
      'export { createProfileVipCenterPageOptions } from "../../../../packages/mobile-core/src/vip-center.js";\n',
    );
    await writeFixtureFile(
      appRoot,
      "pages/profile/vip-center/vip-data.js",
      'export { createProfileVipCenterPageOptions } from "../../../../packages/mobile-core/src/vip-center.js";\n',
    );

    const groups = groupMirroredConsumerShellFiles(
      await collectConsumerShellFiles({ roots: [userRoot, appRoot] }),
      { roots: [userRoot, appRoot] },
    );
    assert.deepEqual(
      groups.map((group) => group.relativePath),
      [
        "components/WeatherModal.vue",
        "pages/profile/vip-center/vip-data.js",
      ],
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("consumer shared shell guard also scans mirrored root app shells", async () => {
  const fixtureRoot = await createFixtureRoot();
  const userRoot = path.join(fixtureRoot, "user-vue");
  const appRoot = path.join(fixtureRoot, "app-mobile");

  try {
    await writeFixtureFile(
      userRoot,
      "App.vue",
      'import { createConsumerAppRootLifecycle } from "../packages/mobile-core/src/consumer-app-shell.js";\nexport default createConsumerAppRootLifecycle({});\n',
    );
    await writeFixtureFile(
      appRoot,
      "App.vue",
      'import { createConsumerAppRootLifecycle } from "../packages/mobile-core/src/consumer-app-shell.js";\nexport default createConsumerAppRootLifecycle({});\n',
    );

    const groups = groupMirroredConsumerShellFiles(
      await collectConsumerShellFiles({ roots: [userRoot, appRoot] }),
      { roots: [userRoot, appRoot] },
    );
    assert.deepEqual(
      groups.map((group) => group.relativePath),
      ["App.vue"],
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
