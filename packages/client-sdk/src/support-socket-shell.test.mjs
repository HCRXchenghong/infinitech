import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultSupportSocketBridge } from "./support-socket-shell.js";

test("default support socket shell forwards createSocket and config bindings", () => {
  let receivedOptions = null;
  const sentinelBridge = { type: "support-socket-bridge" };

  const bridge = createDefaultSupportSocketBridge({
    createSocket() {},
    config: {
      SOCKET_URL: "https://socket.example.com",
    },
    namespace: "/ops",
    createConfiguredSupportSocketBridgeImpl(options) {
      receivedOptions = options;
      return sentinelBridge;
    },
  });

  assert.equal(bridge, sentinelBridge);
  assert.equal(typeof receivedOptions.createSocket, "function");
  assert.deepEqual(receivedOptions.config, {
    SOCKET_URL: "https://socket.example.com",
  });
  assert.equal(receivedOptions.namespace, "/ops");
});
