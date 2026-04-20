import test from "node:test";
import assert from "node:assert/strict";

import {
  createLoginPage,
  createRegisterPage,
  createWechatCallbackPage,
} from "./auth-portal-pages.js";

function bindComputed(instance, computed = {}) {
  Object.keys(computed).forEach((key) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get() {
        return computed[key].call(instance);
      },
    });
  });
}

test("auth portal login page binds existing consumers and persists session", async () => {
  const tokenCalls = [];
  const bindCalls = [];
  const storage = {};
  const toasts = [];
  const switchTabs = [];
  const page = createLoginPage({
    async wechatBindLogin(payload) {
      bindCalls.push(payload);
      return {
        request_id: "req-login-bind-1",
        code: "OK",
        message: "绑定成功",
        success: true,
        data: {
          token: "token-1",
          refreshToken: "refresh-1",
          expiresIn: 7200,
          user: { id: 7, nickname: "测试用户" },
        },
      };
    },
    saveTokenInfo(...args) {
      tokenCalls.push(args);
    },
    getCachedConsumerAuthRuntimeSettings() {
      return {
        title: "悦享e食",
        subtitle: "欢迎回来",
        loginFooter: "auth footer",
      };
    },
    async loadConsumerAuthRuntimeSettings() {
      return {
        title: "悦享e食",
        subtitle: "欢迎回来",
        loginFooter: "auth footer",
      };
    },
    uniApp: {
      setStorageSync(key, value) {
        storage[key] = value;
      },
      showToast(payload) {
        toasts.push(payload);
      },
      switchTab(payload) {
        switchTabs.push(payload);
      },
      showModal() {},
      redirectTo() {},
      navigateTo() {},
    },
    setTimeoutImpl(callback) {
      callback();
      return 1;
    },
  });
  const instance = {
    ...page.data(),
    ...page.methods,
    password: "secret-123",
  };
  bindComputed(instance, page.computed);

  page.onLoad.call(instance, {
    loginType: "password",
    phone: " 13800138000 ",
    wechatBindToken: "bind-1",
    wechatNickname: "微信用户",
  });

  await instance.submit();

  assert.deepEqual(bindCalls, [
    { phone: "13800138000", password: "secret-123", bindToken: "bind-1" },
  ]);
  assert.deepEqual(tokenCalls, [["token-1", "refresh-1", 7200]]);
  assert.equal(storage.authMode, "user");
  assert.equal(storage.hasSeenWelcome, true);
  assert.equal(storage.userProfile.nickname, "测试用户");
  assert.deepEqual(toasts.at(-1), { title: "绑定成功", icon: "success" });
  assert.deepEqual(switchTabs, [{ url: "/pages/index/index" }]);
});

test("auth portal register page persists direct auth session when register returns token envelope", async () => {
  const tokenCalls = [];
  const storage = {};
  const switchTabs = [];
  let loginCalls = 0;
  const page = createRegisterPage({
    async verifySMSCodeCheck() {
      return { success: true };
    },
    async registerApi() {
      return {
        request_id: "req-register-1",
        code: "OK",
        message: "注册成功",
        success: true,
        data: {
          token: "register-token-1",
          refreshToken: "register-refresh-1",
          expiresIn: 7200,
          user: { id: 9, nickname: "新用户" },
        },
      };
    },
    async loginApi() {
      loginCalls += 1;
      return {};
    },
    saveTokenInfo(...args) {
      tokenCalls.push(args);
    },
    uniApp: {
      setStorageSync(key, value) {
        storage[key] = value;
      },
      showToast() {},
      switchTab(payload) {
        switchTabs.push(payload);
      },
      showModal() {},
      redirectTo() {},
    },
    setTimeoutImpl(callback) {
      callback();
      return 1;
    },
  });
  const instance = {
    ...page.data(),
    ...page.methods,
  };
  bindComputed(instance, page.computed);

  page.onLoad.call(instance, {});
  instance.nickname = "新用户";
  instance.phone = "13800138000";
  instance.password = "secret-123";
  instance.confirmPassword = "secret-123";
  instance.code = "123456";
  await instance.submit();

  assert.equal(loginCalls, 0);
  assert.deepEqual(tokenCalls, [["register-token-1", "register-refresh-1", 7200]]);
  assert.equal(storage.authMode, "user");
  assert.equal(storage.userProfile.nickname, "新用户");
  assert.deepEqual(switchTabs, [{ url: "/pages/index/index" }]);
});

test("auth portal register page enables captcha flow when backend requests it", async () => {
  const toasts = [];
  const page = createRegisterPage({
    getBaseUrl() {
      return "https://example.com";
    },
    async requestSMSCode() {
      return {
        needCaptcha: true,
        sessionId: "captcha-1",
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal() {},
      redirectTo() {},
    },
  });
  const instance = {
    ...page.data(),
    ...page.methods,
  };
  bindComputed(instance, page.computed);

  page.onLoad.call(instance, {});
  instance.phone = "13800138000";
  await instance.sendCode();

  assert.equal(instance.needCaptcha, true);
  assert.equal(instance.captchaSessionId, "captcha-1");
  assert.match(
    instance.captchaImageUrl,
    /^https:\/\/example\.com\/api\/captcha\?sessionId=captcha-1&t=\d+$/,
  );
  assert.deepEqual(toasts.at(-1), { title: "请输入图形验证码", icon: "none" });
});

test("auth portal wechat callback page redirects bind-required consumers", async () => {
  const redirects = [];
  const page = createWechatCallbackPage({
    async consumeWechatSession() {
      return {
        request_id: "req-wechat-session-1",
        code: "OK",
        message: "微信会话处理成功",
        success: true,
        data: {
          type: "bind_required",
          bindToken: "bind-2",
          nickname: "微信用户",
          avatarUrl: "https://example.com/avatar.png",
          message: "请继续绑定手机号",
        },
      };
    },
    uniApp: {
      redirectTo(payload) {
        redirects.push(payload);
      },
      showToast() {},
    },
    setTimeoutImpl(callback) {
      callback();
      return 1;
    },
  });
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  await page.onLoad.call(instance, {
    mode: "register",
    inviteCode: "ab12",
    wechatSession: "session-1",
  });

  assert.equal(instance.loading, false);
  assert.equal(instance.failed, false);
  assert.equal(instance.title, "需要绑定手机号");
  assert.equal(instance.detail, "请继续绑定手机号");
  assert.deepEqual(redirects, [
    {
      url: "/pages/auth/register/index?inviteCode=AB12&wechatBindToken=bind-2&wechatNickname=%E5%BE%AE%E4%BF%A1%E7%94%A8%E6%88%B7&wechatAvatarUrl=https%3A%2F%2Fexample.com%2Favatar.png",
    },
  ]);
});
