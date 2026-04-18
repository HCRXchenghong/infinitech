import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerAppBootstrap } from "./consumer-app-bootstrap.js";

test("consumer app bootstrap initializes startup tasks once and syncs bridges after verification", async () => {
  const calls = [];
  const lifecycle = createConsumerAppBootstrap({
    checkAndClearCacheIfNeeded() {
      calls.push("clearCache");
    },
    setupRequestInterceptor() {
      calls.push("setupRequestInterceptor");
    },
    startPushEventBridge: async () => {
      calls.push("startPushEventBridge");
    },
    configWizard: async () => {
      calls.push("configWizard");
    },
    shouldRunConfigWizard: true,
    getSyncService() {
      return {
        async init() {
          calls.push("syncInit");
        },
      };
    },
    verifySession: async () => {
      calls.push("verifySession");
      return true;
    },
    syncBridges: async () => {
      calls.push("syncBridges");
      return true;
    },
  });

  assert.equal(await lifecycle.bootstrapConsumerApp(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(calls, [
    "clearCache",
    "setupRequestInterceptor",
    "syncInit",
    "verifySession",
    "startPushEventBridge",
    "configWizard",
    "syncBridges",
  ]);

  calls.length = 0;
  assert.equal(await lifecycle.bootstrapConsumerApp(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(calls, ["clearCache", "verifySession", "syncBridges"]);
});

test("consumer app bootstrap tears bridges down when verification fails", async () => {
  const calls = [];
  const lifecycle = createConsumerAppBootstrap({
    verifySession: async () => false,
    teardownBridges() {
      calls.push("teardownBridges");
    },
  });

  assert.equal(await lifecycle.bootstrapConsumerApp(), false);
  assert.deepEqual(calls, ["teardownBridges"]);
});

test("consumer app bootstrap handles app show and logs background failures", async () => {
  const errors = [];
  const calls = [];
  const lifecycle = createConsumerAppBootstrap({
    startPushEventBridge: async () => {
      throw new Error("push failed");
    },
    configWizard: async () => {
      throw new Error("wizard failed");
    },
    shouldRunConfigWizard: true,
    getSyncService() {
      return {
        async init() {
          throw new Error("sync failed");
        },
      };
    },
    verifySession: async () => true,
    syncBridges: async () => {
      calls.push("syncBridges");
      return true;
    },
    logger: {
      error(...args) {
        errors.push(args.join(" "));
      },
    },
  });

  await lifecycle.bootstrapConsumerApp();
  await Promise.resolve();
  await Promise.resolve();
  await lifecycle.handleConsumerAppShow();

  assert.deepEqual(calls, ["syncBridges", "syncBridges"]);
  assert.equal(errors.length, 3);
  assert.equal(
    errors.some((entry) => /push event bridge failed:/.test(entry)),
    true,
  );
  assert.equal(
    errors.some((entry) => /config wizard failed:/.test(entry)),
    true,
  );
  assert.equal(
    errors.some((entry) => /sync service init failed:/.test(entry)),
    true,
  );
});
