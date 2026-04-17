import test from "node:test";
import assert from "node:assert/strict";

import { createMobileConfigRuntime } from "./mobile-config.js";

function createMockUniStorage(initialState = {}) {
  const state = new Map(Object.entries(initialState));
  return {
    getStorageSync(key) {
      return state.get(key);
    },
    setStorageSync(key, value) {
      state.set(key, value);
    },
  };
}

test("mobile config runtime uses development defaults and last local ip", () => {
  const uniApp = createMockUniStorage({
    dev_local_ip: "192.168.1.120",
  });

  const runtime = createMobileConfigRuntime({
    uniApp,
    processEnv: {
      NODE_ENV: "development",
    },
  });

  assert.deepEqual(runtime.getConfig(), {
    API_BASE_URL: "http://192.168.1.120:25500",
    SOCKET_URL: "http://192.168.1.120:9898",
    isDev: true,
    TIMEOUT: 30000,
  });
});

test("mobile config runtime normalizes direct go endpoints to bff endpoints", () => {
  const warnings = [];
  const runtime = createMobileConfigRuntime({
    warn(message) {
      warnings.push(message);
    },
  });

  const updated = runtime.updateConfig({
    API_BASE_URL: "http://127.0.0.1:1029",
    SOCKET_URL: "http://127.0.0.1:9898",
  });

  assert.equal(updated.API_BASE_URL, "http://127.0.0.1:25500");
  assert.equal(warnings.length, 1);
});

test("mobile config runtime respects production env and manifest overrides", () => {
  const runtime = createMobileConfigRuntime({
    processEnv: {
      NODE_ENV: "production",
    },
  });

  assert.equal(runtime.getConfig().API_BASE_URL, "https://api.yuexiang.com");
  runtime.setManifest({
    "app-plus": {
      config: {
        API_BASE_URL: "https://edge.example.com",
        SOCKET_URL: "https://socket.example.com",
      },
    },
  });

  assert.deepEqual(runtime.getConfig(), {
    API_BASE_URL: "https://edge.example.com",
    SOCKET_URL: "https://socket.example.com",
    isDev: false,
    TIMEOUT: 30000,
  });
});
