import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultRolePushRegistrationBindings,
  createDefaultRoleRealtimeNotifyBindings,
} from "./role-notify-shell.js";

test("role notify shell derives push registration defaults from config", () => {
  let managerOptions = null;

  const bindings = createDefaultRolePushRegistrationBindings({
    config: { isDev: true },
    role: "merchant",
    userType: "merchant",
    storageKey: "merchant_push_state",
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
  assert.equal(managerOptions.storageKey, "merchant_push_state");
});

test("role notify shell respects explicit push registration overrides", () => {
  let managerOptions = null;

  createDefaultRolePushRegistrationBindings({
    config: { isDev: false },
    getAppEnv: () => "custom",
    role: "rider",
    userType: "rider",
    storageKey: "rider_push_state",
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

test("role notify shell derives realtime defaults from config", () => {
  let bridgeOptions = null;

  const bindings = createDefaultRoleRealtimeNotifyBindings({
    config: { SOCKET_URL: "https://socket.example.com" },
    role: "merchant",
    userType: "merchant",
    storageKey: "merchant_realtime_state",
    loggerTag: "MerchantRealtimeNotify",
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
  assert.equal(bridgeOptions.loggerTag, "MerchantRealtimeNotify");
});

test("role notify shell respects explicit realtime overrides", () => {
  let bridgeOptions = null;

  createDefaultRoleRealtimeNotifyBindings({
    config: { SOCKET_URL: "https://socket.example.com" },
    getSocketURL: () => "https://override.example.com",
    role: "rider",
    userType: "rider",
    storageKey: "rider_realtime_state",
    loggerTag: "RiderRealtimeNotify",
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
