import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ROLE_PASSWORD_CHANGE_CODE_LENGTH,
  DEFAULT_ROLE_PASSWORD_CHANGE_COUNTDOWN_SECONDS,
  ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE,
  ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD,
  buildRolePasswordChangePayload,
  createRolePasswordChangeCountdownController,
  normalizeRolePasswordChangeErrorMessage,
  normalizeRolePasswordChangeVerifyType,
  requestRolePasswordChangeCode,
  submitRolePasswordChange,
  validateRolePasswordChangeCodeInput,
  validateRolePasswordChangeCurrentPasswordInput,
  validateRolePasswordChangeNextPasswordForm,
  validateRolePasswordChangePhoneInput,
  validateRolePasswordChangeSubmitInput,
} from "./role-password-change-portal.js";

test("role password change helpers normalize verification inputs and payloads", () => {
  assert.equal(ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD, "password");
  assert.equal(ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE, "code");
  assert.equal(DEFAULT_ROLE_PASSWORD_CHANGE_CODE_LENGTH, 6);
  assert.equal(DEFAULT_ROLE_PASSWORD_CHANGE_COUNTDOWN_SECONDS, 60);
  assert.equal(
    normalizeRolePasswordChangeVerifyType(" code "),
    ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE,
  );
  assert.equal(
    normalizeRolePasswordChangeVerifyType("unknown"),
    ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD,
  );
  assert.deepEqual(validateRolePasswordChangePhoneInput("123"), {
    phone: "",
    error: "请输入正确手机号",
  });
  assert.deepEqual(validateRolePasswordChangeCodeInput(" 123 "), {
    code: "",
    error: "请输入6位验证码",
  });
  assert.deepEqual(validateRolePasswordChangeCurrentPasswordInput(""), {
    password: "",
    error: "请输入原密码",
  });
  assert.deepEqual(validateRolePasswordChangeNextPasswordForm("123", "123"), {
    password: "",
    error: "密码至少6位",
  });
  assert.equal(
    normalizeRolePasswordChangeErrorMessage({ data: { error: "验证码错误" } }),
    "验证码错误",
  );
  assert.deepEqual(
    buildRolePasswordChangePayload({
      verifyType: " code ",
      phone: " 13812345678 ",
      code: " 123456 ",
      nextPassword: " next-secret ",
    }),
    {
      verifyType: "code",
      oldPassword: "",
      phone: "13812345678",
      code: "123456",
      nextPassword: "next-secret",
    },
  );
});

test("role password change helpers keep countdown semantics stable", () => {
  const countdownValues = [];
  let countdownTick = null;

  const controller = createRolePasswordChangeCountdownController({
    setValue(value) {
      countdownValues.push(value);
    },
    createInterval(callback) {
      countdownTick = callback;
      return "password-change-timer";
    },
    clearIntervalFn() {},
  });

  controller.start(2);
  countdownTick();
  countdownTick();

  assert.deepEqual(countdownValues, [2, 1, 0]);
});

test("role password change helpers request sms code consistently", async () => {
  const invalidResult = await requestRolePasswordChangeCode({
    phoneValue: "123",
  });
  assert.deepEqual(invalidResult, {
    ok: false,
    reason: "invalid_phone",
    phone: "",
    message: "请输入正确手机号",
  });

  const requestedPayloads = [];
  let cooldownStarts = 0;
  const sendResult = await requestRolePasswordChangeCode({
    phoneValue: "13812345678",
    scene: "rider_change_password",
    extra: { targetType: "rider" },
    requestSMSCode: async (phone, scene, extra) => {
      requestedPayloads.push({ phone, scene, extra });
      return { success: true, message: "验证码已发送" };
    },
    cooldownController: {
      start() {
        cooldownStarts += 1;
      },
    },
  });

  assert.deepEqual(requestedPayloads, [{
    phone: "13812345678",
    scene: "rider_change_password",
    extra: { targetType: "rider" },
  }]);
  assert.equal(cooldownStarts, 1);
  assert.equal(sendResult.ok, true);
  assert.equal(sendResult.message, "验证码已发送");

  const networkResult = await requestRolePasswordChangeCode({
    phoneValue: "13812345678",
    requestSMSCode: async () => {
      throw { data: { error: "发送过于频繁" } };
    },
  });
  assert.equal(networkResult.ok, false);
  assert.equal(networkResult.message, "发送过于频繁");
});

test("role password change helpers validate submit payloads for both verify types", async () => {
  assert.deepEqual(
    validateRolePasswordChangeSubmitInput({
      verifyTypeValue: "password",
      oldPasswordValue: "",
      nextPasswordValue: "next-secret",
      confirmPasswordValue: "next-secret",
    }),
    {
      ok: false,
      reason: "invalid_current_password",
      verifyType: "password",
      payload: null,
      message: "请输入原密码",
    },
  );

  assert.deepEqual(
    validateRolePasswordChangeSubmitInput({
      verifyTypeValue: "code",
      phoneValue: "13812345678",
      codeValue: "",
      nextPasswordValue: "next-secret",
      confirmPasswordValue: "next-secret",
    }),
    {
      ok: false,
      reason: "invalid_code",
      verifyType: "code",
      payload: null,
      message: "请输入6位验证码",
    },
  );

  const submitPayloads = [];
  const codeSubmitResult = await submitRolePasswordChange({
    verifyTypeValue: "code",
    phoneValue: " 13812345678 ",
    codeValue: " 123456 ",
    nextPasswordValue: " next-secret ",
    confirmPasswordValue: " next-secret ",
    changePassword: async (payload) => {
      submitPayloads.push(payload);
      return { success: true, message: "密码修改成功" };
    },
  });

  assert.deepEqual(submitPayloads, [{
    verifyType: "code",
    oldPassword: "",
    phone: "13812345678",
    code: "123456",
    nextPassword: "next-secret",
  }]);
  assert.equal(codeSubmitResult.ok, true);
  assert.equal(codeSubmitResult.message, "密码修改成功");

  const passwordSubmitResult = await submitRolePasswordChange({
    verifyTypeValue: "password",
    oldPasswordValue: " old-secret ",
    nextPasswordValue: " new-secret ",
    confirmPasswordValue: " new-secret ",
    changePassword: async (payload) => ({
      success: true,
      message: payload.oldPassword === "old-secret" ? "密码修改成功" : "unexpected",
    }),
  });

  assert.equal(passwordSubmitResult.ok, true);
  assert.deepEqual(passwordSubmitResult.payload, {
    verifyType: "password",
    oldPassword: "old-secret",
    phone: "",
    code: "",
    nextPassword: "new-secret",
  });

  const failedSubmitResult = await submitRolePasswordChange({
    verifyTypeValue: "password",
    oldPasswordValue: "old-secret",
    nextPasswordValue: "new-secret",
    confirmPasswordValue: "new-secret",
    changePassword: async () => {
      throw { errMsg: "request:fail timeout" };
    },
  });
  assert.equal(failedSubmitResult.ok, false);
  assert.equal(failedSubmitResult.message, "request:fail timeout");
});
