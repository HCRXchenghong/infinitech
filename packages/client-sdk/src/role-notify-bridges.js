import { createPushRegistrationManager } from "./push-registration.js";
import { createRealtimeNotifyBridge } from "./realtime-notify.js";
import { createStoredAuthIdentityResolver } from "./stored-auth-identity.js";

function cloneList(value, fallback = []) {
  return Array.isArray(value) && value.length > 0
    ? value.slice()
    : fallback.slice();
}

export function buildRoleStoredAuthIdentityResolverOptions(options = {}) {
  return {
    uniApp: options.uniApp || globalThis.uni,
    allowedAuthModes: cloneList(options.allowedAuthModes),
    allowEmptyAuthMode: options.allowEmptyAuthMode === true,
    tokenKeys: cloneList(options.tokenKeys, ["token"]),
    profileKey: String(options.profileKey || ""),
    idSources: cloneList(options.idSources, ["profile:id"]),
    role: String(options.role || ""),
    userType: String(options.userType || ""),
  };
}

export function createRoleStoredAuthIdentityResolver(options = {}) {
  const createResolver =
    options.createStoredAuthIdentityResolverImpl ||
    createStoredAuthIdentityResolver;
  return createResolver(buildRoleStoredAuthIdentityResolverOptions(options));
}

export function createRolePushRegistrationBindings(options = {}) {
  const createManager =
    options.createPushRegistrationManagerImpl || createPushRegistrationManager;
  const resolveAuthIdentity =
    options.resolveAuthIdentity || createRoleStoredAuthIdentityResolver(options);

  return createManager({
    ...options,
    resolveAuthIdentity,
  });
}

export function createRoleRealtimeNotifyBindings(options = {}) {
  const createBridge =
    options.createRealtimeNotifyBridgeImpl || createRealtimeNotifyBridge;
  const resolveAuthIdentity =
    options.resolveAuthIdentity || createRoleStoredAuthIdentityResolver(options);

  return createBridge({
    ...options,
    resolveAuthIdentity,
  });
}
