import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerErrandRuntimeBindings } from "./consumer-errand-runtime.js";

test("consumer errand runtime keeps enabled services open", async () => {
  const bindings = createConsumerErrandRuntimeBindings({
    loadPlatformRuntimeSettings: async () => ({ enabled: true }),
    isErrandServiceEnabled(runtime, serviceKey, clientScope) {
      assert.deepEqual(runtime, { enabled: true });
      assert.equal(serviceKey, "buy");
      assert.equal(clientScope, "app-mobile");
      return true;
    },
    clientScope: "app-mobile",
  });

  assert.equal(await bindings.ensureErrandServiceOpen("buy"), true);
});

test("consumer errand runtime redirects when services are disabled", async () => {
  const calls = [];
  const bindings = createConsumerErrandRuntimeBindings({
    uniApp: {
      showToast(payload) {
        calls.push(["toast", payload]);
      },
      navigateBack({ fail }) {
        calls.push(["navigateBack"]);
        fail?.();
      },
      switchTab(payload) {
        calls.push(["switchTab", payload]);
      },
    },
    loadPlatformRuntimeSettings: async () => ({ enabled: false }),
    isErrandServiceEnabled() {
      return false;
    },
    schedule(callback) {
      callback();
    },
  });

  assert.equal(await bindings.ensureErrandServiceOpen("pickup"), false);
  assert.deepEqual(calls, [
    ["toast", { title: "当前服务暂未开放", icon: "none" }],
    ["navigateBack"],
    ["switchTab", { url: "/pages/index/index" }],
  ]);
});
