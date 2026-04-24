import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerAppRootLifecycle,
  createDefaultConsumerUserAppRuntime,
} from "./consumer-app-shell.js";

test("consumer app root lifecycle binds notification sound and shared bootstrap hooks", async () => {
  const calls = [];
  const lifecycle = createConsumerAppRootLifecycle({
    bindNotificationSoundBridge() {
      calls.push("bind");
    },
    async bootstrapConsumerApp() {
      calls.push("launch");
    },
    async handleConsumerAppShow() {
      calls.push("show");
    },
  });

  lifecycle.onLaunch();
  lifecycle.onShow();
  lifecycle.onHide();

  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(calls, ["bind", "launch", "bind", "show"]);
});

test("consumer app root lifecycle tolerates missing shared handlers", () => {
  const lifecycle = createConsumerAppRootLifecycle();

  assert.doesNotThrow(() => lifecycle.onLaunch());
  assert.doesNotThrow(() => lifecycle.onShow());
  assert.doesNotThrow(() => lifecycle.onHide());
});

test("consumer app shell derives default runtime wiring from config and plus runtime", () => {
  let receivedOptions = null;

  const runtime = createDefaultConsumerUserAppRuntime({
    config: {
      API_BASE_URL: "https://api.example.com",
      isDev: true,
    },
    plusRuntime: {},
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
    createConsumerAppSessionManagerImpl(options) {
      receivedOptions = options;
      return {
        getSessionSnapshot() {
          return {};
        },
        hasActiveSession() {
          return true;
        },
        clearStoredSession() {},
        verifySession() {
          return true;
        },
      };
    },
    createConsumerAppBridgeManagerImpl() {
      return {
        syncBridges() {
          return true;
        },
        teardownBridges() {
          return true;
        },
      };
    },
    createConsumerAppBootstrapImpl(options) {
      receivedOptions = { ...receivedOptions, shouldRunConfigWizard: options.shouldRunConfigWizard };
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

  assert.equal(receivedOptions.baseUrl, "https://api.example.com");
  assert.equal(receivedOptions.requiredAuthMode, "user");
  assert.equal(receivedOptions.shouldRunConfigWizard, true);
  assert.equal(typeof runtime.bootstrapConsumerApp, "function");
});

test("consumer app shell respects explicit runtime overrides", () => {
  let receivedOptions = null;

  createDefaultConsumerUserAppRuntime({
    config: {
      API_BASE_URL: "https://api.example.com",
      isDev: true,
    },
    baseUrl: "https://override.example.com",
    requiredAuthMode: "custom-user",
    shouldRunConfigWizard: false,
    createConsumerAppSessionManagerImpl(options) {
      receivedOptions = options;
      return {
        getSessionSnapshot() {
          return {};
        },
        hasActiveSession() {
          return true;
        },
        clearStoredSession() {},
        verifySession() {
          return true;
        },
      };
    },
    createConsumerAppBridgeManagerImpl() {
      return {
        syncBridges() {
          return true;
        },
        teardownBridges() {
          return true;
        },
      };
    },
    createConsumerAppBootstrapImpl(options) {
      receivedOptions = { ...receivedOptions, shouldRunConfigWizard: options.shouldRunConfigWizard };
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

  assert.equal(receivedOptions.baseUrl, "https://override.example.com");
  assert.equal(receivedOptions.requiredAuthMode, "custom-user");
  assert.equal(receivedOptions.shouldRunConfigWizard, false);
});
