function trimValue(value) {
  return String(value || "").trim();
}

export const DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS = {
  title: "欢迎使用悦享e食",
  subtitle: "一站式本地生活服务平台",
  loginFooter: "登录后可同步订单、消息、地址与优惠权益",
  wechatLoginEnabled: false,
  wechatLoginEntryUrl: "",
};

export function normalizeConsumerAuthRuntimeSettings(payload = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const entryUrl = trimValue(source.wechat_login_entry_url);

  return {
    title:
      trimValue(source.consumer_portal_title) ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.title,
    subtitle:
      trimValue(source.consumer_portal_subtitle) ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.subtitle,
    loginFooter:
      trimValue(source.consumer_portal_login_footer) ||
      DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS.loginFooter,
    wechatLoginEnabled: Boolean(source.wechat_login_enabled && entryUrl),
    wechatLoginEntryUrl: entryUrl,
  };
}

export function createConsumerAuthRuntimeStore(options = {}) {
  const fetchRuntimeSettings = typeof options.fetchRuntimeSettings === "function"
    ? options.fetchRuntimeSettings
    : async () => ({});

  let cachedSettings = { ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS };
  let hasLoaded = false;
  let pendingPromise = null;

  function getCachedConsumerAuthRuntimeSettings() {
    return { ...cachedSettings };
  }

  async function loadConsumerAuthRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedConsumerAuthRuntimeSettings();
    }

    if (pendingPromise && !force) {
      return pendingPromise;
    }

    pendingPromise = Promise.resolve()
      .then(() => fetchRuntimeSettings())
      .then((payload) => {
        cachedSettings = normalizeConsumerAuthRuntimeSettings(payload);
        hasLoaded = true;
        return getCachedConsumerAuthRuntimeSettings();
      })
      .catch(() => getCachedConsumerAuthRuntimeSettings())
      .finally(() => {
        pendingPromise = null;
      });

    return pendingPromise;
  }

  function resetConsumerAuthRuntimeSettings() {
    cachedSettings = { ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS };
    hasLoaded = false;
    pendingPromise = null;
  }

  return {
    getCachedConsumerAuthRuntimeSettings,
    loadConsumerAuthRuntimeSettings,
    resetConsumerAuthRuntimeSettings,
  };
}
