import { createConsumerRTCContactBindings } from "./consumer-rtc-contact.js";

export function createDefaultConsumerRTCContactBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    getSocketUrl = () => config.SOCKET_URL,
    ...rest
  } = options;

  return createConsumerRTCContactBindings({
    uniApp,
    getSocketUrl,
    ...rest,
  });
}

export function createConsumerUserRTCContactBindings(options = {}) {
  const bindings = createDefaultConsumerRTCContactBindings(options);

  return {
    bindings,
    canUseUserRTCContact: bindings.canUseCurrentRTCContact,
    startUserRTCCall: bindings.startRTCCall,
    connectUserRTCSignalSession: bindings.connectRTCSignalSession,
    updateUserRTCCall: bindings.updateRTCCall,
    fetchUserRTCCall: bindings.fetchRTCCall,
    fetchUserRTCCallHistory: bindings.fetchRTCCallHistory,
    ensureUserRTCInviteBridge: bindings.ensureRTCInviteBridge,
    disconnectUserRTCInviteBridge: bindings.disconnectRTCInviteBridge,
  };
}
