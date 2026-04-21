import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  ADMIN_DESKTOP_DUPLICATE_NAME_HINT,
  assertNoUnexpectedAdminDesktopShellDuplicates,
  buildAdminDesktopDuplicateRenameSuggestion,
  collectAdminDesktopShellFiles,
} from "./check-admin-shell-duplicates.mjs";

async function createFixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "infinitech-admin-shell-"));
}

async function writeFixtureFile(rootDir, relativePath, contents = "") {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  return fullPath;
}

test("admin desktop duplicate guard ignores allowed scaffold basenames and skipped directories", async () => {
  const fixtureRoot = await createFixtureRoot();
  const winRoot = path.join(fixtureRoot, "admin-win");
  const macRoot = path.join(fixtureRoot, "admin-mac");

  try {
    await writeFixtureFile(winRoot, "src/App.vue", "<template />");
    await writeFixtureFile(macRoot, "src/App.vue", "<template />");
    await writeFixtureFile(winRoot, "src/main.ts", "export {}");
    await writeFixtureFile(macRoot, "src/main.ts", "export {}");
    await writeFixtureFile(winRoot, "dist/PaymentCenter.vue", "<template />");
    await writeFixtureFile(macRoot, "dist/PaymentCenter.vue", "<template />");

    const files = await collectAdminDesktopShellFiles({ roots: [winRoot, macRoot] });
    assert.equal(
      files.some((filePath) => filePath.includes(`${path.sep}dist${path.sep}`)),
      false,
    );

    const result = await assertNoUnexpectedAdminDesktopShellDuplicates({
      roots: [winRoot, macRoot],
    });
    assert.deepEqual(result, {
      fileCount: 4,
      duplicateCount: 0,
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("admin desktop duplicate guard reports unexpected duplicate business filenames", async () => {
  const fixtureRoot = await createFixtureRoot();
  const winRoot = path.join(fixtureRoot, "admin-win");
  const macRoot = path.join(fixtureRoot, "admin-mac");

  try {
    await writeFixtureFile(winRoot, "src/views/PaymentCenter.vue", "<template />");
    await writeFixtureFile(macRoot, "src/pages/PaymentCenter.vue", "<template />");

    await assert.rejects(
      () =>
        assertNoUnexpectedAdminDesktopShellDuplicates({
          roots: [winRoot, macRoot],
        }),
      (error) => {
        assert.match(error.message, /PaymentCenter\.vue/);
        assert.match(error.message, new RegExp(ADMIN_DESKTOP_DUPLICATE_NAME_HINT));
        assert.match(
          error.message,
          new RegExp(buildAdminDesktopDuplicateRenameSuggestion("PaymentCenter.vue")),
        );
        return true;
      },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("duplicate rename suggestion keeps extension and surfaces win/mac examples", () => {
  assert.equal(
    buildAdminDesktopDuplicateRenameSuggestion("PaymentCenter.vue"),
    "建议改成 PaymentCenterWin.vue / PaymentCenterMac.vue，或改成更明确的业务名",
  );
  assert.equal(
    buildAdminDesktopDuplicateRenameSuggestion("SettingsDialog.ts"),
    "建议改成 SettingsDialogWin.ts / SettingsDialogMac.ts，或改成更明确的业务名",
  );
});
