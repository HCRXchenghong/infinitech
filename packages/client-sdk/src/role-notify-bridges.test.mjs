import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleStoredAuthIdentityResolverOptions,
  createRolePushRegistrationBindings,
  createRoleRealtimeNotifyBindings,
  createRoleStoredAuthIdentityResolver,
} from "./role-notify-bridges.js";

test("role notify bridge helpers build stable role auth resolver options", () => {
  const options = buildRoleStoredAuthIdentityResolverOptions({
    uniApp: { name: "uni-app" },
    allowedAuthModes: ["merchant"],
    tokenKeys: ["token", "access_token"],
    profileKey: "merchantProfile",
    idSources: ["profile:id", "storage:merchantId"],
    role: "merchant",
    userType: "merchant",
  });

  assert.equal(options.uniApp.name, "uni-app");
  assert.deepEqual(options.allowedAuthModes, ["merchant"]);
  assert.deepEqual(options.tokenKeys, ["token", "access_token"]);
  assert.deepEqual(options.idSources, ["profile:id", "storage:merchantId"]);
  assert.equal(options.profileKey, "merchantProfile");
  assert.equal(options.role, "merchant");
  assert.equal(options.userType, "merchant");
});

test("role notify bridge helpers create stored auth resolver with injected factory", () => {
  let receivedOptions = null;

  const resolver = createRoleStoredAuthIdentityResolver({
    role: "rider",
    profileKey: "riderProfile",
    createStoredAuthIdentityResolverImpl(options) {
      receivedOptions = options;
      return { type: "resolver" };
    },
  });

  assert.deepEqual(resolver, { type: "resolver" });
  assert.equal(receivedOptions.role, "rider");
  assert.equal(receivedOptions.profileKey, "riderProfile");
});

test("role notify bridge helpers wire push registration bindings with role resolver", () => {
  let resolverOptions = null;
  let managerOptions = null;

  const bindings = createRolePushRegistrationBindings({
    uniApp: { name: "uni-app" },
    role: "merchant",
    userType: "merchant",
    storageKey: "merchant_push_state",
    createStoredAuthIdentityResolverImpl(options) {
      resolverOptions = options;
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
  assert.equal(resolverOptions.role, "merchant");
  assert.equal(managerOptions.storageKey, "merchant_push_state");
  assert.deepEqual(managerOptions.resolveAuthIdentity, { type: "resolver" });
});

test("role notify bridge helpers wire realtime bindings with role resolver", () => {
  let bridgeOptions = null;

  const bindings = createRoleRealtimeNotifyBindings({
    role: "rider",
    userType: "rider",
    loggerTag: "RiderRealtimeNotify",
    storageKey: "rider_realtime_state",
    getSocketURL: () => "https://socket.example.com",
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
  assert.equal(bridgeOptions.loggerTag, "RiderRealtimeNotify");
  assert.equal(bridgeOptions.storageKey, "rider_realtime_state");
  assert.equal(bridgeOptions.getSocketURL(), "https://socket.example.com");
  assert.deepEqual(bridgeOptions.resolveAuthIdentity, { type: "resolver" });
});
