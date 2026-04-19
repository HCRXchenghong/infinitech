import { startPushEventBridge } from "./push-events.js";

function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function toPascalCase(value) {
  return trimValue(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function createDefaultRolePushEventBridgeStarter(options = {}) {
  const {
    role,
    loggerTag = `${toPascalCase(role) || "Role"}PushBridge`,
    createPushClickUrlResolverImpl,
    createPushEventBridgeImpl = startPushEventBridge,
    resolveClickUrl =
      typeof createPushClickUrlResolverImpl === "function"
        ? createPushClickUrlResolverImpl(role)
        : undefined,
    ...rest
  } = options;

  return function startRolePushEventBridge(optionsOverride = {}) {
    return createPushEventBridgeImpl({
      loggerTag,
      resolveClickUrl,
      ...rest,
      ...optionsOverride,
    });
  };
}
