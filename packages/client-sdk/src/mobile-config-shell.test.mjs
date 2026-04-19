import test from "node:test";
import assert from "node:assert/strict";

import { createManifestBoundMobileConfig } from "./mobile-config-shell.js";

test("manifest-bound mobile config applies manifest and reuses runtime bindings", () => {
  const manifests = [];
  const config = { API_BASE_URL: "http://127.0.0.1:25500" };
  const updateConfig = () => ({ API_BASE_URL: "http://127.0.0.1:25500" });
  const getConfig = () => ({ API_BASE_URL: "http://127.0.0.1:25500" });
  const manifest = {
    "app-plus": {
      config: {
        API_BASE_URL: "https://edge.example.com",
      },
    },
  };

  const runtime = createManifestBoundMobileConfig({
    manifest,
    config,
    updateConfigImpl: updateConfig,
    getConfigImpl: getConfig,
    setManifestImpl(nextManifest) {
      manifests.push(nextManifest);
    },
  });

  assert.deepEqual(manifests, [manifest]);
  assert.equal(runtime.config, config);
  assert.equal(runtime.updateConfig, updateConfig);
  assert.equal(runtime.getConfig, getConfig);
});
