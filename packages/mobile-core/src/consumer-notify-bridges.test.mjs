import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerStoredAuthIdentityResolverOptions,
  createConsumerPushEventBridge,
  createConsumerPushRegistrationBindings,
  createConsumerRealtimeNotifyBindings,
  createConsumerStoredAuthIdentityResolver,
  DEFAULT_CONSUMER_AUTH_ALLOWED_MODES,
  DEFAULT_CONSUMER_AUTH_ID_SOURCES,
  DEFAULT_CONSUMER_AUTH_TOKEN_KEYS,
} from "./consumer-notify-bridges.js";

test("consumer notify bridge helpers build stable consumer auth resolver options", () => {
  const options = buildConsumerStoredAuthIdentityResolverOptions({
    uniApp: { name: "uni-app" },
  });

  assert.equal(options.uniApp.name, "uni-app");
  assert.deepEqual(
    options.allowedAuthModes,
    DEFAULT_CONSUMER_AUTH_ALLOWED_MODES,
  );
  assert.deepEqual(options.tokenKeys, DEFAULT_CONSUMER_AUTH_TOKEN_KEYS);
  assert.deepEqual(options.idSources, DEFAULT_CONSUMER_AUTH_ID_SOURCES);
  assert.equal(options.profileKey, "userProfile");
  assert.equal(options.role, "user");
  assert.equal(options.userType, "customer");
  assert.notEqual(
    options.idSources,
    DEFAULT_CONSUMER_AUTH_ID_SOURCES,
    "id sources should be cloned",
  );
});

test("consumer notify bridge helpers create consumer auth resolvers with injected factories", () => {
  let receivedOptions = null;

  const resolver = createConsumerStoredAuthIdentityResolver({
    profileKey: "custom-profile",
    createStoredAuthIdentityResolverImpl(options) {
      receivedOptions = options;
      return { type: "resolver" };
    },
  });

  assert.deepEqual(resolver, { type: "resolver" });
  assert.equal(receivedOptions.profileKey, "custom-profile");
  assert.equal(receivedOptions.role, "user");
});

test("consumer notify bridge helpers wire push registration with consumer identity defaults", () => {
  let resolverOptions = null;
  let managerOptions = null;

  const bindings = createConsumerPushRegistrationBindings({
    uniApp: { name: "uni-app" },
    storageKey: "consumer_push_state",
    registerPushDevice: async () => {},
    unregisterPushDevice: async () => {},
    ackPushMessage: async () => {},
    getAppEnv: () => "dev",
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
  assert.equal(resolverOptions.role, "user");
  assert.equal(resolverOptions.userType, "customer");
  assert.equal(managerOptions.storageKey, "consumer_push_state");
  assert.deepEqual(managerOptions.resolveAuthIdentity, { type: "resolver" });
});

test("consumer notify bridge helpers wire realtime notify bridges with shared defaults", () => {
  let bridgeOptions = null;
  const resolver = { type: "resolver" };

  const bridge = createConsumerRealtimeNotifyBindings({
    resolveAuthIdentity: resolver,
    loggerTag: "UserRealtimeNotify",
    storageKey: "consumer_realtime_state",
    getSocketURL: () => "https://socket.example.com",
    createSocket() {
      return null;
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

  assert.equal(typeof bridge.connectCurrentRealtimeChannel, "function");
  assert.equal(bridgeOptions.loggerTag, "UserRealtimeNotify");
  assert.equal(bridgeOptions.storageKey, "consumer_realtime_state");
  assert.equal(bridgeOptions.resolveAuthIdentity, resolver);
  assert.equal(bridgeOptions.getSocketURL(), "https://socket.example.com");
});

test("consumer notify bridge helpers build consumer push event bridges with stable defaults", () => {
  const resolverCalls = [];
  const bridgeCalls = [];
  const startBridge = createConsumerPushEventBridge({
    loggerTag: "UserPushBridge",
    ackPushMessage: async () => {},
    createPushClickUrlResolverImpl(roles, options) {
      resolverCalls.push({ roles, options });
      return (payload) => payload?.route || options.buildFallbackUrl(payload);
    },
    startPushEventBridgeImpl(options) {
      bridgeCalls.push(options);
      return Promise.resolve("started");
    },
  });

  const result = startBridge();

  assert.equal(resolverCalls.length, 1);
  assert.deepEqual(resolverCalls[0].roles, ["customer", "user"]);
  assert.equal(typeof resolverCalls[0].options.buildFallbackUrl, "function");
  assert.equal(bridgeCalls.length, 1);
  assert.equal(bridgeCalls[0].loggerTag, "UserPushBridge");
  assert.equal(typeof bridgeCalls[0].resolveClickUrl, "function");
  assert.equal(result instanceof Promise, true);
});
