import { createUniRTCContactBridge } from "../../client-sdk/src/rtc-contact.js";
import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

function trimValue(value) {
  return String(value || "").trim();
}

export function resolveCurrentConsumerUserId(uniApp = globalThis.uni) {
  const profile = readConsumerStoredProfile({ uniApp });
  return trimValue(profile.phone || profile.id || profile.userId);
}

export function createConsumerRTCContactBindings(options = {}) {
  const createBridge =
    options.createUniRTCContactBridgeImpl || createUniRTCContactBridge;
  const uniApp = options.uniApp || globalThis.uni;
  const resolveCurrentUserId =
    options.resolveCurrentUserId ||
    (() => resolveCurrentConsumerUserId(uniApp));

  return createBridge({
    uniApp,
    role: options.role || "user",
    authMode: options.authMode || "user",
    clientKind: options.clientKind,
    resolveCurrentUserId,
    readAuthorizationHeader: options.readAuthorizationHeader,
    createRTCCall: options.createRTCCall,
    getRTCCall: options.getRTCCall,
    listRTCCallHistory: options.listRTCCallHistory,
    updateRTCCallStatus: options.updateRTCCallStatus,
    createSocket: options.createSocket,
    getSocketUrl: options.getSocketUrl,
    getCachedRTCRuntimeSettings: options.getCachedRTCRuntimeSettings,
    loadRTCRuntimeSettings: options.loadRTCRuntimeSettings,
  });
}
