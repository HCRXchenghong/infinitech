import {
  createPlatformRuntimeLoader,
  findRiderRankLevel,
} from "./platform-runtime.js";
import {
  createSupportRuntimeStore,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
} from "./support-runtime.js";

function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function resolveFetchRuntimeSettings(fetchRuntimeSettings) {
  return typeof fetchRuntimeSettings === "function"
    ? fetchRuntimeSettings
    : async () => ({});
}

export const DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS = Object.freeze({
  ...DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  aboutSummary: "骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。",
});

export function resolveRoleSupportRuntimeDefaultSettings(role, defaultSettings = {}) {
  const normalizedRole = trimValue(role);
  const baseDefaults =
    normalizedRole === "rider"
      ? DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS
      : DEFAULT_SUPPORT_RUNTIME_SETTINGS;

  return {
    ...baseDefaults,
    ...(defaultSettings && typeof defaultSettings === "object" ? defaultSettings : {}),
  };
}

export function createDefaultRolePlatformRuntimeBindings(options = {}) {
  const createPlatformRuntimeLoaderImpl =
    options.createPlatformRuntimeLoaderImpl || createPlatformRuntimeLoader;

  return createPlatformRuntimeLoaderImpl(
    resolveFetchRuntimeSettings(options.fetchRuntimeSettings),
  );
}

export function createDefaultRoleSupportRuntimeBindings(options = {}) {
  const createSupportRuntimeStoreImpl =
    options.createSupportRuntimeStoreImpl || createSupportRuntimeStore;

  return createSupportRuntimeStoreImpl({
    fetchRuntimeSettings: resolveFetchRuntimeSettings(options.fetchRuntimeSettings),
    defaultSettings: resolveRoleSupportRuntimeDefaultSettings(
      options.role,
      options.defaultSettings,
    ),
  });
}

export {
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  findRiderRankLevel,
};
