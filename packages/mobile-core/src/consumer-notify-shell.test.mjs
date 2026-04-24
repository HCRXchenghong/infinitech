import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultConsumerPushEventBridgeStarter,
  createDefaultConsumerPushRegistrationBindings,
  createDefaultConsumerRealtimeNotifyBindings,
} from "./consumer-notify-shell.js";

test("consumer notify shell derives push registration defaults from config", () => {
  let managerOptions = null;

  const bindings = createDefaultConsumerPushRegistrationBindings({
    config: { isDev: true },
    storageKey: "consumer_push_state",
    registerPushDevice: async () => {},
    unregisterPushDevice: async () => {},
    ackPushMessage: async () => {},
    createStoredAuthIdentityResolverImpl() {
      return { type: "resolver" };
    },
    createPushRegistrationManagerImpl(options) {
      managerOptions = options;
      return {
        registerCurrentPushDevice() {},
        unregisterCurrentPushDevice() {},
        clearPushRegistrationState() {},
        getCachedRegistrationState() {
          return null;
        },
        ackPushMessage() {},
      };
    },
  });

  assert.equal(typeof bindings.registerCurrentPushDevice, "function");
  assert.equal(managerOptions.getAppEnv(), "dev");
  assert.equal(managerOptions.storageKey, "consumer_push_state");
});

test("consumer notify shell respects explicit push registration overrides", () => {
  let managerOptions = null;

  createDefaultConsumerPushRegistrationBindings({
    config: { isDev: false },
    getAppEnv: () => "custom",
    storageKey: "consumer_push_state",
    registerPushDevice: async () => {},
    unregisterPushDevice: async () => {},
    ackPushMessage: async () => {},
    createStoredAuthIdentityResolverImpl() {
      return { type: "resolver" };
    },
    createPushRegistrationManagerImpl(options) {
      managerOptions = options;
      return {
        registerCurrentPushDevice() {},
        unregisterCurrentPushDevice() {},
        clearPushRegistrationState() {},
        getCachedRegistrationState() {
          return null;
        },
        ackPushMessage() {},
      };
    },
  });

  assert.equal(managerOptions.getAppEnv(), "custom");
});

test("consumer notify shell derives realtime defaults from config", () => {
  let bridgeOptions = null;

  const bindings = createDefaultConsumerRealtimeNotifyBindings({
    config: { SOCKET_URL: "https://socket.example.com" },
    loggerTag: "UserRealtimeNotify",
    storageKey: "consumer_realtime_state",
    createSocket() {
      return null;
    },
    createStoredAuthIdentityResolverImpl() {
      return { type: "resolver" };
    },
    createRealtimeNotifyBridgeImpl(options) {
      bridgeOptions = options;
      return {
        connectCurrentRealtimeChannel() {},
        disconnectRealtimeChannel() {},
        clearRealtimeState() {},
      };
    },
  });

  assert.equal(typeof bindings.connectCurrentRealtimeChannel, "function");
  assert.equal(bridgeOptions.getSocketURL(), "https://socket.example.com");
  assert.equal(bridgeOptions.loggerTag, "UserRealtimeNotify");
});

test("consumer notify shell respects explicit realtime overrides", () => {
  let bridgeOptions = null;

  createDefaultConsumerRealtimeNotifyBindings({
    config: { SOCKET_URL: "https://socket.example.com" },
    getSocketURL: () => "https://override.example.com",
    loggerTag: "UserRealtimeNotify",
    storageKey: "consumer_realtime_state",
    createSocket() {
      return null;
    },
    createStoredAuthIdentityResolverImpl() {
      return { type: "resolver" };
    },
    createRealtimeNotifyBridgeImpl(options) {
      bridgeOptions = options;
      return {
        connectCurrentRealtimeChannel() {},
        disconnectRealtimeChannel() {},
        clearRealtimeState() {},
      };
    },
  });

  assert.equal(bridgeOptions.getSocketURL(), "https://override.example.com");
});

test("consumer notify shell creates push event starters with overridable options", async () => {
  let receivedOptions = null;

  const startPushEventBridge = createDefaultConsumerPushEventBridgeStarter({
    loggerTag: "UserPushBridge",
    ackPushMessage: async () => {},
    createConsumerPushEventBridgeImpl(options) {
      receivedOptions = options;
      return () => Promise.resolve("started");
    },
  });

  const result = await startPushEventBridge({
    loggerTag: "OverridePushBridge",
  });

  assert.equal(result, "started");
  assert.equal(receivedOptions.loggerTag, "OverridePushBridge");
});
