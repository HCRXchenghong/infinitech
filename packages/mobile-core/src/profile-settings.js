function trimProfileSettingsText(value) {
  return String(value || "").trim();
}

export const PROFILE_SETTINGS_STORAGE_KEY = "appSettings";
export const DEFAULT_PROFILE_SETTINGS_NAME = "悦享e食用户";

export const DEFAULT_PROFILE_SETTINGS = {
  notification: true,
  sound: true,
  vibrate: true,
  location: true,
};

export const DEFAULT_PROFILE_SETTINGS_DETAIL = {
  orderNotice: true,
  marketingNotice: true,
  location: true,
  personalized: true,
};

export function buildProfileSettingsUserInfo(profile = {}) {
  const source =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : {};
  return {
    nickname:
      trimProfileSettingsText(source.nickname || source.name) ||
      DEFAULT_PROFILE_SETTINGS_NAME,
    phone: trimProfileSettingsText(source.phone),
  };
}

export function maskProfileSettingsPhone(value, fallback = "未绑定") {
  const phone = trimProfileSettingsText(value);
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return fallback;
}

export function mergeProfileSettings(savedSettings, defaults) {
  const base =
    defaults && typeof defaults === "object" && !Array.isArray(defaults)
      ? defaults
      : {};
  const saved =
    savedSettings && typeof savedSettings === "object" && !Array.isArray(savedSettings)
      ? savedSettings
      : {};
  return {
    ...base,
    ...saved,
  };
}

export function mergeProfileSettingsSnapshot(
  existingSettings,
  nextSettings,
  defaults,
) {
  return {
    ...mergeProfileSettings(existingSettings, defaults),
    ...(nextSettings && typeof nextSettings === "object" ? nextSettings : {}),
  };
}

export function formatProfileSettingsCacheSize(
  sizeKb,
  {
    emptyLabel = "--",
    kbDigits = 0,
    mbDigits = 2,
  } = {},
) {
  const normalized = Number(sizeKb);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return emptyLabel;
  }
  if (normalized < 1024) {
    return `${normalized.toFixed(kbDigits)} KB`;
  }
  return `${(normalized / 1024).toFixed(mbDigits)} MB`;
}
