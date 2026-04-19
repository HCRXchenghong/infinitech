import { createConsumerAppBootstrap } from "./consumer-app-bootstrap.js";
import { createConsumerAppBridgeManager } from "./consumer-app-bridges.js";
import { createConsumerAppSessionManager } from "./consumer-app-session.js";

export function createConsumerAppRuntime(options = {}) {
  const createSessionManager =
    options.createConsumerAppSessionManagerImpl ||
    createConsumerAppSessionManager;
  const createBridgeManager =
    options.createConsumerAppBridgeManagerImpl ||
    createConsumerAppBridgeManager;
  const createAppBootstrap =
    options.createConsumerAppBootstrapImpl || createConsumerAppBootstrap;

  const sessionManager = createSessionManager({
    uniApp: options.uniApp || globalThis.uni,
    baseUrl: options.baseUrl,
    requiredAuthMode: options.requiredAuthMode,
    manualRefreshToken: options.manualRefreshToken,
    forceLogout: options.forceLogout,
    request: options.request,
    logger: options.logger,
    loggerTag: options.loggerTag,
    tokenStorageKey: options.tokenStorageKey,
    refreshTokenStorageKey: options.refreshTokenStorageKey,
    tokenExpiresAtStorageKey: options.tokenExpiresAtStorageKey,
    profileStorageKey: options.profileStorageKey,
    authModeStorageKey: options.authModeStorageKey,
  });

  const verifySession = options.verifySession || sessionManager.verifySession;

  const bridgeManager = createBridgeManager({
    hasActiveSession: options.hasActiveSession || sessionManager.hasActiveSession,
    registerCurrentPushDevice: options.registerCurrentPushDevice,
    clearPushRegistrationState: options.clearPushRegistrationState,
    connectCurrentRealtimeChannel: options.connectCurrentRealtimeChannel,
    clearRealtimeState: options.clearRealtimeState,
    ensureUserRTCInviteBridge: options.ensureUserRTCInviteBridge,
    disconnectUserRTCInviteBridge: options.disconnectUserRTCInviteBridge,
    logger: options.logger,
    loggerTag: options.loggerTag,
  });

  const syncBridges = options.syncBridges || bridgeManager.syncBridges;
  const teardownBridges =
    options.teardownBridges || bridgeManager.teardownBridges;

  const appBootstrap = createAppBootstrap({
    checkAndClearCacheIfNeeded: options.checkAndClearCacheIfNeeded,
    setupRequestInterceptor: options.setupRequestInterceptor,
    startPushEventBridge: options.startPushEventBridge,
    configWizard: options.configWizard,
    shouldRunConfigWizard: options.shouldRunConfigWizard,
    getSyncService: options.getSyncService,
    verifySession,
    syncBridges,
    teardownBridges,
    logger: options.logger,
    loggerTag: options.loggerTag,
  });

  return {
    sessionManager,
    bridgeManager,
    appBootstrap,
    getSessionSnapshot: sessionManager.getSessionSnapshot,
    hasActiveSession: sessionManager.hasActiveSession,
    clearStoredSession: sessionManager.clearStoredSession,
    verifySession,
    syncBridges,
    teardownBridges,
    bootstrapConsumerApp: appBootstrap.bootstrapConsumerApp,
    handleConsumerAppShow: appBootstrap.handleConsumerAppShow,
  };
}
