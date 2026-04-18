import { createPushRegistrationManager } from "../../client-sdk/src/push-registration.js";
import { createRealtimeNotifyBridge } from "../../client-sdk/src/realtime-notify.js";
import { createStoredAuthIdentityResolver } from "../../client-sdk/src/stored-auth-identity.js";

export const DEFAULT_CONSUMER_AUTH_ALLOWED_MODES = ["user"];
export const DEFAULT_CONSUMER_AUTH_TOKEN_KEYS = ["token"];
export const DEFAULT_CONSUMER_AUTH_ID_SOURCES = [
  "profile:id",
  "profile:userId",
  "profile:user_id",
  "storage:userId",
  "storage:user_id",
  "profile:phone",
];

function cloneList(value, fallback) {
  return Array.isArray(value) && value.length > 0
    ? value.slice()
    : fallback.slice();
}

export function buildConsumerStoredAuthIdentityResolverOptions(options = {}) {
  return {
    uniApp: options.uniApp || globalThis.uni,
    allowedAuthModes: cloneList(
      options.allowedAuthModes,
      DEFAULT_CONSUMER_AUTH_ALLOWED_MODES,
    ),
    allowEmptyAuthMode: options.allowEmptyAuthMode !== false,
    tokenKeys: cloneList(options.tokenKeys, DEFAULT_CONSUMER_AUTH_TOKEN_KEYS),
    profileKey: String(options.profileKey || "userProfile"),
    idSources: cloneList(options.idSources, DEFAULT_CONSUMER_AUTH_ID_SOURCES),
    role: String(options.role || "user"),
    userType: String(options.userType || "customer"),
  };
}

export function createConsumerStoredAuthIdentityResolver(options = {}) {
  const createResolver =
    options.createStoredAuthIdentityResolverImpl ||
    createStoredAuthIdentityResolver;
  return createResolver(
    buildConsumerStoredAuthIdentityResolverOptions(options),
  );
}

export function createConsumerPushRegistrationBindings(options = {}) {
  const createManager =
    options.createPushRegistrationManagerImpl || createPushRegistrationManager;
  const resolveAuthIdentity =
    options.resolveAuthIdentity ||
    createConsumerStoredAuthIdentityResolver(options);

  return createManager({
    storageKey: options.storageKey,
    resolveAuthIdentity,
    registerPushDevice: options.registerPushDevice,
    unregisterPushDevice: options.unregisterPushDevice,
    ackPushMessage: options.ackPushMessage,
    getAppEnv: options.getAppEnv,
  });
}

export function createConsumerRealtimeNotifyBindings(options = {}) {
  const createBridge =
    options.createRealtimeNotifyBridgeImpl || createRealtimeNotifyBridge;
  const resolveAuthIdentity =
    options.resolveAuthIdentity ||
    createConsumerStoredAuthIdentityResolver(options);

  return createBridge({
    loggerTag: options.loggerTag,
    storageKey: options.storageKey,
    resolveAuthIdentity,
    getSocketURL: options.getSocketURL,
    createSocket: options.createSocket,
  });
}
