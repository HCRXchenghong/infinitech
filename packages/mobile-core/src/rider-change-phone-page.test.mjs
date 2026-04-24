import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderChangePhoneNextProfile,
  createRiderChangePhonePageLogic,
  DEFAULT_RIDER_CHANGE_PHONE_STATE,
  RIDER_CHANGE_PHONE_LOGOUT_EXTRA_STORAGE_KEYS,
} from "./rider-change-phone-page.js";

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

test("rider change phone helpers expose stable defaults and merge auth profile", () => {
  assert.equal(DEFAULT_RIDER_CHANGE_PHONE_STATE.step, 1);
  assert.equal(DEFAULT_RIDER_CHANGE_PHONE_STATE.sendingOldCode, false);
  assert.deepEqual(RIDER_CHANGE_PHONE_LOGOUT_EXTRA_STORAGE_KEYS, [
    "socket_token",
    "socket_token_account_key",
    "rider_push_registration",
  ]);
  assert.deepEqual(
    buildRiderChangePhoneNextProfile(
      {
        profile: {
          name: "旧骑手",
          phone: "13800000000",
        },
      },
      {
        nickname: "新骑手",
      },
      "13812345678",
    ),
    {
      name: "旧骑手",
      nickname: "新骑手",
      phone: "13812345678",
    },
  );
});

test("rider change phone page completes verification and persists the refreshed rider session", async () => {
  const toasts = [];
  const requestCodeCalls = [];
  const verifyCalls = [];
  const changePhonePayloads = [];
  const persistCalls = [];
  const navigateBackCalls = [];
  const scheduledDelays = [];

  const component = createRiderChangePhonePageLogic({
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
    async verifySMSCodeCheck(phone, scene, code) {
      verifyCalls.push({ phone, scene, code });
      return {
        success: true,
        message: "验证通过",
      };
    },
    async changePhone(payload) {
      changePhonePayloads.push(payload);
      return {
        success: true,
        token: "new-rider-token",
        refreshToken: "new-rider-refresh",
        expiresIn: 3600,
        message: "手机号修改成功",
        user: {
          id: "rider-2",
          nickname: "骑手小张",
        },
      };
    },
    readRiderAuthSession() {
      return {
        accountId: "rider-1",
        profile: {
          name: "旧骑手",
          phone: "13812345678",
        },
      };
    },
    persistRiderAuthSession(payload) {
      persistCalls.push(payload);
    },
    persistRoleAuthSessionFromAuthResultImpl(payload) {
      persistCalls.push(payload);
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
  assert.equal(page.oldPhone, "13812345678");

  await page.sendOldCode();
  page.oldCode = "123456";
  await page.verifyOldPhone();
  page.newPhone = "13887654321";
  await page.sendNewCode();
  page.newCode = "654321";
  await page.submitChangePhone();

  assert.equal(page.step, 2);
  assert.deepEqual(requestCodeCalls, [
    {
      phone: "13812345678",
      scene: "change_phone_verify",
      extra: { targetType: "rider" },
    },
    {
      phone: "13887654321",
      scene: "change_phone_new",
      extra: { targetType: "rider" },
    },
  ]);
  assert.deepEqual(verifyCalls, [
    {
      phone: "13812345678",
      scene: "change_phone_verify",
      code: "123456",
    },
  ]);
  assert.deepEqual(changePhonePayloads, [
    {
      oldPhone: "13812345678",
      oldCode: "123456",
      newPhone: "13887654321",
      newCode: "654321",
    },
  ]);
  assert.equal(persistCalls.length, 1);
  assert.equal(persistCalls[0].response.token, "new-rider-token");
  assert.equal(persistCalls[0].profile.phone, "13887654321");
  assert.deepEqual(scheduledDelays, [800]);
  assert.deepEqual(navigateBackCalls, ["back"]);
  assert.deepEqual(toasts, [
    { title: "验证码已发送", icon: "success" },
    { title: "验证通过", icon: "success" },
    { title: "验证码已发送", icon: "success" },
    { title: "手机号修改成功", icon: "success" },
  ]);
});

test("rider change phone page clears rider auth and relaunches login when backend omits a new token", async () => {
  const clearCalls = [];
  const relaunchCalls = [];
  const toasts = [];
  const runtimeUni = {
    showToast(payload) {
      toasts.push(payload);
    },
    reLaunch(payload) {
      relaunchCalls.push(payload.url);
    },
  };

  const component = createRiderChangePhonePageLogic({
    async changePhone() {
      return {
        success: true,
        message: "手机号修改成功",
      };
    },
    readRiderAuthSession() {
      return {
        accountId: "rider-1",
        profile: {
          phone: "13812345678",
        },
      };
    },
    clearRiderAuthSession(payload) {
      clearCalls.push(payload);
    },
    uniApp: runtimeUni,
    setTimeoutFn(callback) {
      callback();
      return 1;
    },
  });
  const page = instantiatePage(component);
  page.oldPhone = "13812345678";
  page.oldCode = "123456";
  page.newPhone = "13887654321";
  page.newCode = "654321";

  await page.submitChangePhone();

  assert.equal(clearCalls.length, 1);
  assert.equal(clearCalls[0].uniApp, runtimeUni);
  assert.deepEqual(
    clearCalls[0].extraStorageKeys,
    RIDER_CHANGE_PHONE_LOGOUT_EXTRA_STORAGE_KEYS,
  );
  assert.deepEqual(relaunchCalls, ["/pages/login/index"]);
  assert.deepEqual(toasts, [
    {
      title: "手机号修改成功",
      icon: "success",
    },
  ]);
});
