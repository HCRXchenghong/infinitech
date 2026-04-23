import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthPortalPageUrl,
  buildConsumerAuthUserProfile,
  buildConsumerSetPasswordPageUrl,
  buildConsumerWechatReturnUrl,
  buildConsumerWechatStartUrl,
  createResetPasswordPage,
  createSetPasswordPage,
  DEFAULT_CONSUMER_AUTH_NICKNAME,
  normalizeConsumerAuthPhone,
  normalizeConsumerAuthExternalUrl,
  normalizeConsumerAuthMode,
  normalizeConsumerInviteCode,
  resolveConsumerPasswordResetTicket,
  shouldRedirectRegisteredConsumerToLogin,
  trimAuthPortalValue,
  validateConsumerNewPasswordForm,
} from "./auth-portal.js";

test("auth portal helpers normalize values, modes and invite codes", () => {
  assert.equal(trimAuthPortalValue(" 13800138000 "), "13800138000");
  assert.equal(normalizeConsumerAuthPhone(" 13800138000 "), "13800138000");
  assert.equal(normalizeConsumerAuthPhone("123"), "");
  assert.equal(normalizeConsumerAuthMode(" register "), "register");
  assert.equal(normalizeConsumerAuthMode(" anything "), "login");
  assert.equal(normalizeConsumerInviteCode(" ab12 "), "AB12");
  assert.equal(
    buildAuthPortalPageUrl("/pages/auth/login/index", {
      phone: " 13800138000 ",
      inviteCode: " ",
      mode: " register ",
    }),
    "/pages/auth/login/index?phone=13800138000&mode=register",
  );
});

test("auth portal helpers build safe wechat urls", () => {
  assert.equal(
    normalizeConsumerAuthExternalUrl(" https://example.com/auth/wechat/start "),
    "https://example.com/auth/wechat/start",
  );
  assert.equal(normalizeConsumerAuthExternalUrl("javascript:alert(1)"), "");
  assert.equal(
    buildConsumerWechatReturnUrl(
      "https://example.com/api/auth/wechat/start",
      "register",
      { inviteCode: " ab12 " },
    ),
    "https://example.com/#/pages/auth/wechat-callback/index?mode=register&inviteCode=AB12",
  );
  assert.equal(
    buildConsumerWechatStartUrl(
      "https://example.com/auth/wechat/start?channel=h5",
      "register",
      { inviteCode: " ab12 " },
    ),
    "https://example.com/auth/wechat/start?channel=h5&mode=register&returnUrl=https%3A%2F%2Fexample.com%2F%23%2Fpages%2Fauth%2Fwechat-callback%2Findex%3Fmode%3Dregister%26inviteCode%3DAB12",
  );
});

test("auth portal helpers build fallback profiles and login redirects consistently", () => {
  assert.deepEqual(
    buildConsumerAuthUserProfile(null, "13800138000"),
    {
      phone: "13800138000",
      nickname: DEFAULT_CONSUMER_AUTH_NICKNAME,
    },
  );
  assert.deepEqual(
    buildConsumerAuthUserProfile({ id: 1, nickname: "  ", phone: " " }, ""),
    {
      id: 1,
      nickname: DEFAULT_CONSUMER_AUTH_NICKNAME,
    },
  );
  assert.equal(shouldRedirectRegisteredConsumerToLogin("该手机号已注册"), true);
  assert.equal(shouldRedirectRegisteredConsumerToLogin("验证码发送失败"), false);
});

test("auth portal helpers normalize password reset routes and tickets", () => {
  assert.equal(
    buildConsumerSetPasswordPageUrl("13800138000", "123456"),
    "/pages/auth/set-password/index?phone=13800138000&code=123456",
  );
  assert.deepEqual(
    resolveConsumerPasswordResetTicket(
      { phone: "13800138000", code: "123456" },
      { phone: "13900139000", code: "654321" },
    ),
    { phone: "13800138000", code: "123456" },
  );
  assert.deepEqual(
    resolveConsumerPasswordResetTicket(
      { phone: "13800138001", code: "abc%20123" },
      {},
    ),
    { phone: "13800138001", code: "abc 123" },
  );
  assert.deepEqual(
    resolveConsumerPasswordResetTicket({}, { phone: "13800138002", code: "777777" }),
    { phone: "13800138002", code: "777777" },
  );
});

test("auth portal helpers validate new password form consistently", () => {
  assert.deepEqual(validateConsumerNewPasswordForm("", ""), {
    password: "",
    error: "请输入新密码",
  });
  assert.deepEqual(validateConsumerNewPasswordForm("12345", "12345"), {
    password: "",
    error: "密码至少 6 位",
  });
  assert.deepEqual(validateConsumerNewPasswordForm("123456", "654321"), {
    password: "",
    error: "两次密码不一致",
  });
  assert.deepEqual(validateConsumerNewPasswordForm(" 123456 ", "123456"), {
    password: "123456",
    error: "",
  });
});

test("auth portal reset password page stores verified ticket and redirects", async () => {
  const redirects = [];
  const storage = {};
  const originalUni = globalThis.uni;

  globalThis.uni = {
    showToast() {},
    setStorageSync(key, value) {
      storage[key] = value;
    },
    redirectTo({ url }) {
      redirects.push(url);
    },
  };

  try {
    const page = createResetPasswordPage({
      verifySMSCodeCheck: async () => ({ success: true }),
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      phone: "13800138000",
      code: "123456",
    };

    await instance.submit();

    assert.deepEqual(storage.reset_password_data, {
      phone: "13800138000",
      code: "123456",
    });
    assert.deepEqual(redirects, [
      "/pages/auth/set-password/index?phone=13800138000&code=123456",
    ]);
  } finally {
    globalThis.uni = originalUni;
  }
});

test("auth portal set password page clears reset ticket after success", async () => {
  const redirects = [];
  const removedKeys = [];
  const requestPayloads = [];
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    getStorageSync(key) {
      if (key === "reset_password_data") {
        return { phone: "13800138000", code: "123456" };
      }
      return null;
    },
    showToast() {},
    removeStorageSync(key) {
      removedKeys.push(key);
    },
    redirectTo({ url }) {
      redirects.push(url);
    },
    navigateBack() {},
  };

  try {
    const page = createSetPasswordPage({
      request: async (payload) => {
        requestPayloads.push(payload);
        return { success: true };
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      password: "123456",
      confirmPassword: "123456",
    };

    page.onLoad.call(instance, {});
    await instance.submit();

    assert.deepEqual(requestPayloads, [{
      url: "/api/set-new-password",
      method: "POST",
      data: {
        phone: "13800138000",
        code: "123456",
        nextPassword: "123456",
      },
    }]);
    assert.deepEqual(removedKeys, ["reset_password_data"]);
    assert.deepEqual(redirects, ["/pages/auth/login/index"]);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
