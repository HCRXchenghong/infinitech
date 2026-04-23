import {
  formatRoleSettingsCacheSize,
  maskRoleSettingsPhone,
  mergeRoleSettings,
  normalizeRoleSettingsSwitchValue,
  readRoleSettingsStorageEntries,
  restoreRoleSettingsStorageEntries,
} from "./role-settings-portal.js";

function trimRiderSettingsText(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRiderSettingsUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderSettingsToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderSettingsModal(uniApp, payload) {
  if (uniApp && typeof uniApp.showModal === "function") {
    uniApp.showModal(payload);
  }
}

function scheduleRiderSettingsTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    setTimeoutFn(callback, delay);
    return;
  }

  if (typeof globalThis.setTimeout === "function") {
    globalThis.setTimeout(callback, delay);
    return;
  }

  callback();
}

function readRiderSettingsSupportRuntime(getCachedSupportRuntimeSettings) {
  if (typeof getCachedSupportRuntimeSettings !== "function") {
    return {};
  }

  const runtime = getCachedSupportRuntimeSettings();
  return runtime && typeof runtime === "object" && !Array.isArray(runtime)
    ? runtime
    : {};
}

function resolveRiderSettingsNotificationRuntime(notificationRuntime) {
  return notificationRuntime && typeof notificationRuntime === "object"
    ? notificationRuntime
    : {};
}

export const RIDER_PROFILE_SETTINGS_DEFAULT_AVATAR = "/static/images/logo.png";
export const RIDER_PROFILE_SETTINGS_DEFAULT_NAME = "骑手";
export const DEFAULT_RIDER_PROFILE_SETTINGS = {
  messageNotice: true,
  orderNotice: true,
  vibrateNotice: false,
};
export const RIDER_PROFILE_SETTINGS_PRESERVED_STORAGE_KEYS = [
  "access_token",
  "socket_token",
  "socket_token_account_key",
  "notification_settings",
];
export const RIDER_PROFILE_SETTINGS_LOGOUT_EXTRA_STORAGE_KEYS = [
  "socket_token",
  "socket_token_account_key",
  "notification_settings",
  "rider_push_registration",
];
export const RIDER_PROFILE_SETTINGS_LABELS = {
  messageNotice: "消息通知",
  orderNotice: "新订单提醒",
  vibrateNotice: "震动提醒",
};
export const DEFAULT_RIDER_PROFILE_SETTINGS_ROUTES = {
  avatar: "/pages/profile/avatar-upload",
  profile: "/pages/profile/personal-info",
  changePhone: "/pages/profile/change-phone",
  changePassword: "/pages/profile/change-password",
  developer: "/pages/profile/developer",
  login: "/pages/login/index",
};

