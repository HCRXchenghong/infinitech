import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderChangePasswordPageLogic,
  DEFAULT_RIDER_CHANGE_PASSWORD_STATE,
} from "./rider-change-password-page.js";

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

test("rider change password page loads rider phone, switches verify type, and clears countdown on unload", () => {
  const component = createRiderChangePasswordPageLogic({
    readRiderAuthIdentity() {
      return {
        riderPhone: "13812345678",
      };
    },
  });
  const page = instantiatePage(component);

  assert.equal(DEFAULT_RIDER_CHANGE_PASSWORD_STATE.verifyType, "password");
  page.onLoad();
  assert.equal(page.phone, "13812345678");

  page.code = "123456";
  page.switchVerifyType("password");
  assert.equal(page.code, "");

  page.oldPassword = "old-secret";
  page.switchVerifyType("code");
  assert.equal(page.verifyType, "code");
  assert.equal(page.oldPassword, "");

  let clearCount = 0;
  page.codeCooldownController = {
    clear() {
      clearCount += 1;
    },
  };
  page.onUnload();

  assert.equal(clearCount, 1);
  assert.equal(page.codeCooldownController, null);
});

test("rider change password page requests code and submits password changes through shared helpers", async () => {
  const toasts = [];
  const requestCodeCalls = [];
  const changePasswordPayloads = [];
  const navigateBackCalls = [];
  const scheduledDelays = [];

  const component = createRiderChangePasswordPageLogic({
    readRiderAuthIdentity() {
      return {
        riderPhone: "13812345678",
      };
    },
    async requestSMSCode(phone, scene, extra) {
      requestCodeCalls.push({ phone, scene, extra });
      return {
        success: true,
        message: "验证码已发送",
      };
    },
    async changePassword(payload) {
      changePasswordPayloads.push(payload);
      return {
        success: true,
        message: "密码修改成功",
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      navigateBack() {
        navigateBackCalls.push("back");
      },
    },
    setTimeoutFn(callback, delay) {
      scheduledDelays.push(delay);
      callback();
      return 1;
    },
  });
  const page = instantiatePage(component);

  page.onLoad();
  page.switchVerifyType("code");
  await page.sendCode();
  page.code = "123456";
  page.nextPassword = "next-secret";
  page.confirmPassword = "next-secret";
  await page.submitChangePassword();

  assert.deepEqual(requestCodeCalls, [
    {
      phone: "13812345678",
      scene: "rider_change_password",
      extra: { targetType: "rider" },
    },
  ]);
  assert.deepEqual(changePasswordPayloads, [
    {
      verifyType: "code",
      oldPassword: "",
      phone: "13812345678",
      code: "123456",
      nextPassword: "next-secret",
    },
  ]);
  assert.deepEqual(scheduledDelays, [1500]);
  assert.deepEqual(navigateBackCalls, ["back"]);
  assert.deepEqual(toasts, [
    {
      title: "验证码已发送",
      icon: "success",
    },
    {
      title: "密码修改成功",
      icon: "success",
    },
  ]);
});
