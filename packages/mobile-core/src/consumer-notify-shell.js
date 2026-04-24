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
