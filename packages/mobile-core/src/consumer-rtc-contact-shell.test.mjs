import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerUserRTCContactBindings,
  createDefaultConsumerRTCContactBindings,
} from "./consumer-rtc-contact-shell.js";

test("consumer rtc contact shell derives socket url defaults from config", () => {
  let bridgeOptions = null;

  const bindings = createDefaultConsumerRTCContactBindings({
    config: { SOCKET_URL: "https://socket.example.com" },
    clientKind: "uni-user",
    readAuthorizationHeader() {
      return { Authorization: "Bearer token" };
    },
    createRTCCall: async () => {},
    getRTCCall: async () => {},
    listRTCCallHistory: async () => [],
    updateRTCCallStatus: async () => {},
    createSocket() {
      return null;
    },
    getCachedRTCRuntimeSettings: () => ({ timeout: 30 }),
    loadRTCRuntimeSettings: async () => ({ timeout: 30 }),
    createUniRTCContactBridgeImpl(options) {
      bridgeOptions = options;
      return {
        startRTCCall() {},
      };
    },
  });

  assert.equal(typeof bindings.startRTCCall, "function");
  assert.equal(bridgeOptions.getSocketUrl(), "https://socket.example.com");
  assert.equal(bridgeOptions.clientKind, "uni-user");
});

test("consumer rtc contact shell exposes stable user alias bindings", () => {
  const bindings = createConsumerUserRTCContactBindings({
    getSocketUrl: () => "https://socket.example.com",
    createUniRTCContactBridgeImpl() {
      return {
        canUseCurrentRTCContact() {
          return true;
        },
        startRTCCall() {
          return "started";
        },
        connectRTCSignalSession() {
          return "connected";
        },
        updateRTCCall() {
          return "updated";
        },
        fetchRTCCall() {
          return "call";
        },
        fetchRTCCallHistory() {
          return "history";
        },
        ensureRTCInviteBridge() {
          return "ensured";
        },
        disconnectRTCInviteBridge() {
          return "disconnected";
        },
      };
    },
  });

  assert.equal(bindings.canUseUserRTCContact(), true);
  assert.equal(bindings.startUserRTCCall(), "started");
  assert.equal(bindings.connectUserRTCSignalSession(), "connected");
  assert.equal(bindings.updateUserRTCCall(), "updated");
  assert.equal(bindings.fetchUserRTCCall(), "call");
  assert.equal(bindings.fetchUserRTCCallHistory(), "history");
  assert.equal(bindings.ensureUserRTCInviteBridge(), "ensured");
  assert.equal(bindings.disconnectUserRTCInviteBridge(), "disconnected");
});
