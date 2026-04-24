import { createConsumerAppRuntime } from "./consumer-app-runtime.js";

function callConsumerAppShellHandler(handler, context) {
  if (typeof handler === "function") {
    return handler.call(context);
  }
  return undefined;
}

export function createConsumerAppRootLifecycle(options = {}) {
  const {
    bindNotificationSoundBridge,
    bootstrapConsumerApp,
    handleConsumerAppShow,
  } = options;

  return {
    onLaunch() {
      callConsumerAppShellHandler(bindNotificationSoundBridge, this);
      void callConsumerAppShellHandler(bootstrapConsumerApp, this);
    },
    onShow() {
      callConsumerAppShellHandler(bindNotificationSoundBridge, this);
      void callConsumerAppShellHandler(handleConsumerAppShow, this);
    },
    onHide() {},
  };
}

export function createDefaultConsumerUserAppRuntime(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    plusRuntime = globalThis.plus,
    logger = console,
    loggerTag = "App",
    requiredAuthMode = "user",
    ...rest
  } = options;

  return createConsumerAppRuntime({
    uniApp,
    baseUrl: rest.baseUrl || config.API_BASE_URL,
    requiredAuthMode,
    logger,
    loggerTag,
    shouldRunConfigWizard:
      rest.shouldRunConfigWizard !== undefined
        ? rest.shouldRunConfigWizard
        : Boolean(config.isDev) && typeof plusRuntime !== "undefined",
    ...rest,
  });
}

export function createConsumerUserAppRuntimeBindings(options = {}) {
  const appRuntime = createDefaultConsumerUserAppRuntime(options);

  return {
    appRuntime,
    getUserSessionSnapshot: appRuntime.getSessionSnapshot,
    hasActiveUserSession: appRuntime.hasActiveSession,
    clearStoredUserSession: appRuntime.clearStoredSession,
    verifyUserSession: appRuntime.verifySession,
    syncUserBridges: appRuntime.syncBridges,
    teardownUserBridges: appRuntime.teardownBridges,
    bootstrapUserApp: appRuntime.bootstrapConsumerApp,
    handleUserAppShow: appRuntime.handleConsumerAppShow,
  };
}
