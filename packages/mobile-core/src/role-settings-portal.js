import {
  formatProfileSettingsCacheSize,
  maskProfileSettingsPhone,
  mergeProfileSettings,
} from "./profile-settings.js";

export function trimRoleSettingsValue(value) {
  return String(value ?? "").trim();
}

export function maskRoleSettingsPhone(value, fallback = "未绑定") {
  return maskProfileSettingsPhone(value, fallback);
}

export function mergeRoleSettings(savedSettings, defaults) {
  return mergeProfileSettings(savedSettings, defaults);
}

export function normalizeRoleSettingsSwitchValue(event, fallback = false) {
  if (typeof event === "boolean") {
    return event;
  }
  if (event?.detail && Object.prototype.hasOwnProperty.call(event.detail, "value")) {
    return !!event.detail.value;
  }
  return !!fallback;
}

export function formatRoleSettingsCacheSize(sizeKb, options = {}) {
  return formatProfileSettingsCacheSize(sizeKb, {
    emptyLabel: "--",
    kbDigits: 0,
    mbDigits: 2,
    ...options,
  });
}

export function readRoleSettingsCacheSizeSync(uniApp, options = {}) {
  try {
    const info = uniApp?.getStorageInfoSync?.() || {};
    return formatRoleSettingsCacheSize(info.currentSize, options);
  } catch (_error) {
    return formatRoleSettingsCacheSize(Number.NaN, options);
  }
}

export function readRoleSettingsStorageEntries(uniApp, keys = []) {
  if (!uniApp || !Array.isArray(keys)) {
    return [];
  }

  return keys
    .map((key) => {
      const storageKey = trimRoleSettingsValue(key);
      return {
        key: storageKey,
        value: uniApp.getStorageSync?.(storageKey),
      };
    })
    .filter(({ key, value }) => (
      key &&
      value !== "" &&
      value !== null &&
      value !== undefined
    ));
}

export function restoreRoleSettingsStorageEntries(uniApp, entries = []) {
  if (!uniApp || !Array.isArray(entries)) {
    return;
  }

  entries.forEach(({ key, value }) => {
    const storageKey = trimRoleSettingsValue(key);
    if (storageKey) {
      uniApp.setStorageSync?.(storageKey, value);
    }
  });
}
