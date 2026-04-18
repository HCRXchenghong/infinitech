import { startPushEventBridge } from "../../client-sdk/src/push-events.js";
import {
  createRolePushRegistrationBindings,
  createRoleRealtimeNotifyBindings,
  createRoleStoredAuthIdentityResolver,
} from "../../client-sdk/src/role-notify-bridges.js";
import {
  buildPushNotificationDetailRoute,
  createPushClickUrlResolver,
} from "./push-event-route.js";

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
  return createRoleStoredAuthIdentityResolver(
    {
      ...buildConsumerStoredAuthIdentityResolverOptions(options),
      createStoredAuthIdentityResolverImpl:
        options.createStoredAuthIdentityResolverImpl,
    },
  );
}

export function createConsumerPushRegistrationBindings(options = {}) {
  const resolveAuthIdentity =
    options.resolveAuthIdentity ||
    createConsumerStoredAuthIdentityResolver(options);

  return createRolePushRegistrationBindings({
    storageKey: options.storageKey,
    resolveAuthIdentity,
    registerPushDevice: options.registerPushDevice,
    unregisterPushDevice: options.unregisterPushDevice,
    ackPushMessage: options.ackPushMessage,
    getAppEnv: options.getAppEnv,
    createPushRegistrationManagerImpl: options.createPushRegistrationManagerImpl,
  });
}

export function createConsumerRealtimeNotifyBindings(options = {}) {
  const resolveAuthIdentity =
    options.resolveAuthIdentity ||
    createConsumerStoredAuthIdentityResolver(options);

  return createRoleRealtimeNotifyBindings({
    loggerTag: options.loggerTag,
    storageKey: options.storageKey,
    resolveAuthIdentity,
    getSocketURL: options.getSocketURL,
    createSocket: options.createSocket,
    createRealtimeNotifyBridgeImpl: options.createRealtimeNotifyBridgeImpl,
  });
}

export function createConsumerPushEventBridge(options = {}) {
  const buildFallbackUrl =
    options.buildFallbackUrl || buildPushNotificationDetailRoute;
  const createResolver =
    options.createPushClickUrlResolverImpl || createPushClickUrlResolver;
  const startBridge = options.startPushEventBridgeImpl || startPushEventBridge;
  const resolveClickUrl =
    options.resolveClickUrl ||
    createResolver(options.roles || ["customer", "user"], {
      buildFallbackUrl,
    });

  return function startConsumerPushEventBridge() {
    return startBridge({
      loggerTag: options.loggerTag,
      ackPushMessage: options.ackPushMessage,
      resolveClickUrl,
    });
  };
}
