import config from "@/shared-ui/config";
import createSocket from "@/utils/socket-io";
import {
  createRTCCall,
  getRTCCall,
  listRTCCallHistory,
  readAuthorizationHeader,
  updateRTCCallStatus,
} from "@/shared-ui/api.js";
import { createConsumerUserRTCContactBindings } from "../../packages/mobile-core/src/consumer-rtc-contact-shell.js";
import {
  getCachedRTCRuntimeSettings,
  loadRTCRuntimeSettings,
} from "./rtc-runtime.js";

const {
  canUseUserRTCContact,
  startUserRTCCall,
  connectUserRTCSignalSession,
  updateUserRTCCall,
  fetchUserRTCCall,
  fetchUserRTCCallHistory,
  ensureUserRTCInviteBridge,
  disconnectUserRTCInviteBridge,
} = createConsumerUserRTCContactBindings({
  config,
  clientKind: "uni-user",
  readAuthorizationHeader,
  createRTCCall,
  getRTCCall,
  listRTCCallHistory,
  updateRTCCallStatus,
  createSocket,
  getCachedRTCRuntimeSettings,
  loadRTCRuntimeSettings,
});

export { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings };
export {
  canUseUserRTCContact,
  startUserRTCCall,
  connectUserRTCSignalSession,
  updateUserRTCCall,
  fetchUserRTCCall,
  fetchUserRTCCallHistory,
  ensureUserRTCInviteBridge,
  disconnectUserRTCInviteBridge,
};
