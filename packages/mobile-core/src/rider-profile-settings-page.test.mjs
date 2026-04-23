import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderProfileSettingsAboutSummary,
  buildRiderProfileSettingsUserInfo,
  createRiderProfileSettingsPageLogic,
  DEFAULT_RIDER_PROFILE_SETTINGS,
  RIDER_PROFILE_SETTINGS_LOGOUT_EXTRA_STORAGE_KEYS,
  RIDER_PROFILE_SETTINGS_PRESERVED_STORAGE_KEYS,
  normalizeRiderProfileSettingsPayload,
} from "./rider-profile-settings-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rider settings helpers normalize profile payloads and about copy", () => {
  assert.deepEqual(
    normalizeRiderProfileSettingsPayload({
      data: {
        avatar: "https://cdn/avatar.png",
        name: "骑手阿强",
      },
    }),
    {
      avatar: "https://cdn/avatar.png",
      name: "骑手阿强",
    },
  );
  assert.deepEqual(buildRiderProfileSettingsUserInfo({}), {
    avatarUrl: "/static/images/logo.png",
    riderName: "骑手",
    phone: "",
  });
  assert.deepEqual(
    buildRiderProfileSettingsUserInfo({
      avatar: " https://cdn/avatar.png ",
      nickname: " 老张 ",
      phone: "13812345678",
    }),
    {
      avatarUrl: "https://cdn/avatar.png",
      riderName: "老张",
      phone: "13812345678",
    },
  );
  assert.equal(
    buildRiderProfileSettingsAboutSummary({ supportChatTitle: "无限科技客服" }),
    "无限科技客服正在为骑手提供履约和服务支持。",
  );
  assert.equal(
    buildRiderProfileSettingsAboutSummary({ aboutSummary: "骑手端关于说明" }),
    "骑手端关于说明",
  );
});

