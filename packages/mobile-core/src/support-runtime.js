function trimValue(value) {
  return String(value || "").trim();
}

export const DEFAULT_SUPPORT_RUNTIME_SETTINGS = {
  title: "平台客服",
  welcomeMessage: "您好！我是平台客服，有什么可以帮助您的吗？",
  merchantWelcomeMessage: "欢迎光临，有什么可以帮您的？",
  riderWelcomeMessage: "您好，您的骑手正在配送中。",
  aboutSummary: "",
  messageSoundUrl: "",
  orderSoundUrl: "",
};

function resolveDefaultSettings(defaultSettings = {}) {
  return {
    ...DEFAULT_SUPPORT_RUNTIME_SETTINGS,
    ...(defaultSettings && typeof defaultSettings === "object" ? defaultSettings : {}),
  };
}

export function normalizeSupportRuntimeSettings(payload = {}, defaultSettings = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const defaults = resolveDefaultSettings(defaultSettings);

  return {
    title: trimValue(source.support_chat_title) || defaults.title,
    welcomeMessage:
      trimValue(source.support_chat_welcome_message) || defaults.welcomeMessage,
    merchantWelcomeMessage:
      trimValue(source.merchant_chat_welcome_message) || defaults.merchantWelcomeMessage,
    riderWelcomeMessage:
      trimValue(source.rider_chat_welcome_message) || defaults.riderWelcomeMessage,
    aboutSummary:
      trimValue(source.rider_about_summary) || defaults.aboutSummary,
    messageSoundUrl:
      trimValue(source.message_notification_sound_url) || defaults.messageSoundUrl,
    orderSoundUrl:
      trimValue(source.order_notification_sound_url) || defaults.orderSoundUrl,
  };
}

export function createSupportRuntimeStore(options = {}) {
  const fetchRuntimeSettings = typeof options.fetchRuntimeSettings === "function"
    ? options.fetchRuntimeSettings
    : async () => ({});
  const defaultSettings = resolveDefaultSettings(options.defaultSettings);

  let cachedSettings = { ...defaultSettings };
  let hasLoaded = false;
  let pendingPromise = null;

  function getCachedSupportRuntimeSettings() {
    return { ...cachedSettings };
  }

  async function loadSupportRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedSupportRuntimeSettings();
    }

    if (pendingPromise && !force) {
      return pendingPromise;
    }

    pendingPromise = Promise.resolve()
      .then(() => fetchRuntimeSettings())
      .then((payload) => {
        cachedSettings = normalizeSupportRuntimeSettings(payload, defaultSettings);
        hasLoaded = true;
        return getCachedSupportRuntimeSettings();
      })
      .catch(() => getCachedSupportRuntimeSettings())
      .finally(() => {
        pendingPromise = null;
      });

    return pendingPromise;
  }

  function resetSupportRuntimeSettings() {
    cachedSettings = { ...defaultSettings };
    hasLoaded = false;
    pendingPromise = null;
  }

  return {
    defaultSettings,
    getCachedSupportRuntimeSettings,
    loadSupportRuntimeSettings,
    resetSupportRuntimeSettings,
  };
}
