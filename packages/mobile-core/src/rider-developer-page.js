import { DEFAULT_RIDER_PROFILE_SETTINGS } from "./rider-profile-settings-page.js";
import { DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE } from "./rider-profile-home-page.js";

function trimRiderDeveloperValue(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRiderDeveloperUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderDeveloperPlusRuntime(plusRuntime) {
  return plusRuntime || globalThis.plus || null;
}

function resolveRiderDeveloperTimeout(setTimeoutFn, callback, delay) {
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

function readRiderDeveloperSupportTitle(getCachedSupportRuntimeSettings) {
  if (typeof getCachedSupportRuntimeSettings !== "function") {
    return DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE;
  }

  const runtime = getCachedSupportRuntimeSettings();
  const title = trimRiderDeveloperValue(runtime && runtime.title);
  return title || DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE;
}

function resolveRiderDeveloperCurrentRoute(getCurrentPagesFn) {
  const reader =
    typeof getCurrentPagesFn === "function"
      ? getCurrentPagesFn
      : typeof globalThis.getCurrentPages === "function"
        ? globalThis.getCurrentPages
        : null;
  if (!reader) {
    return "unknown";
  }

  const pages = reader();
  if (!Array.isArray(pages) || pages.length === 0) {
    return "unknown";
  }

  return trimRiderDeveloperValue(pages[pages.length - 1]?.route) || "unknown";
}

function emitRiderDeveloperMessageEvent(uniApp, eventName, payload) {
  if (uniApp && typeof uniApp.$emit === "function") {
    uniApp.$emit(eventName, payload);
  }
}

function showRiderDeveloperToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderDeveloperLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideRiderDeveloperLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

export function normalizeRiderDeveloperNotificationSettings(settings = {}) {
  return {
    messageNotice: settings.messageNotice !== false,
    orderNotice: settings.orderNotice !== false,
    vibrateNotice: settings.vibrateNotice === true,
  };
}

export function buildRiderDeveloperTestMessage({
  supportTitle = DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE,
  now = Date.now(),
} = {}) {
  return {
    id: now,
    chatId: 999,
    sender:
      trimRiderDeveloperValue(supportTitle)
      || DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE,
    senderId: "admin_001",
    senderRole: "admin",
    content: "这是一条测试消息，用于验证消息弹窗功能是否正常工作。",
    messageType: "text",
    avatar: null,
    timestamp: now,
  };
}

export function buildRiderDeveloperDiagnosticInfo({
  systemInfo = {},
  notificationSettings = DEFAULT_RIDER_PROFILE_SETTINGS,
  currentRoute = "unknown",
  plusAvailable = false,
  now = Date.now(),
} = {}) {
  const settings = normalizeRiderDeveloperNotificationSettings(notificationSettings);

  return [
    `平台: ${trimRiderDeveloperValue(systemInfo.platform) || "unknown"}`,
    `uniPlatform: ${trimRiderDeveloperValue(systemInfo.uniPlatform) || "unknown"}`,
    `系统版本: ${trimRiderDeveloperValue(systemInfo.system) || "unknown"}`,
    `消息通知: ${settings.messageNotice ? "开启" : "关闭"}`,
    `新订单提醒: ${settings.orderNotice ? "开启" : "关闭"}`,
    `震动提醒: ${settings.vibrateNotice ? "开启" : "关闭"}`,
    `当前页面: ${trimRiderDeveloperValue(currentRoute) || "unknown"}`,
    `Plus API: ${plusAvailable ? "可用" : "不可用"}`,
    `当前时间: ${new Date(now).toLocaleString()}`,
  ].join("\n");
}

export function createRiderDeveloperPageLogic(options = {}) {
  const {
    notificationRuntime,
    getCachedSupportRuntimeSettings,
    uniApp,
    plusRuntime,
    getCurrentPagesFn,
    setTimeoutFn,
    nowFn,
  } = options;
  const runtimeUni = resolveRiderDeveloperUniRuntime(uniApp);
  const runtimePlus = resolveRiderDeveloperPlusRuntime(plusRuntime);
  const readNow = typeof nowFn === "function" ? nowFn : () => Date.now();
  const notificationManager =
    notificationRuntime && typeof notificationRuntime === "object"
      ? notificationRuntime
      : {};

  return {
    data() {
      return {
        notificationSettings: { ...DEFAULT_RIDER_PROFILE_SETTINGS },
      };
    },
    onLoad() {
      this.loadSettings();
    },
    onShow() {
      this.loadSettings();
    },
    methods: {
      loadSettings() {
        const settings =
          typeof notificationManager.getSettings === "function"
            ? notificationManager.getSettings()
            : {};
        this.notificationSettings =
          normalizeRiderDeveloperNotificationSettings(settings);
      },

      goBack() {
        if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
          runtimeUni.navigateBack();
        }
      },

      testNotification() {
        const testMessage = buildRiderDeveloperTestMessage({
          supportTitle: readRiderDeveloperSupportTitle(
            getCachedSupportRuntimeSettings,
          ),
          now: readNow(),
        });

        emitRiderDeveloperMessageEvent(runtimeUni, "popup-state-change", {
          visible: true,
          message: testMessage,
        });
        emitRiderDeveloperMessageEvent(
          runtimeUni,
          "show-message-popup",
          testMessage,
        );
        emitRiderDeveloperMessageEvent(
          runtimeUni,
          "test-popup-event",
          testMessage,
        );

        resolveRiderDeveloperTimeout(setTimeoutFn, () => {
          if (typeof notificationManager.showLocalNotification === "function") {
            notificationManager.showLocalNotification({
              title: `${testMessage.sender}发来新消息`,
              content: testMessage.content,
              sound: true,
              vibrate: true,
            });
          }
        }, 300);

        showRiderDeveloperToast(runtimeUni, {
          title: "已发送测试通知",
          icon: "none",
          duration: 2000,
        });
      },

      showDiagnosticInfo() {
        const systemInfo =
          runtimeUni && typeof runtimeUni.getSystemInfoSync === "function"
            ? runtimeUni.getSystemInfoSync()
            : {};
        const settings =
          typeof notificationManager.getSettings === "function"
            ? notificationManager.getSettings()
            : {};
        const info = buildRiderDeveloperDiagnosticInfo({
          systemInfo,
          notificationSettings: settings,
          currentRoute: resolveRiderDeveloperCurrentRoute(getCurrentPagesFn),
          plusAvailable: !!runtimePlus,
          now: readNow(),
        });

        if (!runtimeUni || typeof runtimeUni.showModal !== "function") {
          return;
        }

        runtimeUni.showModal({
          title: "诊断信息",
          content: info,
          showCancel: false,
          confirmText: "复制",
          success: (res) => {
            if (!res || !res.confirm) {
              return;
            }

            if (
              runtimeUni
              && typeof runtimeUni.setClipboardData === "function"
            ) {
              runtimeUni.setClipboardData({
                data: info,
                success: () => {
                  showRiderDeveloperToast(runtimeUni, {
                    title: "已复制",
                    icon: "success",
                  });
                },
              });
            }
          },
        });
      },

      reinitNotification() {
        showRiderDeveloperLoading(runtimeUni, { title: "正在重置..." });

        if (!runtimePlus || typeof notificationManager.init !== "function") {
          hideRiderDeveloperLoading(runtimeUni);
          showRiderDeveloperToast(runtimeUni, {
            title: "仅 APP 端支持原生通知",
            icon: "none",
            duration: 2000,
          });
          return;
        }

        resolveRiderDeveloperTimeout(setTimeoutFn, async () => {
          try {
            await notificationManager.init();
            hideRiderDeveloperLoading(runtimeUni);
            showRiderDeveloperToast(runtimeUni, {
              title: "通知系统已重新初始化",
              icon: "success",
              duration: 2000,
            });
            this.loadSettings();
          } catch (error) {
            hideRiderDeveloperLoading(runtimeUni);
            showRiderDeveloperToast(runtimeUni, {
              title: "通知系统重置失败",
              icon: "none",
              duration: 2000,
            });
            if (typeof console !== "undefined" && console.error) {
              console.error("重新初始化通知系统失败:", error);
            }
          }
        }, 500);
      },
    },
  };
}
