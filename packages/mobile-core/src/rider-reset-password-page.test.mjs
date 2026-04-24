import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderResetPasswordPageLogic,
  DEFAULT_RIDER_RESET_PASSWORD_STATE,
} from "./rider-reset-password-page.js";

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

test("rider reset password page loads runtime, requests code, verifies ticket and redirects", async () => {
  const values = [];
  const toasts = [];
  const redirects = [];
  const storedTickets = [];
  const requestCodes = [];
  const verifyCalls = [];

  const component = createRiderResetPasswordPageLogic({
    getCachedPortalRuntimeSettings() {
      return { subtitle: "缓存副标题" };
    },
    async loadPortalRuntimeSettings() {
      return { subtitle: "最新副标题" };
    },
    async requestSMSCode(phone, scene) {
      requestCodes.push({ phone, scene });
      return { success: true, message: "验证码已发送" };
    },
    async verifySMSCodeCheck(phone, scene, code) {
      verifyCalls.push({ phone, scene, code });
      return { success: true };
    },
    uniApp: {
      setStorageSync(key, value) {
        storedTickets.push({ key, value });
      },
      showToast(payload) {
        toasts.push(payload);
      },
      redirectTo(payload) {
        redirects.push(payload.url);
      },
    },
  });
  const page = instantiatePage(component);

  assert.equal(DEFAULT_RIDER_RESET_PASSWORD_STATE.sendingCode, false);
  page.onLoad();
  assert.equal(page.portalRuntime.subtitle, "缓存副标题");
  page.phone = "13812345678";
  await page.loadPortalRuntime();
  assert.equal(page.portalRuntime.subtitle, "最新副标题");

  await page.sendCode();
  page.code = "123456";
  await page.submit();
  page.goLogin();

  assert.deepEqual(requestCodes, [
    {
      phone: "13812345678",
      scene: "rider_reset",
    },
  ]);
  assert.deepEqual(verifyCalls, [
    {
      phone: "13812345678",
      scene: "rider_reset",
      code: "123456",
    },
  ]);
  assert.deepEqual(storedTickets, [
    {
      key: "reset_password_data",
      value: {
        phone: "13812345678",
        code: "123456",
      },
    },
  ]);
  assert.deepEqual(redirects, [
    "/pages/set-password/index?phone=13812345678&code=123456",
    "/pages/login/index",
  ]);
  assert.deepEqual(toasts, [
    { title: "验证码已发送", icon: "success" },
  ]);
});

test("rider reset password page surfaces validation errors", async () => {
  const toasts = [];
  const component = createRiderResetPasswordPageLogic({
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  await page.sendCode();
  await page.submit();

  assert.deepEqual(toasts, [
    { title: "请输入正确手机号", icon: "none" },
    { title: "请输入正确手机号", icon: "none" },
  ]);
});
