import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { createAdminDesktopViteConfig } from "./desktop-shell-vite.js";

test("desktop shell vite config shares admin-core aliases and strict ports", () => {
  const currentDir = path.join("/tmp", "infinitech", "admin-win");
  const config = createAdminDesktopViteConfig({
    currentDir,
    port: 8890,
  });

  assert.equal(config.server.host, "0.0.0.0");
  assert.equal(config.server.port, 8890);
  assert.equal(config.server.strictPort, true);
  assert.equal(config.resolve.alias["@"], path.resolve(currentDir, "src"));
  assert.equal(
    config.resolve.alias["@infinitech/admin-core"],
    path.resolve(currentDir, "../packages/admin-core/src"),
  );
});
