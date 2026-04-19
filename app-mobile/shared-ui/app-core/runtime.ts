import getSyncService from "../sync";
import { configWizard } from "../config-helper";
import config from "../config";
import { setupRequestInterceptor, forceLogout, manualRefreshToken } from "../request-interceptor";
import { checkAndClearCacheIfNeeded } from "../cache-cleaner";
import { startPushEventBridge } from "../push-events";
import {
  clearPushRegistrationState,
  registerCurrentPushDevice,
} from "../push-registration";
import {
  clearRealtimeState,
  connectCurrentRealtimeChannel,
} from "../realtime-notify";
import {
  disconnectUserRTCInviteBridge,
  ensureUserRTCInviteBridge,
} from "../rtc-contact.js";
import { createConsumerAppRuntime } from "../../../packages/mobile-core/src/consumer-app-runtime.js";

export interface UserSessionSnapshot {
  token: string;
  refreshToken: string;
  authMode: string;
}

const appRuntime = createConsumerAppRuntime({
  uniApp: uni,
  baseUrl: config.API_BASE_URL,
  requiredAuthMode: "user",
  manualRefreshToken,
  forceLogout,
  checkAndClearCacheIfNeeded,
  setupRequestInterceptor,
  startPushEventBridge,
  configWizard,
  shouldRunConfigWizard:
    config.isDev && typeof (globalThis as any).plus !== "undefined",
  getSyncService,
  registerCurrentPushDevice,
  clearPushRegistrationState,
  connectCurrentRealtimeChannel,
  clearRealtimeState,
  ensureUserRTCInviteBridge,
  disconnectUserRTCInviteBridge,
  loggerTag: "App",
});

export const {
  getSessionSnapshot: getUserSessionSnapshot,
  hasActiveSession: hasActiveUserSession,
  clearStoredSession: clearStoredUserSession,
  verifySession: verifyUserSession,
  syncBridges: syncUserBridges,
  teardownBridges: teardownUserBridges,
  bootstrapConsumerApp: bootstrapUserApp,
  handleConsumerAppShow: handleUserAppShow,
} = appRuntime;