test("rider settings page loads rider data, routes, toggles and about dialog", async () => {
  const toasts = [];
  const modals = [];
  const routes = [];
  const updatedSettings = [];

  const component = createRiderProfileSettingsPageLogic({
    async fetchRiderInfo() {
      return {
        data: {
          avatar: "https://cdn.example.com/rider.png",
          name: " 骑手阿强 ",
          phone: "13812345678",
        },
      };
    },
    getAppVersionLabel() {
      return "1.0.1";
    },
    getCachedSupportRuntimeSettings() {
      return {
        title: "缓存客服",
        aboutSummary: "缓存简介",
      };
    },
    async loadSupportRuntimeSettings() {
      return {
        title: "无限科技客服",
        aboutSummary: "远端简介",
      };
    },
    notificationRuntime: {
      getSettings() {
        return {
          orderNotice: false,
        };
      },
      updateSettings(key, value) {
        updatedSettings.push({ key, value });
      },
    },
    uniApp: {
      navigateTo({ url }) {
        routes.push(url);
      },
      getStorageInfo({ success }) {
        success({ currentSize: 512 });
      },
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        modals.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  assert.deepEqual(page.settings, {
    ...DEFAULT_RIDER_PROFILE_SETTINGS,
    orderNotice: false,
  });
  assert.equal(page.appVersionLabel, "1.0.1");
  assert.equal(page.supportChatTitle, "缓存客服");
  assert.equal(page.aboutSummary, "缓存简介");

  await page.loadRiderInfo();
  await page.loadRuntimeConfig();
  page.calculateCacheSize();
  page.changeAvatar();
  page.editProfile();
  page.changePhone();
  page.changePassword();
  page.goToDeveloper();
  page.toggleSetting("vibrateNotice", { detail: { value: 1 } });
  page.showAbout();

  assert.equal(page.avatarUrl, "https://cdn.example.com/rider.png");
  assert.equal(page.riderName, "骑手阿强");
  assert.equal(page.phone, "13812345678");
  assert.equal(page.maskedPhone, "138****5678");
  assert.equal(page.cacheSize, "512 KB");
  assert.equal(page.supportChatTitle, "无限科技客服");
  assert.equal(page.aboutSummary, "远端简介");
  assert.deepEqual(updatedSettings, [{ key: "vibrateNotice", value: true }]);
  assert.deepEqual(routes, [
    "/pages/profile/avatar-upload",
    "/pages/profile/personal-info",
    "/pages/profile/change-phone",
    "/pages/profile/change-password",
    "/pages/profile/developer",
  ]);
  assert.deepEqual(toasts, [
    {
      title: "已开启震动提醒",
      icon: "none",
      duration: 1500,
    },
  ]);
  assert.equal(modals.length, 1);
  assert.equal(modals[0].title, "关于骑手端");
  assert.equal(modals[0].content, "远端简介");
});

test("rider settings page clears cache while preserving auth session and selected storage", () => {
  const storage = {
    access_token: "token-from-storage",
    socket_token: "socket-1",
    socket_token_account_key: "rider-1",
    notification_settings: { orderNotice: false },
    ignored_key: "ignored",
  };
  const persistedSessions = [];
  const writes = [];
  const toasts = [];

  const uniApp = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      writes.push({ key, value });
      storage[key] = value;
    },
    clearStorageSync() {
      Object.keys(storage).forEach((key) => {
        delete storage[key];
      });
    },
    getStorageInfo({ success }) {
      success({ currentSize: 1024 });
    },
    showToast(payload) {
      toasts.push(payload);
    },
    showModal(payload) {
      if (payload.title === "清除缓存") {
        payload.success({ confirm: true });
      }
    },
  };

  const component = createRiderProfileSettingsPageLogic({
    readRiderAuthSession() {
      return {
        token: "token-123",
        refreshToken: "refresh-123",
        tokenExpiresAt: 123456,
        accountId: "rider-1001",
        profile: {
          name: "骑手老刘",
          phone: "13812345678",
        },
      };
    },
    persistRiderAuthSession(payload) {
      persistedSessions.push(payload);
    },
    notificationRuntime: {
      getSettings() {
        return {
          messageNotice: false,
        };
      },
    },
    uniApp,
  });
  const page = instantiatePage(component);

  page.clearCache();

  assert.deepEqual(
    RIDER_PROFILE_SETTINGS_PRESERVED_STORAGE_KEYS,
    [
      "access_token",
      "socket_token",
      "socket_token_account_key",
      "notification_settings",
    ],
  );
  assert.equal(page.cacheSize, "1.00 MB");
  assert.deepEqual(persistedSessions, [
    {
      uniApp,
      token: "token-123",
      refreshToken: "refresh-123",
      tokenExpiresAt: 123456,
      profile: {
        name: "骑手老刘",
        phone: "13812345678",
      },
      extraStorageValues: {
        riderId: "rider-1001",
        riderName: "骑手老刘",
      },
    },
  ]);
  assert.deepEqual(writes, [
    { key: "access_token", value: "token-from-storage" },
    { key: "socket_token", value: "socket-1" },
    { key: "socket_token_account_key", value: "rider-1" },
    { key: "notification_settings", value: { orderNotice: false } },
  ]);
  assert.deepEqual(toasts, [{ title: "缓存已清除", icon: "success" }]);
  assert.deepEqual(page.settings, {
    ...DEFAULT_RIDER_PROFILE_SETTINGS,
    messageNotice: false,
  });
  assert.equal(storage.ignored_key, undefined);
});

test("rider settings page logs out rider, clears auth session and relaunches login", async () => {
  const reLaunches = [];
  const clearAuthCalls = [];
  const toasts = [];
  const statusUpdates = [];
  let clearPushRegistrationStateCallCount = 0;
  const timeoutDelays = [];
  const uniApp = {
    reLaunch(payload) {
      reLaunches.push(payload);
    },
    showToast(payload) {
      toasts.push(payload);
    },
    showModal(payload) {
      if (payload.title === "退出登录") {
        payload.success({ confirm: true });
      }
    },
  };

  const component = createRiderProfileSettingsPageLogic({
    async updateRiderStatus(value) {
      statusUpdates.push(value);
    },
    async unregisterCurrentPushDevice() {
      throw new Error("push unregister failed");
    },
    clearPushRegistrationState() {
      clearPushRegistrationStateCallCount += 1;
    },
    clearRiderAuthSession(payload) {
      clearAuthCalls.push(payload);
    },
    setTimeoutFn(callback, delay) {
      timeoutDelays.push(delay);
      callback();
    },
    uniApp,
  });
  const page = instantiatePage(component);

  page.handleLogout();
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(statusUpdates, [false]);
  assert.deepEqual(clearAuthCalls, [
    {
      uniApp,
      extraStorageKeys: RIDER_PROFILE_SETTINGS_LOGOUT_EXTRA_STORAGE_KEYS,
    },
  ]);
  assert.deepEqual(
    RIDER_PROFILE_SETTINGS_LOGOUT_EXTRA_STORAGE_KEYS,
    [
      "socket_token",
      "socket_token_account_key",
      "notification_settings",
      "rider_push_registration",
    ],
  );
  assert.equal(clearPushRegistrationStateCallCount, 2);
  assert.deepEqual(toasts, [{ title: "已退出登录", icon: "success" }]);
  assert.deepEqual(reLaunches, [{ url: "/pages/login/index" }]);
  assert.deepEqual(timeoutDelays, [500]);
});
