import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderDeveloperDiagnosticInfo,
  buildRiderDeveloperTestMessage,
  createRiderDeveloperPageLogic,
  normalizeRiderDeveloperNotificationSettings,
} from "./rider-developer-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  if (typeof component.onShow === "function") {
    instance.onShow = component.onShow.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider developer helpers normalize settings and build diagnostic payloads", () => {
  assert.deepEqual(
    normalizeRiderDeveloperNotificationSettings({
      messageNotice: false,
      vibrateNotice: true,
    }),
    {
      messageNotice: false,
      orderNotice: true,
      vibrateNotice: true,
    },
  );

  assert.deepEqual(
    buildRiderDeveloperTestMessage({
      supportTitle: "无限科技客服",
      now: 1713952800000,
    }),
    {
      id: 1713952800000,
      chatId: 999,
      sender: "无限科技客服",
      senderId: "admin_001",
      senderRole: "admin",
      content: "这是一条测试消息，用于验证消息弹窗功能是否正常工作。",
      messageType: "text",
      avatar: null,
      timestamp: 1713952800000,
    },
  );

  const diagnosticInfo = buildRiderDeveloperDiagnosticInfo({
    systemInfo: {
      platform: "android",
      uniPlatform: "app-plus",
      system: "Android 15",
    },
    notificationSettings: {
      messageNotice: true,
      orderNotice: false,
      vibrateNotice: true,
    },
    currentRoute: "pages/profile/developer",
    plusAvailable: true,
    now: 1713952800000,
  });

  assert.match(diagnosticInfo, /平台: android/);
  assert.match(diagnosticInfo, /uniPlatform: app-plus/);
  assert.match(diagnosticInfo, /新订单提醒: 关闭/);
  assert.match(diagnosticInfo, /Plus API: 可用/);
  assert.match(diagnosticInfo, /当前页面: pages\/profile\/developer/);
});

test("rider developer page loads settings, emits test notifications, copies diagnostics and reinitializes app notifications", async () => {
  const events = [];
  const toasts = [];
  const modals = [];
  const clipboardWrites = [];
  const scheduled = [];
  const localNotifications = [];
  let initCount = 0;
  let backCount = 0;

  const component = createRiderDeveloperPageLogic({
    notificationRuntime: {
      getSettings() {
        return {
          orderNotice: false,
          vibrateNotice: true,
        };
      },
      showLocalNotification(payload) {
        localNotifications.push(payload);
      },
      async init() {
        initCount += 1;
      },
    },
    getCachedSupportRuntimeSettings() {
      return {
        title: "无限科技客服",
      };
    },
    uniApp: {
      $emit(name, payload) {
        events.push({ name, payload });
      },
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        modals.push(payload);
        payload.success({ confirm: true });
      },
      setClipboardData(payload) {
        clipboardWrites.push(payload.data);
        payload.success();
      },
      showLoading(payload) {
        toasts.push({ loading: payload.title });
      },
      hideLoading() {
        toasts.push({ hidden: true });
      },
      navigateBack() {
        backCount += 1;
      },
      getSystemInfoSync() {
        return {
          platform: "android",
          uniPlatform: "app-plus",
          system: "Android 15",
        };
      },
    },
    plusRuntime: {},
    getCurrentPagesFn() {
      return [{ route: "pages/profile/developer" }];
    },
    setTimeoutFn(callback) {
      scheduled.push(callback);
    },
    nowFn() {
      return 1713952800000;
    },
  });
  const page = instantiatePage(component);

  page.onLoad();
  assert.deepEqual(page.notificationSettings, {
    messageNotice: true,
    orderNotice: false,
    vibrateNotice: true,
  });

  page.goBack();
  assert.equal(backCount, 1);

  page.testNotification();
  assert.equal(events.length, 3);
  assert.equal(events[0].name, "popup-state-change");
  assert.equal(events[1].name, "show-message-popup");
  assert.equal(events[2].name, "test-popup-event");
  assert.equal(toasts[0].title, "已发送测试通知");
  scheduled[0]();
  assert.deepEqual(localNotifications, [
    {
      title: "无限科技客服发来新消息",
      content: "这是一条测试消息，用于验证消息弹窗功能是否正常工作。",
      sound: true,
      vibrate: true,
    },
  ]);

  page.showDiagnosticInfo();
  assert.equal(modals[0].title, "诊断信息");
  assert.match(modals[0].content, /当前页面: pages\/profile\/developer/);
  assert.equal(clipboardWrites.length, 1);

  page.reinitNotification();
  await scheduled[1]();
  assert.equal(initCount, 1);
  assert.deepEqual(
    toasts.slice(-2),
    [
      { hidden: true },
      {
        title: "通知系统已重新初始化",
        icon: "success",
        duration: 2000,
      },
    ],
  );
});

test("rider developer page falls back when native notification runtime is unavailable", () => {
  const toasts = [];
  const component = createRiderDeveloperPageLogic({
    notificationRuntime: {
      getSettings() {
        return {};
      },
    },
    uniApp: {
      showLoading() {},
      hideLoading() {},
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  page.reinitNotification();

  assert.deepEqual(toasts, [
    {
      title: "仅 APP 端支持原生通知",
      icon: "none",
      duration: 2000,
    },
  ]);
});
