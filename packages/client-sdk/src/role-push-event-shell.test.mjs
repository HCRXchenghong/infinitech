import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultRolePushEventBridgeStarter } from "./role-push-event-shell.js";

test("role push event shell derives logger tag and click resolver from role", () => {
  let receivedOptions = null;

  const startRolePushEventBridge = createDefaultRolePushEventBridgeStarter({
    role: "merchant",
    ackPushMessage() {},
    createPushClickUrlResolverImpl(role) {
      return (envelope) => `/${role}/${envelope.messageId}`;
    },
    createPushEventBridgeImpl(options) {
      receivedOptions = options;
      return { started: true };
    },
  });

  const bridge = startRolePushEventBridge();

  assert.deepEqual(bridge, { started: true });
  assert.equal(receivedOptions.loggerTag, "MerchantPushBridge");
  assert.equal(
    receivedOptions.resolveClickUrl({ messageId: "notice-1" }),
    "/merchant/notice-1",
  );
});

test("role push event shell respects explicit overrides", () => {
  let receivedOptions = null;

  const startRolePushEventBridge = createDefaultRolePushEventBridgeStarter({
    role: "rider",
    loggerTag: "CustomRiderPushBridge",
    resolveClickUrl() {
      return "/preset";
    },
    ackPushMessage() {},
    createPushEventBridgeImpl(options) {
      receivedOptions = options;
      return { started: true };
    },
  });

  startRolePushEventBridge({
    resolveClickUrl() {
      return "/override";
    },
  });

  assert.equal(receivedOptions.loggerTag, "CustomRiderPushBridge");
  assert.equal(receivedOptions.resolveClickUrl(), "/override");
});
