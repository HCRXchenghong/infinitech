import test from "node:test";
import assert from "node:assert/strict";

import { createConsumerAppRuntime } from "./consumer-app-runtime.js";

test("consumer app runtime wires session, bridge, and bootstrap managers together", () => {
  const calls = [];
  let sessionOptions = null;
  let bridgeOptions = null;
  let bootstrapOptions = null;

  const runtime = createConsumerAppRuntime({
    baseUrl: "https://api.example.com",
    requiredAuthMode: "user",
    manualRefreshToken() {},
    forceLogout() {},
    registerCurrentPushDevice() {},
    clearPushRegistrationState() {},
    connectCurrentRealtimeChannel() {},
    clearRealtimeState() {},
    ensureUserRTCInviteBridge() {},
    disconnectUserRTCInviteBridge() {},
    checkAndClearCacheIfNeeded() {},
    setupRequestInterceptor() {},
    startPushEventBridge() {},
    configWizard() {},
    getSyncService() {
      return null;
    },
    loggerTag: "App",
    createConsumerAppSessionManagerImpl(options) {
      sessionOptions = options;
      return {
        getSessionSnapshot() {
          calls.push("getSessionSnapshot");
          return { token: "token" };
        },
        hasActiveSession() {
          calls.push("hasActiveSession");
          return true;
        },
        clearStoredSession() {
          calls.push("clearStoredSession");
        },
        verifySession() {
          calls.push("verifySession");
          return true;
        },
      };
    },
    createConsumerAppBridgeManagerImpl(options) {
      bridgeOptions = options;
      return {
        syncBridges() {
          calls.push("syncBridges");
          return true;
        },
        teardownBridges() {
          calls.push("teardownBridges");
          return true;
        },
      };
    },
    createConsumerAppBootstrapImpl(options) {
      bootstrapOptions = options;
      return {
        bootstrapConsumerApp() {
          calls.push("bootstrapConsumerApp");
          return true;
        },
        handleConsumerAppShow() {
          calls.push("handleConsumerAppShow");
          return true;
        },
      };
    },
  });

  assert.equal(sessionOptions.baseUrl, "https://api.example.com");
  assert.equal(bridgeOptions.hasActiveSession, runtime.hasActiveSession);
  assert.equal(bootstrapOptions.verifySession, runtime.verifySession);
  assert.equal(bootstrapOptions.syncBridges, runtime.syncBridges);
  assert.equal(bootstrapOptions.teardownBridges, runtime.teardownBridges);

  runtime.getSessionSnapshot();
  runtime.hasActiveSession();
  runtime.clearStoredSession();
  runtime.verifySession();
  runtime.syncBridges();
  runtime.teardownBridges();
  runtime.bootstrapConsumerApp();
  runtime.handleConsumerAppShow();

  assert.deepEqual(calls, [
    "getSessionSnapshot",
    "hasActiveSession",
    "clearStoredSession",
    "verifySession",
    "syncBridges",
    "teardownBridges",
    "bootstrapConsumerApp",
    "handleConsumerAppShow",
  ]);
});

test("consumer app runtime respects explicit verify and bridge overrides", () => {
  const verifySession = () => "custom-verify";
  const syncBridges = () => "custom-sync";
  const teardownBridges = () => "custom-teardown";
  let bootstrapOptions = null;

  const runtime = createConsumerAppRuntime({
    verifySession,
    syncBridges,
    teardownBridges,
    createConsumerAppSessionManagerImpl() {
      return {
        getSessionSnapshot() {
          return {};
        },
        hasActiveSession() {
          return true;
        },
        clearStoredSession() {},
        verifySession() {
          return "session-verify";
        },
      };
    },
    createConsumerAppBridgeManagerImpl() {
      return {
        syncBridges() {
          return "bridge-sync";
        },
        teardownBridges() {
          return "bridge-teardown";
        },
      };
    },
    createConsumerAppBootstrapImpl(options) {
      bootstrapOptions = options;
      return {
        bootstrapConsumerApp() {
          return true;
        },
        handleConsumerAppShow() {
          return true;
        },
      };
    },
  });

  assert.equal(runtime.verifySession, verifySession);
  assert.equal(runtime.syncBridges, syncBridges);
  assert.equal(runtime.teardownBridges, teardownBridges);
  assert.equal(bootstrapOptions.verifySession, verifySession);
  assert.equal(bootstrapOptions.syncBridges, syncBridges);
  assert.equal(bootstrapOptions.teardownBridges, teardownBridges);
});
