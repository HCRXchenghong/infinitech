function trimValue(value) {
  return String(value || "").trim();
}

export const DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS = {
  aboutSummary:
    "悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景，持续优化用户体验。",
  privacyPolicySummary:
    "平台仅在提供服务所必需的范围内处理账号、定位和订单信息，并遵循最小必要原则。",
  userAgreementSummary:
    "使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。",
};

function resolveDefaultSettings(defaultSettings = {}) {
  return {
    ...DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
    ...(defaultSettings && typeof defaultSettings === "object" ? defaultSettings : {}),
  };
}

export function normalizeConsumerLegalRuntimeSettings(payload = {}, defaultSettings = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const defaults = resolveDefaultSettings(defaultSettings);

  return {
    aboutSummary:
      trimValue(source.consumer_about_summary) || defaults.aboutSummary,
    privacyPolicySummary:
      trimValue(source.consumer_privacy_policy) || defaults.privacyPolicySummary,
    userAgreementSummary:
      trimValue(source.consumer_user_agreement) || defaults.userAgreementSummary,
  };
}

export function createConsumerLegalRuntimeStore(options = {}) {
  const fetchRuntimeSettings = typeof options.fetchRuntimeSettings === "function"
    ? options.fetchRuntimeSettings
    : async () => ({});
  const defaultSettings = resolveDefaultSettings(options.defaultSettings);

  let cachedSettings = { ...defaultSettings };
  let hasLoaded = false;
  let pendingPromise = null;

  function getCachedLegalRuntimeSettings() {
    return { ...cachedSettings };
  }

  async function loadLegalRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedLegalRuntimeSettings();
    }

    if (pendingPromise && !force) {
      return pendingPromise;
    }

    pendingPromise = Promise.resolve()
      .then(() => fetchRuntimeSettings())
      .then((payload) => {
        cachedSettings = normalizeConsumerLegalRuntimeSettings(payload, defaultSettings);
        hasLoaded = true;
        return getCachedLegalRuntimeSettings();
      })
      .catch(() => getCachedLegalRuntimeSettings())
      .finally(() => {
        pendingPromise = null;
      });

    return pendingPromise;
  }

  function resetLegalRuntimeSettings() {
    cachedSettings = { ...defaultSettings };
    hasLoaded = false;
    pendingPromise = null;
  }

  return {
    defaultSettings,
    getCachedLegalRuntimeSettings,
    loadLegalRuntimeSettings,
    resetLegalRuntimeSettings,
  };
}
