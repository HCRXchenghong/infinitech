import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerAppErrandRuntimeBindings,
  createConsumerUserErrandRuntimeBindings,
  createDefaultConsumerErrandRuntimeBindings,
} from "./consumer-errand-runtime-shell.js";

test("consumer errand runtime shell defaults to injected uni runtime and scope", async () => {
  let receivedClientScope = null;

  const bindings = createDefaultConsumerErrandRuntimeBindings({
    loadPlatformRuntimeSettings: async () => ({ enabled: true }),
    isErrandServiceEnabled(runtime, serviceKey, clientScope) {
      assert.deepEqual(runtime, { enabled: true });
      assert.equal(serviceKey, "pickup");
      receivedClientScope = clientScope;
      return true;
    },
  });

  assert.equal(await bindings.ensureErrandServiceOpen("pickup"), true);
  assert.equal(receivedClientScope, "user-vue");
});

test("consumer errand runtime shell exposes stable user/app aliases", async () => {
  let observedScopes = [];

  const userBindings = createConsumerUserErrandRuntimeBindings({
    loadPlatformRuntimeSettings: async () => ({ enabled: true }),
    isErrandServiceEnabled(runtime, serviceKey, clientScope) {
      observedScopes.push([serviceKey, clientScope]);
      return true;
    },
  });
  const appBindings = createConsumerAppErrandRuntimeBindings({
    loadPlatformRuntimeSettings: async () => ({ enabled: true }),
    isErrandServiceEnabled(runtime, serviceKey, clientScope) {
      observedScopes.push([serviceKey, clientScope]);
      return true;
    },
  });

  await userBindings.ensureErrandServiceOpen("buy");
  await appBindings.ensureErrandServiceOpen("send");

  assert.deepEqual(observedScopes, [
    ["buy", "user-vue"],
    ["send", "app-mobile"],
  ]);
});