export function normalizeRiderProfileSettingsPayload(payload) {
  const value =
    payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

export function buildRiderProfileSettingsUserInfo(payload = {}) {
  const profile = normalizeRiderProfileSettingsPayload(payload);
  return {
    avatarUrl:
      trimRiderSettingsText(profile.avatar) || RIDER_PROFILE_SETTINGS_DEFAULT_AVATAR,
    riderName:
      trimRiderSettingsText(profile.name || profile.nickname)
      || RIDER_PROFILE_SETTINGS_DEFAULT_NAME,
    phone: trimRiderSettingsText(profile.phone),
  };
}

export function buildRiderProfileSettingsAboutSummary({
  aboutSummary,
  supportChatTitle,
} = {}) {
  const summary = trimRiderSettingsText(aboutSummary);
  if (summary) {
    return summary;
  }

  const title = trimRiderSettingsText(supportChatTitle) || "平台客服";
  return `${title}正在为骑手提供履约和服务支持。`;
}

export function createRiderProfileSettingsPageLogic(options = {}) {
  const {
    fetchRiderInfo,
    updateRiderStatus,
    getAppVersionLabel,
    getCachedSupportRuntimeSettings,
    loadSupportRuntimeSettings,
    unregisterCurrentPushDevice,
    clearPushRegistrationState,
    readRiderAuthSession,
    persistRiderAuthSession,
    clearRiderAuthSession,
    notificationRuntime,
    preservedStorageKeys = RIDER_PROFILE_SETTINGS_PRESERVED_STORAGE_KEYS,
    logoutExtraStorageKeys = RIDER_PROFILE_SETTINGS_LOGOUT_EXTRA_STORAGE_KEYS,
    routes = {},
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderSettingsUniRuntime(uniApp);
  const notificationManager =
    resolveRiderSettingsNotificationRuntime(notificationRuntime);
  const pageRoutes = {
    ...DEFAULT_RIDER_PROFILE_SETTINGS_ROUTES,
    ...(routes && typeof routes === "object" ? routes : {}),
  };

  return {
    data() {
      const supportRuntime = readRiderSettingsSupportRuntime(
        getCachedSupportRuntimeSettings,
      );
      return {
        avatarUrl: RIDER_PROFILE_SETTINGS_DEFAULT_AVATAR,
        riderName: RIDER_PROFILE_SETTINGS_DEFAULT_NAME,
        phone: "",
        appVersionLabel:
          typeof getAppVersionLabel === "function" ? getAppVersionLabel() : "",
        cacheSize: "--",
        supportChatTitle: trimRiderSettingsText(supportRuntime.title),
        aboutSummary: trimRiderSettingsText(supportRuntime.aboutSummary),
        settings: mergeRoleSettings(
          typeof notificationManager.getSettings === "function"
            ? notificationManager.getSettings()
            : {},
          DEFAULT_RIDER_PROFILE_SETTINGS,
        ),
      };
    },
    computed: {
      maskedPhone() {
        return maskRoleSettingsPhone(trimRiderSettingsText(this.phone));
      },
    },
    onLoad() {
      this.loadNotificationSettings();
      this.calculateCacheSize();
      void this.loadRuntimeConfig();
      void this.loadRiderInfo();
    },
    onShow() {
      void this.loadRuntimeConfig();
      void this.loadRiderInfo();
      this.calculateCacheSize();
    },
    methods: {
      async loadRiderInfo() {
        if (typeof fetchRiderInfo !== "function") {
          return;
        }

        try {
          const profile = buildRiderProfileSettingsUserInfo(await fetchRiderInfo());
          this.avatarUrl = profile.avatarUrl;
          this.riderName = profile.riderName;
          this.phone = profile.phone;
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("[RiderSettings] 加载骑手信息失败:", error);
          }
        }
      },

      async loadRuntimeConfig() {
        if (typeof loadSupportRuntimeSettings !== "function") {
          return;
        }

        const runtime = await loadSupportRuntimeSettings();
        this.supportChatTitle = trimRiderSettingsText(runtime && runtime.title);
        this.aboutSummary = trimRiderSettingsText(runtime && runtime.aboutSummary);
      },

      loadNotificationSettings() {
        const currentSettings =
          typeof notificationManager.getSettings === "function"
            ? notificationManager.getSettings()
            : {};
        this.settings = mergeRoleSettings(
          currentSettings,
          DEFAULT_RIDER_PROFILE_SETTINGS,
        );
      },

      calculateCacheSize() {
        if (!runtimeUni || typeof runtimeUni.getStorageInfo !== "function") {
          this.cacheSize = formatRoleSettingsCacheSize(Number.NaN);
          return;
        }

        runtimeUni.getStorageInfo({
          success: (res) => {
            this.cacheSize = formatRoleSettingsCacheSize(res && res.currentSize);
          },
          fail: () => {
            this.cacheSize = formatRoleSettingsCacheSize(Number.NaN);
          },
        });
      },

      goToPage(path) {
        const target = trimRiderSettingsText(path);
        if (!target || !runtimeUni || typeof runtimeUni.navigateTo !== "function") {
          return;
        }
        runtimeUni.navigateTo({ url: target });
      },

      changeAvatar() {
        this.goToPage(pageRoutes.avatar);
      },

      editProfile() {
        this.goToPage(pageRoutes.profile);
      },

      changePhone() {
        this.goToPage(pageRoutes.changePhone);
      },

      changePassword() {
        this.goToPage(pageRoutes.changePassword);
      },

      goToDeveloper() {
        this.goToPage(pageRoutes.developer);
      },

      toggleSetting(key, event) {
        const settingKey = trimRiderSettingsText(key);
        if (!settingKey) {
          return;
        }

        const currentValue = !!this.settings[settingKey];
        const nextValue =
          arguments.length > 1
            ? normalizeRoleSettingsSwitchValue(event, currentValue)
            : !currentValue;

        this.settings = {
          ...this.settings,
          [settingKey]: nextValue,
        };
        if (typeof notificationManager.updateSettings === "function") {
          notificationManager.updateSettings(settingKey, nextValue);
        }

        showRiderSettingsToast(runtimeUni, {
          title: `${nextValue ? "已开启" : "已关闭"}${
            RIDER_PROFILE_SETTINGS_LABELS[settingKey] || "设置"
          }`,
          icon: "none",
          duration: 1500,
        });
      },

      clearCache() {
        showRiderSettingsModal(runtimeUni, {
          title: "清除缓存",
          content: "将清理本地缓存数据，并保留登录态与通知设置，是否继续？",
          success: (res) => {
            if (!res || !res.confirm) {
              return;
            }

            const session =
              typeof readRiderAuthSession === "function"
                ? readRiderAuthSession({ uniApp: runtimeUni }) || {}
                : {};
            const preservedEntries = readRoleSettingsStorageEntries(
              runtimeUni,
              preservedStorageKeys,
            );

            if (runtimeUni && typeof runtimeUni.clearStorageSync === "function") {
              runtimeUni.clearStorageSync();
            }

            if (session.token && typeof persistRiderAuthSession === "function") {
              persistRiderAuthSession({
                uniApp: runtimeUni,
                token: session.token,
                refreshToken: session.refreshToken || null,
                tokenExpiresAt: session.tokenExpiresAt || null,
                profile: session.profile,
                extraStorageValues: {
                  riderId: session.accountId || null,
                  riderName:
                    session.profile?.name || session.profile?.nickname || null,
                },
              });
            }

            restoreRoleSettingsStorageEntries(runtimeUni, preservedEntries);
            this.loadNotificationSettings();
            this.calculateCacheSize();
            showRiderSettingsToast(runtimeUni, {
              title: "缓存已清除",
              icon: "success",
            });
          },
        });
      },

      showAbout() {
        showRiderSettingsModal(runtimeUni, {
          title: "关于骑手端",
          content: buildRiderProfileSettingsAboutSummary({
            aboutSummary: this.aboutSummary,
            supportChatTitle: this.supportChatTitle,
          }),
          showCancel: false,
        });
      },

      handleLogout() {
        showRiderSettingsModal(runtimeUni, {
          title: "退出登录",
          content: "确认退出当前骑手账号？",
          success: async (res) => {
            if (!res || !res.confirm) {
              return;
            }

            try {
              if (typeof updateRiderStatus === "function") {
                await updateRiderStatus(false);
              }
            } catch (_error) {}

            try {
              if (typeof unregisterCurrentPushDevice === "function") {
                await unregisterCurrentPushDevice();
              }
            } catch (_error) {
              if (typeof clearPushRegistrationState === "function") {
                clearPushRegistrationState();
              }
            }

            if (typeof clearRiderAuthSession === "function") {
              clearRiderAuthSession({
                uniApp: runtimeUni,
                extraStorageKeys: logoutExtraStorageKeys,
              });
            }
            if (typeof clearPushRegistrationState === "function") {
              clearPushRegistrationState();
            }

            showRiderSettingsToast(runtimeUni, {
              title: "已退出登录",
              icon: "success",
            });

            scheduleRiderSettingsTimeout(
              setTimeoutFn,
              () => {
                if (runtimeUni && typeof runtimeUni.reLaunch === "function") {
                  runtimeUni.reLaunch({ url: pageRoutes.login });
                }
              },
              500,
            );
          },
        });
      },
    },
  };
}
