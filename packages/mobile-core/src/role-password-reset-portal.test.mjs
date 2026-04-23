import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ROLE_PASSWORD_RESET_STORAGE_KEY,
  buildRolePasswordResetSetPasswordPageUrl,
  createRolePasswordResetCooldownController,
  requestRolePasswordResetCode,
  resolveRolePasswordResetTicket,
  submitRolePasswordResetNextPassword,
  verifyRolePasswordResetCode,
} from "./role-password-reset-portal.js";

test("role password reset helpers normalize tickets and set-password urls", () => {
  assert.equal(DEFAULT_ROLE_PASSWORD_RESET_STORAGE_KEY, "reset_password_data");
  assert.equal(
    buildRolePasswordResetSetPasswordPageUrl(
      "/pages/set-password/index",
      "13800138000",
      "123456",
    ),
    "/pages/set-password/index?phone=13800138000&code=123456",
  );
  assert.deepEqual(
    resolveRolePasswordResetTicket(
      { phone: "13800138000" },
      { code: "123456" },
    ),
    {
      phone: "13800138000",
      code: "123456",
    },
  );
});

test("role password reset helpers request codes with shared cooldowns", async () => {
  const values = [];
  let tick = null;
  const controller = createRolePasswordResetCooldownController({
    setValue(value) {
      values.push(value);
    },
    createInterval(callback) {
      tick = callback;
      return "reset-timer";
    },
    clearIntervalFn() {},
  });

  const requests = [];
  const result = await requestRolePasswordResetCode({
    phoneValue: " 13800138000 ",
    scene: "rider_reset",
    extra: { targetType: "rider" },
    cooldownController: controller,
    requestSMSCode: async (phone, scene, extra) => {
      requests.push({ phone, scene, extra });
      return { success: true, message: "验证码已发送" };
    },
  });

  tick();

  assert.equal(result.ok, true);
  assert.deepEqual(requests, [{
    phone: "13800138000",
    scene: "rider_reset",
    extra: { targetType: "rider" },
  }]);
  assert.deepEqual(values.slice(0, 2), [60, 59]);
});

test("role password reset helpers verify object and positional sms checkers", async () => {
  const storage = {};
  const objectPayloads = [];
  const objectResult = await verifyRolePasswordResetCode({
    phoneValue: "13800138000",
    codeValue: "123456",
    scene: "merchant_reset",
    storage: {
      setStorageSync(key, value) {
        storage[key] = value;
      },
    },
    verifySMSCodeCheck: async (payload) => {
      objectPayloads.push(payload);
      return { success: true };
    },
    buildSetPasswordUrl: (phone, code) =>
      buildRolePasswordResetSetPasswordPageUrl(
        "/pages/set-password/index",
        phone,
        code,
      ),
  });

  assert.equal(objectResult.ok, true);
  assert.deepEqual(objectPayloads, [{
    phone: "13800138000",
    code: "123456",
    scene: "merchant_reset",
  }]);
  assert.deepEqual(storage.reset_password_data, {
    phone: "13800138000",
    code: "123456",
  });
  assert.equal(
    objectResult.redirectUrl,
    "/pages/set-password/index?phone=13800138000&code=123456",
  );

  const positionalPayloads = [];
  const positionalResult = await verifyRolePasswordResetCode({
    phoneValue: "13800138000",
    codeValue: "654321",
    scene: "rider_reset",
    verifySMSCodeCheck: async (phone, scene, code) => {
      positionalPayloads.push({ phone, scene, code });
      return { success: true };
    },
  });

  assert.equal(positionalResult.ok, true);
  assert.deepEqual(positionalPayloads, [{
    phone: "13800138000",
    scene: "rider_reset",
    code: "654321",
  }]);
});

test("role password reset helpers submit next password and clear tickets", async () => {
  const removedKeys = [];
  const submissions = [];
  const result = await submitRolePasswordResetNextPassword({
    phoneValue: "13800138000",
    codeValue: "123456",
    passwordValue: " new-secret ",
    confirmPasswordValue: " new-secret ",
    loginUrl: "/pages/login/index",
    storage: {
      removeStorageSync(key) {
        removedKeys.push(key);
      },
    },
    submitSetNewPassword: async (payload) => {
      submissions.push(payload);
      return { success: true, message: "密码设置成功" };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.redirectUrl, "/pages/login/index");
  assert.deepEqual(submissions, [{
    phone: "13800138000",
    code: "123456",
    nextPassword: "new-secret",
  }]);
  assert.deepEqual(removedKeys, ["reset_password_data"]);

  const invalidResult = await submitRolePasswordResetNextPassword({
    phoneValue: "13800138000",
    codeValue: "123456",
    passwordValue: "123",
    confirmPasswordValue: "123",
  });
  assert.equal(invalidResult.ok, false);
  assert.equal(invalidResult.reason, "invalid_password");
});
