import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderLoginPayload,
  createRiderLoginPageLogic,
  DEFAULT_RIDER_LOGIN_STATE,
  formatRiderLoginErrorMessage,
} from "./rider-login-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }
  if (typeof component.onUnload === "function") {
    instance.onUnload = component.onUnload.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider login helpers normalize payloads and auth-specific error copy", () => {
  assert.equal(DEFAULT_RIDER_LOGIN_STATE.loginType, "code");
  assert.deepEqual(
    buildRiderLoginPayload({
      loginType: "code",
      phone: " 13812345678 ",
      code: " 123456 ",
    }),
    {
      phone: "13812345678",
      code: "123456",
    },
  );
  assert.deepEqual(
    buildRiderLoginPayload({
      loginType: "password",
      phone: " 13812345678 ",
      password: " secret ",
    }),
    {
      phone: "13812345678",
      password: "secret",
    },
  );
  assert.equal(
    formatRiderLoginErrorMessage({ error: "rider not found" }),
    "该手机号不是骑手账号，请使用骑手账号登录",
  );
  assert.equal(
    formatRiderLoginErrorMessage({ data: { message: "invalid password" } }),
    "登录密码错误，请重试",
  );
});

test("rider login page loads runtime, sends code, persists session and redirects on success", async () => {
  const toasts = [];
  const switchTabs = [];
  const navigations = [];
  const requestCodes = [];
  const logins = [];
  const persistedSessions = [];
  const socketConnects = [];
  const scheduledDelays = [];

  const component = createRiderLoginPageLogic({
    getCachedPortalRuntimeSettings() {
      return {
        title: "缓存骑手登录",
      };
    },
    async loadPortalRuntimeSettings() {
      return {
        title: "骑手登录",
        subtitle: "欢迎回来",
      };
    },
    async requestSMSCode(phone, scene) {
      requestCodes.push({ phone, scene });
      return {
        success: true,
        message: "验证码已发送",
      };
    },
    async riderLogin(payload) {
      logins.push(payload);
      return {
        success: true,
        token: "rider-token",
        refreshToken: "rider-refresh",
        expiresIn: 3600,
        user: {
          id: "rider-1",
          name: "骑手A",
        },
      };
    },
    persistRiderAuthSession(payload) {
      persistedSessions.push(payload);
    },
    getAppFn() {
      return {
        $vm: {
          tryConnectSocket() {
            socketConnects.push("connect");
          },
        },
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      switchTab(payload) {
        switchTabs.push(payload.url);
      },
      navigateTo(payload) {
        navigations.push(payload.url);
      },
    },
    setTimeoutFn(callback, delay) {
      scheduledDelays.push(delay);
      callback();
    },
  });
  const page = instantiatePage(component);

  page.onLoad();
  assert.equal(page.portalRuntime.title, "缓存骑手登录");
  await page.loadPortalRuntime();
  assert.equal(page.portalRuntime.title, "骑手登录");
  assert.equal(page.portalRuntime.subtitle, "欢迎回来");

  page.phone = "13812345678";
  await page.sendCode();
  page.goResetPassword();

  page.code = "123456";
  await page.submit();

  page.switchLoginType("password");
  page.password = "secret";
  await page.submit();

  assert.deepEqual(requestCodes, [
    {
      phone: "13812345678",
      scene: "rider_login",
    },
  ]);
  assert.deepEqual(navigations, ["/pages/reset-password/index"]);
  assert.deepEqual(logins, [
    {
      phone: "13812345678",
      code: "123456",
    },
    {
      phone: "13812345678",
      password: "secret",
    },
  ]);
  assert.equal(persistedSessions.length, 2);
  assert.equal(socketConnects.length, 2);
  assert.deepEqual(scheduledDelays, [500, 500]);
  assert.deepEqual(switchTabs, ["/pages/hall/index", "/pages/hall/index"]);
  assert.deepEqual(toasts, [
    { title: "验证码已发送", icon: "success" },
    { title: "登录成功", icon: "success" },
    { title: "登录成功", icon: "success" },
  ]);
});

test("rider login page shows validation and backend error messages", async () => {
  const toasts = [];
  const component = createRiderLoginPageLogic({
    async riderLogin() {
      return {
        success: false,
        error: "invalid code",
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  await page.submit();
  page.phone = "13812345678";
  await page.submit();
  page.code = "123456";
  await page.submit();

  assert.deepEqual(toasts, [
    { title: "请输入正确手机号", icon: "none" },
    { title: "请输入验证码", icon: "none" },
    { title: "验证码错误或已过期", icon: "none" },
  ]);
});
