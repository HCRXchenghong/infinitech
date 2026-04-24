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
import { createConsumerUserAppRuntimeBindings } from "../../../packages/mobile-core/src/consumer-app-shell.js";

export interface UserSessionSnapshot {
  token: string;
  refreshToken: string;
  authMode: string;
}

const {
  getUserSessionSnapshot,
  hasActiveUserSession,
  clearStoredUserSession,
  verifyUserSession,
  syncUserBridges,
  teardownUserBridges,
  bootstrapUserApp,
  handleUserAppShow,
} = createConsumerUserAppRuntimeBindings({
  config,
  uniApp: uni,
  plusRuntime: (globalThis as any).plus,
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
});

export {
  getUserSessionSnapshot,
  hasActiveUserSession,
  clearStoredUserSession,
  verifyUserSession,
  syncUserBridges,
  teardownUserBridges,
  bootstrapUserApp,
  handleUserAppShow,
};
