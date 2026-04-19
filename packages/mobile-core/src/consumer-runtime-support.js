import {
  DEFAULT_RTC_RUNTIME_SETTINGS,
  createRTCRuntimeSettingsLoader,
} from "../../client-sdk/src/rtc-runtime.js";
import { getMobileClientId } from "./mobile-client-context.js";
import { createConsumerLegalRuntimeStore } from "./consumer-legal-runtime.js";
import {
  buildHomeCategoriesForClient,
  createPlatformRuntimeLoader,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled,
} from "./platform-runtime.js";
import {
  createSupportRuntimeStore,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
} from "./support-runtime.js";

function resolveFetchRuntimeSettings(fetchRuntimeSettings) {
  return typeof fetchRuntimeSettings === "function"
    ? fetchRuntimeSettings
    : async () => ({});
}

export {
  buildHomeCategoriesForClient,
  DEFAULT_RTC_RUNTIME_SETTINGS,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled,
};

export function createConsumerPlatformRuntimeBindings(fetchRuntimeSettings) {
  return createPlatformRuntimeLoader(resolveFetchRuntimeSettings(fetchRuntimeSettings));
}

export function createConsumerSupportRuntimeBindings(fetchRuntimeSettings) {
  return createSupportRuntimeStore({
    fetchRuntimeSettings: resolveFetchRuntimeSettings(fetchRuntimeSettings),
  });
}

export function createConsumerLegalRuntimeBindings(fetchRuntimeSettings) {
  return createConsumerLegalRuntimeStore({
    fetchRuntimeSettings: resolveFetchRuntimeSettings(fetchRuntimeSettings),
  });
}

export function createConsumerRTCRuntimeBindings(fetchRuntimeSettings) {
  return createRTCRuntimeSettingsLoader(resolveFetchRuntimeSettings(fetchRuntimeSettings));
}

export async function ensureConsumerRuntimeFeatureOpen(featureKey, options = {}) {
  const loadPlatformRuntimeSettings =
    typeof options.loadPlatformRuntimeSettings === "function"
      ? options.loadPlatformRuntimeSettings
      : async () => ({});
  const checkRuntimeRouteEnabled =
    typeof options.isRuntimeRouteEnabled === "function"
      ? options.isRuntimeRouteEnabled
      : isRuntimeRouteEnabled;
  const clientScope = String(options.clientScope || getMobileClientId()).trim();
  const uniApp = options.uniApp || globalThis.uni;
  const setTimeoutImpl =
    typeof options.setTimeoutImpl === "function" ? options.setTimeoutImpl : globalThis.setTimeout;
  const unavailableMessage = String(options.unavailableMessage || "当前服务暂未开放").trim()
    || "当前服务暂未开放";
  const fallbackTabUrl = String(options.fallbackTabUrl || "/pages/index/index").trim()
    || "/pages/index/index";
  const navigationDelayMs = Math.max(0, Number(options.navigationDelayMs || 500));

  const runtime = await loadPlatformRuntimeSettings();
  const enabled = checkRuntimeRouteEnabled(runtime, "feature", featureKey, clientScope);

  if (!enabled) {
    uniApp?.showToast?.({ title: unavailableMessage, icon: "none" });
    setTimeoutImpl(() => {
      uniApp?.navigateBack?.({
        fail: () => {
          uniApp?.switchTab?.({ url: fallbackTabUrl });
        },
      });
    }, navigationDelayMs);
  }

  return enabled;
}
