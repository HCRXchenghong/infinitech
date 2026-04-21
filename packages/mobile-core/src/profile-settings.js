import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

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

function assignLegalRuntime(target, legalRuntime) {
  target.aboutSummary = legalRuntime?.aboutSummary || "";
  target.privacyPolicySummary = legalRuntime?.privacyPolicySummary || "";
  target.userAgreementSummary = legalRuntime?.userAgreementSummary || "";
}

function createBaseProfileSettingsPage({
  defaultSettings,
  initialCacheSize,
  getCachedLegalRuntimeSettings,
  loadLegalRuntimeSettings,
  getAppVersionLabel,
  clearAllCache,
  forceLogout,
  writeSettings,
  calculateCacheSize,
  clearCacheModalTitle,
  clearCacheModalContent,
  clearCacheSuccessTitle,
} = {}) {
  return {
    data() {
      const legalRuntime = getCachedLegalRuntimeSettings();
      const userInfo = buildProfileSettingsUserInfo(
        readConsumerStoredProfile({ uniApp: uni }),
      );
      return {
        nickname: userInfo.nickname,
        phone: userInfo.phone,
        appVersionLabel: getAppVersionLabel(),
        cacheSize: initialCacheSize,
        settings: { ...defaultSettings },
        aboutSummary: legalRuntime?.aboutSummary || "",
        privacyPolicySummary: legalRuntime?.privacyPolicySummary || "",
        userAgreementSummary: legalRuntime?.userAgreementSummary || "",
      };
    },
    computed: {
      phoneMasked() {
        return maskProfileSettingsPhone(this.phone);
      },
    },
    onShow() {
      this.loadUserInfo();
      this.loadSettings();
      this.calculateCacheSize();
      void this.loadLegalRuntimeConfig();
    },
    methods: {
      back() {
        uni.navigateBack();
      },
      loadUserInfo() {
        const userInfo = buildProfileSettingsUserInfo(
          readConsumerStoredProfile({ uniApp: uni }),
        );
        this.nickname = userInfo.nickname;
        this.phone = userInfo.phone;
      },
      loadSettings() {
        this.settings = mergeProfileSettings(
          uni.getStorageSync(PROFILE_SETTINGS_STORAGE_KEY),
          defaultSettings,
        );
      },
      async loadLegalRuntimeConfig() {
        try {
          const legalRuntime = await loadLegalRuntimeSettings();
          assignLegalRuntime(this, legalRuntime);
        } catch (_error) {
          // Keep cached legal runtime copy when remote refresh fails.
        }
      },
      saveSettings() {
        writeSettings(this.settings, defaultSettings);
      },
      toggleSetting(key, event) {
        this.settings[key] = !!event.detail.value;
        this.saveSettings();
      },
      goToPage(path) {
        uni.navigateTo({ url: path });
      },
      calculateCacheSize,
      clearCache() {
        uni.showModal({
          title: clearCacheModalTitle,
          content: clearCacheModalContent,
          success: (res) => {
            if (!res.confirm) {
              return;
            }
            clearAllCache();
            this.calculateCacheSize();
            uni.showToast({ title: clearCacheSuccessTitle, icon: "success" });
          },
        });
      },
      checkUpdate() {
        uni.showModal({
          title: "检查更新",
          content: `当前版本 ${this.appVersionLabel}，已是当前安装版本。`,
          showCancel: false,
        });
      },
      showAboutUs() {
        uni.showModal({
          title: "关于悦享e食",
          content: this.aboutSummary,
          showCancel: false,
        });
      },
      showPrivacy() {
        uni.showModal({
          title: "隐私政策",
          content: this.privacyPolicySummary,
          showCancel: false,
        });
      },
      showUserAgreement() {
        uni.showModal({
          title: "用户协议",
          content: this.userAgreementSummary,
          showCancel: false,
        });
      },
      logout() {
        uni.showModal({
          title: "退出登录",
          content: "确认退出当前账号？",
          confirmColor: "#ef4444",
          success: (res) => {
            if (res.confirm) {
              forceLogout();
            }
          },
        });
      },
    },
  };
}

export function createProfileSettingsPage(options = {}) {
  return createBaseProfileSettingsPage({
    ...options,
    defaultSettings: DEFAULT_PROFILE_SETTINGS,
    initialCacheSize: "--",
    writeSettings(settings) {
      uni.setStorageSync(PROFILE_SETTINGS_STORAGE_KEY, settings);
    },
    calculateCacheSize() {
      uni.getStorageInfo({
        success: (res) => {
          this.cacheSize = formatProfileSettingsCacheSize(res.currentSize, {
            emptyLabel: "--",
            kbDigits: 0,
            mbDigits: 2,
          });
        },
        fail: () => {
          this.cacheSize = "--";
        },
      });
    },
    clearCacheModalTitle: "清除缓存",
    clearCacheModalContent: "将清除本地缓存数据，是否继续？",
    clearCacheSuccessTitle: "缓存已清除",
  });
}

export function createProfileSettingsDetailPage(options = {}) {
  return createBaseProfileSettingsPage({
    ...options,
    defaultSettings: DEFAULT_PROFILE_SETTINGS_DETAIL,
    initialCacheSize: "0 MB",
    writeSettings(settings, defaultSettings) {
      uni.setStorageSync(
        PROFILE_SETTINGS_STORAGE_KEY,
        mergeProfileSettingsSnapshot(
          uni.getStorageSync(PROFILE_SETTINGS_STORAGE_KEY),
          settings,
          defaultSettings,
        ),
      );
    },
    calculateCacheSize() {
      try {
        const info = uni.getStorageInfoSync();
        this.cacheSize = formatProfileSettingsCacheSize(info.currentSize, {
          emptyLabel: "0 MB",
          kbDigits: 0,
          mbDigits: 1,
        });
      } catch (_error) {
        this.cacheSize = "0 MB";
      }
    },
    clearCacheModalTitle: "清理缓存",
    clearCacheModalContent: "确定要清理缓存吗？这不会影响当前登录状态。",
    clearCacheSuccessTitle: "缓存已清理",
  });
}
