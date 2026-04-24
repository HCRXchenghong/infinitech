import {
  createConsumerPushEventBridge,
  createConsumerPushRegistrationBindings,
  createConsumerRealtimeNotifyBindings,
} from "./consumer-notify-bridges.js";

export function createDefaultConsumerPushRegistrationBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    getAppEnv = () => (config.isDev ? "dev" : "prod"),
    ...rest
  } = options;

  return createConsumerPushRegistrationBindings({
    uniApp,
    getAppEnv,
    ...rest,
  });
}

export function createConsumerUserPushRegistrationBindings(options = {}) {
  return createDefaultConsumerPushRegistrationBindings({
    storageKey: "user_vue_push_registration",
    ...options,
  });
}

export function createConsumerAppPushRegistrationBindings(options = {}) {
  return createDefaultConsumerPushRegistrationBindings({
    storageKey: "app_mobile_push_registration",
    ...options,
  });
}

export function createDefaultConsumerRealtimeNotifyBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    getSocketURL = () => config.SOCKET_URL,
    ...rest
  } = options;

  return createConsumerRealtimeNotifyBindings({
    uniApp,
    getSocketURL,
    ...rest,
  });
}

export function createConsumerUserRealtimeNotifyBindings(options = {}) {
  return createDefaultConsumerRealtimeNotifyBindings({
    loggerTag: "UserRealtimeNotify",
    storageKey: "user_realtime_notify_state",
    ...options,
  });
}

export function createConsumerAppRealtimeNotifyBindings(options = {}) {
  return createDefaultConsumerRealtimeNotifyBindings({
    loggerTag: "AppRealtimeNotify",
    storageKey: "app_realtime_notify_state",
    ...options,
  });
}

export function createDefaultConsumerPushEventBridgeStarter(options = {}) {
  const {
    createConsumerPushEventBridgeImpl = createConsumerPushEventBridge,
    ...rest
  } = options;

  return function startConsumerPushEventBridge(optionsOverride = {}) {
    return createConsumerPushEventBridgeImpl({
      ...rest,
      ...optionsOverride,
    })();
  };
}

export function createConsumerUserPushEventBridgeStarter(options = {}) {
  return createDefaultConsumerPushEventBridgeStarter({
    loggerTag: "UserPushBridge",
    ...options,
  });
}

export function createConsumerAppPushEventBridgeStarter(options = {}) {
  return createDefaultConsumerPushEventBridgeStarter({
    loggerTag: "AppMobilePushBridge",
    ...options,
  });
}
