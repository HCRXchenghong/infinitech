function trimValue(value) {
  return String(value || "").trim();
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(trimValue(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const DEFAULT_RTC_RUNTIME_SETTINGS = {
  enabled: true,
  timeoutSeconds: 35,
  iceServers: [{ url: "stun:stun.l.google.com:19302", username: "", credential: "" }],
};

export function normalizeRTCRuntimeSettings(payload = {}) {
  const iceServers = Array.isArray(payload.rtc_ice_servers)
    ? payload.rtc_ice_servers
      .map((item) => ({
        url: trimValue(item?.url || item?.urls),
        username: trimValue(item?.username),
        credential: trimValue(item?.credential),
      }))
      .filter((item) => item.url)
      .slice(0, 10)
    : DEFAULT_RTC_RUNTIME_SETTINGS.iceServers.map((item) => ({ ...item }));

  return {
    enabled: payload.rtc_enabled !== false,
    timeoutSeconds: toPositiveInt(
      payload.rtc_timeout_seconds,
      DEFAULT_RTC_RUNTIME_SETTINGS.timeoutSeconds,
    ),
    iceServers: iceServers.length
      ? iceServers
      : DEFAULT_RTC_RUNTIME_SETTINGS.iceServers.map((item) => ({ ...item })),
  };
}

export function createRTCRuntimeSettingsLoader(fetcher) {
  let cachedSettings = {
    ...DEFAULT_RTC_RUNTIME_SETTINGS,
    iceServers: DEFAULT_RTC_RUNTIME_SETTINGS.iceServers.map((item) => ({ ...item })),
  };
  let hasLoaded = false;
  let loadingPromise = null;

  function getCachedRTCRuntimeSettings() {
    return {
      ...cachedSettings,
      iceServers: Array.isArray(cachedSettings.iceServers)
        ? cachedSettings.iceServers.map((item) => ({ ...item }))
        : [],
    };
  }

  async function loadRTCRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedRTCRuntimeSettings();
    }
    if (loadingPromise && !force) {
      return loadingPromise;
    }

    loadingPromise = Promise.resolve()
      .then(() => fetcher())
      .then((payload) => {
        cachedSettings = normalizeRTCRuntimeSettings(payload);
        hasLoaded = true;
        return getCachedRTCRuntimeSettings();
      })
      .catch(() => getCachedRTCRuntimeSettings())
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  return {
    getCachedRTCRuntimeSettings,
    loadRTCRuntimeSettings,
  };
}
