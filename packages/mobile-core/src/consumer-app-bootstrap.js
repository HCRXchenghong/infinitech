function resolveLogger(options = {}) {
  const logger = options.logger;

  if (logger && typeof logger.error === "function") {
    return logger;
  }

  const loggerTag = String(options.loggerTag || "App").trim();
  return {
    error(...args) {
      console.error(`[${loggerTag}]`, ...args);
    },
  };
}

export function createConsumerAppBootstrap(options = {}) {
  const logger = resolveLogger(options);
  const checkAndClearCacheIfNeeded =
    typeof options.checkAndClearCacheIfNeeded === "function"
      ? options.checkAndClearCacheIfNeeded
      : () => {};
  const setupRequestInterceptor =
    typeof options.setupRequestInterceptor === "function"
      ? options.setupRequestInterceptor
      : () => {};
  const startPushEventBridge =
    typeof options.startPushEventBridge === "function"
      ? options.startPushEventBridge
      : async () => {};
  const configWizard =
    typeof options.configWizard === "function"
      ? options.configWizard
      : async () => {};
  const shouldRunConfigWizard = Boolean(options.shouldRunConfigWizard);
  const getSyncService =
    typeof options.getSyncService === "function"
      ? options.getSyncService
      : () => null;
  const verifySession =
    typeof options.verifySession === "function"
      ? options.verifySession
      : async () => true;
  const syncBridges =
    typeof options.syncBridges === "function"
      ? options.syncBridges
      : async () => true;
  const teardownBridges =
    typeof options.teardownBridges === "function"
      ? options.teardownBridges
      : () => {};

  let requestInterceptorInstalled = false;
  let pushBridgeStarted = false;
  let configWizardStarted = false;
  let syncInitPromise = null;

  function runBackgroundTask(name, task) {
    Promise.resolve()
      .then(() => task())
      .catch((error) => {
        logger.error(`${name} failed:`, error);
      });
  }

  function ensureRequestInterceptor() {
    if (requestInterceptorInstalled) {
      return;
    }
    setupRequestInterceptor();
    requestInterceptorInstalled = true;
  }

  function ensurePushEventBridge() {
    if (pushBridgeStarted) {
      return;
    }
    pushBridgeStarted = true;
    runBackgroundTask("push event bridge", startPushEventBridge);
  }

  function ensureConfigWizard() {
    if (!shouldRunConfigWizard || configWizardStarted) {
      return;
    }
    configWizardStarted = true;
    runBackgroundTask("config wizard", configWizard);
  }

  function ensureSyncServiceInitialized() {
    if (!syncInitPromise) {
      const syncService = getSyncService();
      syncInitPromise = Promise.resolve(syncService?.init?.()).catch(
        (error) => {
          logger.error("sync service init failed:", error);
        },
      );
    }
    return syncInitPromise;
  }

  async function bootstrapConsumerApp() {
    checkAndClearCacheIfNeeded();
    ensureRequestInterceptor();
    ensurePushEventBridge();
    ensureConfigWizard();
    void ensureSyncServiceInitialized();

    const verified = await verifySession();
    if (!verified) {
      teardownBridges();
      return false;
    }

    await syncBridges();
    return true;
  }

  async function handleConsumerAppShow() {
    await syncBridges();
  }

  return {
    bootstrapConsumerApp,
    handleConsumerAppShow,
  };
}
