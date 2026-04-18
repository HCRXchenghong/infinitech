import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerRTCContactBindings,
  resolveCurrentConsumerUserId,
} from "./consumer-rtc-contact.js";

test("consumer rtc contact helpers resolve current consumer ids from stored profiles", () => {
  assert.equal(
    resolveCurrentConsumerUserId({
      getStorageSync() {
        return {
          phone: " 13800000000 ",
          id: "user-1",
        };
      },
    }),
    "13800000000",
  );
  assert.equal(
    resolveCurrentConsumerUserId({
      getStorageSync() {
        return {
          id: " user-2 ",
        };
      },
    }),
    "user-2",
  );
});

test("consumer rtc contact helpers wire shared rtc bridge defaults", () => {
  let bridgeOptions = null;

  const bindings = createConsumerRTCContactBindings({
    uniApp: { getStorageSync() {} },
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
    getSocketUrl: () => "https://socket.example.com",
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
  assert.equal(bridgeOptions.role, "user");
  assert.equal(bridgeOptions.authMode, "user");
  assert.equal(bridgeOptions.clientKind, "uni-user");
  assert.equal(typeof bridgeOptions.resolveCurrentUserId, "function");
  assert.equal(bridgeOptions.getSocketUrl(), "https://socket.example.com");
});
