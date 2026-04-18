import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerAppBridgeManager } from "./consumer-app-bridges.js";

test("consumer app bridge manager tears bridges down when no active session exists", async () => {
  const calls = [];
  const bridgeManager = createConsumerAppBridgeManager({
    hasActiveSession: () => false,
    clearPushRegistrationState() {
      calls.push("clearPush");
    },
    clearRealtimeState() {
      calls.push("clearRealtime");
    },
    disconnectUserRTCInviteBridge() {
      calls.push("disconnectRTC");
    },
  });

  assert.equal(await bridgeManager.syncBridges(), false);
  assert.deepEqual(calls, ["clearPush", "clearRealtime", "disconnectRTC"]);
});

test("consumer app bridge manager syncs all bridges and tolerates individual failures", async () => {
  const calls = [];
  const errors = [];
  const bridgeManager = createConsumerAppBridgeManager({
    hasActiveSession: () => true,
    registerCurrentPushDevice: async () => {
      calls.push("push");
    },
    connectCurrentRealtimeChannel: async () => {
      calls.push("realtime");
      throw new Error("realtime failed");
    },
    ensureUserRTCInviteBridge: async () => {
      calls.push("rtc");
    },
    logger: {
      error(...args) {
        errors.push(args.join(" "));
      },
    },
  });

  assert.equal(await bridgeManager.syncBridges(), true);
  assert.deepEqual(calls, ["push", "realtime", "rtc"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /realtime notify failed:/);
});
