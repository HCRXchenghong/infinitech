import test from "node:test";
import assert from "node:assert/strict";

import { createMobileConfigHelper } from "./mobile-config-helper.js";

function createMockUniApp() {
  const storage = new Map();
  const responses = new Map();

  return {
    setHealth(url, ok) {
      responses.set(url, ok);
    },
    request({ url, success, fail }) {
      if (responses.get(url)) {
        success({ statusCode: 200 });
        return;
      }
      fail(new Error("unavailable"));
    },
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
  };
}

test("mobile config helper checks server availability through uni request", async () => {
  const uniApp = createMockUniApp();
  uniApp.setHealth("http://127.0.0.1:25500/health", true);

  const helper = createMobileConfigHelper({
    uniApp,
    config: {
      API_BASE_URL: "http://127.0.0.1:25500",
      isDev: true,
    },
  });

  assert.equal(await helper.checkServerConnection(), true);
  assert.equal(await helper.checkServerConnection("http://127.0.0.1:9999/health"), false);
});

test("mobile config helper rolls config back when verification fails", async () => {
  const uniApp = createMockUniApp();
  const updates = [];
  let currentConfig = {
    API_BASE_URL: "http://127.0.0.1:25500",
    SOCKET_URL: "http://127.0.0.1:9898",
    isDev: true,
  };

  const helper = createMobileConfigHelper({
    uniApp,
    config: currentConfig,
    getConfig() {
      return { ...currentConfig };
    },
    updateConfig(nextConfig) {
      currentConfig = {
        ...currentConfig,
        ...nextConfig,
      };
      updates.push(currentConfig.API_BASE_URL);
      return currentConfig;
    },
  });

  assert.equal(
    await helper.updateConfigAndVerify({
      API_BASE_URL: "http://10.0.0.1:25500",
      SOCKET_URL: "http://10.0.0.1:9898",
    }),
    false,
  );
  assert.deepEqual(updates, [
    "http://10.0.0.1:25500",
    "http://127.0.0.1:25500",
  ]);
});

test("mobile config helper auto-detects the first healthy server candidate", async () => {
  const uniApp = createMockUniApp();
  uniApp.setHealth("http://192.168.1.108:25500/health", true);

  const helper = createMobileConfigHelper({
    uniApp,
    config: {
      API_BASE_URL: "",
      isDev: true,
    },
  });

  assert.equal(await helper.autoDetectServer(), "http://192.168.1.108:25500");
});
