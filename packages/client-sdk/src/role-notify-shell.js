import {
  createRolePushRegistrationBindings,
  createRoleRealtimeNotifyBindings,
} from "./role-notify-bridges.js";

export function createDefaultRolePushRegistrationBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    getAppEnv = () => (config.isDev ? "dev" : "prod"),
    ...rest
  } = options;

  return createRolePushRegistrationBindings({
    uniApp,
    getAppEnv,
    ...rest,
  });
}

export function createDefaultRoleRealtimeNotifyBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    getSocketURL = () => config.SOCKET_URL,
    ...rest
  } = options;

  return createRoleRealtimeNotifyBindings({
    uniApp,
    getSocketURL,
    ...rest,
  });
}
