import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderSetPasswordPageLogic,
  DEFAULT_RIDER_SET_PASSWORD_STATE,
} from "./rider-set-password-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider set password page loads ticket, submits password reset and redirects", async () => {
  const toasts = [];
  const redirects = [];
  const navigateBackCalls = [];
  const submissions = [];
  const removedKeys = [];
  const scheduledDelays = [];

  const component = createRiderSetPasswordPageLogic({
    getCachedPortalRuntimeSettings() {
      return { subtitle: "缓存设置密码" };
    },
    async loadPortalRuntimeSettings() {
      return { subtitle: "最新设置密码" };
    },
    async submitSetNewPassword(payload) {
      submissions.push(payload);
      return {
        success: true,
        message: "密码设置成功",
      };
    },
    uniApp: {
      getStorageSync() {
        return {
          phone: "13812345678",
          code: "123456",
        };
      },
      removeStorageSync(key) {
        removedKeys.push(key);
      },
      showToast(payload) {
        toasts.push(payload);
      },
      redirectTo(payload) {
        redirects.push(payload.url);
      },
      navigateBack() {
        navigateBackCalls.push("back");
      },
    },
    setTimeoutFn(callback, delay) {
      scheduledDelays.push(delay);
      callback();
    },
  });
  const page = instantiatePage(component);

  assert.equal(DEFAULT_RIDER_SET_PASSWORD_STATE.submitting, false);
  page.onLoad({});
  assert.equal(page.portalRuntime.subtitle, "缓存设置密码");
  await page.loadPortalRuntime();
  assert.equal(page.portalRuntime.subtitle, "最新设置密码");
  assert.equal(page.phone, "13812345678");
  assert.equal(page.code, "123456");

  page.password = "next-secret";
  page.confirmPassword = "next-secret";
  await page.submit();
  page.goLogin();

  assert.deepEqual(submissions, [
    {
      phone: "13812345678",
      code: "123456",
      nextPassword: "next-secret",
    },
  ]);
  assert.deepEqual(removedKeys, ["reset_password_data"]);
  assert.deepEqual(scheduledDelays, [1500]);
  assert.deepEqual(redirects, ["/pages/login/index", "/pages/login/index"]);
  assert.deepEqual(navigateBackCalls, []);
  assert.deepEqual(toasts, [
    { title: "密码设置成功", icon: "success" },
  ]);
});

test("rider set password page handles missing tickets and invalid form input", async () => {
  const toasts = [];
  const redirects = [];
  const navigateBackCalls = [];
  const scheduledDelays = [];

  const component = createRiderSetPasswordPageLogic({
    uniApp: {
      getStorageSync() {
        return {};
      },
      showToast(payload) {
        toasts.push(payload);
      },
      redirectTo(payload) {
        redirects.push(payload.url);
      },
      navigateBack() {
        navigateBackCalls.push("back");
      },
    },
    setTimeoutFn(callback, delay) {
      scheduledDelays.push(delay);
      callback();
    },
  });
  const page = instantiatePage(component);

  page.onLoad({});
  await page.submit();

  assert.deepEqual(toasts, [
    { title: "请先完成验证码校验", icon: "none" },
    { title: "校验信息已失效，请重新验证", icon: "none" },
  ]);
  assert.deepEqual(redirects, ["/pages/reset-password/index"]);
  assert.deepEqual(navigateBackCalls, ["back"]);
  assert.deepEqual(scheduledDelays, [1500, 1500]);
});
