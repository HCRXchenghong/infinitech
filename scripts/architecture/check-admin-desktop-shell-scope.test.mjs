import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  ADMIN_DESKTOP_ALLOWED_FILES,
  ADMIN_DESKTOP_SCOPE_HINT,
  assertAdminDesktopShellScope,
  collectAdminDesktopShellScope,
  findAdminDesktopScopeViolations,
} from "./check-admin-desktop-shell-scope.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-admin-desktop-scope-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

test("admin desktop shell scope allows scaffold files and ignores build output", async () => {
  const fixtureRoot = await createFixtureRoot();
  const winRoot = path.join(fixtureRoot, "admin-win");
  const macRoot = path.join(fixtureRoot, "admin-mac");

  try {
    for (const relativePath of ADMIN_DESKTOP_ALLOWED_FILES) {
      await writeFixtureFile(winRoot, relativePath, "ok\n");
      await writeFixtureFile(macRoot, relativePath, "ok\n");
    }
    await writeFixtureFile(winRoot, "dist/assets/index.js", "ignored\n");

    const shells = await collectAdminDesktopShellScope({ roots: [winRoot, macRoot] });
    assert.equal(shells.length, 2);
    assert.equal(shells[0].files.includes("dist/assets/index.js"), false);

    const result = await assertAdminDesktopShellScope({ roots: [winRoot, macRoot] });
    assert.deepEqual(result, {
      shellCount: 2,
      fileCount: ADMIN_DESKTOP_ALLOWED_FILES.size * 2,
      violationCount: 0,
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("admin desktop shell scope rejects business files inside shell roots", async () => {
  const fixtureRoot = await createFixtureRoot();
  const winRoot = path.join(fixtureRoot, "admin-win");
  const macRoot = path.join(fixtureRoot, "admin-mac");

  try {
    await writeFixtureFile(winRoot, "src/main.ts", "ok\n");
    await writeFixtureFile(macRoot, "src/main.ts", "ok\n");
    await writeFixtureFile(winRoot, "src/views/PaymentCenter.vue", "<template />\n");

    const shells = await collectAdminDesktopShellScope({ roots: [winRoot, macRoot] });
    const violations = findAdminDesktopScopeViolations(shells);
    assert.deepEqual(violations.map((item) => item.shell), ["admin-win"]);
    assert.deepEqual(violations[0].unexpectedFiles, ["src/views/PaymentCenter.vue"]);

    await assert.rejects(
      () => assertAdminDesktopShellScope({ roots: [winRoot, macRoot] }),
      (error) => {
        assert.match(error.message, /PaymentCenter\.vue/);
        assert.match(error.message, new RegExp(ADMIN_DESKTOP_SCOPE_HINT));
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
