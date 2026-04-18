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
import { createConsumerAppBridgeManager } from "../../../packages/mobile-core/src/consumer-app-bridges.js";
import { hasActiveUserSession } from "./session";

const bridgeManager = createConsumerAppBridgeManager({
  hasActiveSession: hasActiveUserSession,
  registerCurrentPushDevice,
  clearPushRegistrationState,
  connectCurrentRealtimeChannel,
  clearRealtimeState,
  ensureUserRTCInviteBridge,
  disconnectUserRTCInviteBridge,
  loggerTag: "App",
});

export const {
  syncBridges: syncUserBridges,
  teardownBridges: teardownUserBridges,
} = bridgeManager;
