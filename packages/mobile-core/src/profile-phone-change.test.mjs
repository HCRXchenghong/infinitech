import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerPhoneChangePayload,
  CONSUMER_PHONE_CHANGE_NEW_SCENE,
  CONSUMER_PHONE_CHANGE_OLD_SCENE,
  createProfilePhoneChangePage,
  DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS,
  getConsumerPhoneChangeResponseMessage,
  getNextConsumerPhoneChangeCountdownValue,
  isConsumerPhoneChangeCodeValid,
  isConsumerPhoneChangeNewPhoneValid,
  isConsumerPhoneChangePhoneValid,
  maskConsumerPhoneChangePhone,
  normalizeConsumerPhoneChangeCode,
  normalizeConsumerPhoneChangeErrorMessage,
  normalizeConsumerPhoneChangeProfile,
  resolveConsumerPhoneChangeOldPhone,
  resolveConsumerPhoneChangeUserId,
} from "./profile-phone-change.js";

test("profile phone change helpers expose stable validation semantics", () => {
  assert.equal(CONSUMER_PHONE_CHANGE_OLD_SCENE, "change_phone_verify");
  assert.equal(CONSUMER_PHONE_CHANGE_NEW_SCENE, "change_phone_new");
  assert.equal(DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS, 60);
  assert.equal(maskConsumerPhoneChangePhone("13812345678"), "138****5678");
  assert.equal(maskConsumerPhoneChangePhone(""), "--");
  assert.equal(normalizeConsumerPhoneChangeCode(" 1234567 "), "123456");
  assert.equal(isConsumerPhoneChangePhoneValid("13812345678"), true);
  assert.equal(isConsumerPhoneChangeCodeValid("123456"), true);
  assert.equal(
    isConsumerPhoneChangeNewPhoneValid("13912345678", "13812345678"),
    true,
  );
  assert.equal(
    isConsumerPhoneChangeNewPhoneValid("13812345678", "13812345678"),
    false,
  );
});

test("profile phone change helpers normalize ids, errors and payloads", () => {
  assert.equal(
    resolveConsumerPhoneChangeOldPhone({ phone: " 13812345678 " }),
    "13812345678",
  );
  assert.equal(
    resolveConsumerPhoneChangeUserId({ id: "user-1", userId: "user-2" }),
    "user-1",
  );
  assert.equal(
    normalizeConsumerPhoneChangeErrorMessage({ data: { error: "验证码错误" } }),
    "验证码错误",
  );
  assert.equal(
    getConsumerPhoneChangeResponseMessage({ message: "修改成功" }, "fallback"),
    "修改成功",
  );
  assert.deepEqual(
    buildConsumerPhoneChangePayload({
      oldPhone: " 13812345678 ",
      oldCode: " 123456 ",
      newPhone: " 13912345678 ",
      newCode: " 654321 ",
    }),
    {
      oldPhone: "13812345678",
      oldCode: "123456",
      newPhone: "13912345678",
      newCode: "654321",
    },
  );
});

test("profile phone change helpers keep profile merge and countdown stable", () => {
  assert.deepEqual(
    normalizeConsumerPhoneChangeProfile(
      { id: "user-1", nickname: "小陈", phone: "13812345678" },
      { avatarUrl: "https://example.com/a.png" },
      "13912345678",
    ),
    {
      id: "user-1",
      nickname: "小陈",
      phone: "13912345678",
      avatarUrl: "https://example.com/a.png",
      userId: "user-1",
    },
  );
  assert.equal(getNextConsumerPhoneChangeCountdownValue(60), 59);
  assert.equal(getNextConsumerPhoneChangeCountdownValue(1), 0);
});

test("profile phone change page updates stored identity after submit", async () => {
  const storage = {
    userProfile: {
      id: "user-1",
      phone: "13812345678",
      nickname: "小陈",
    },
  };
  const savedTokens = [];
  let navigatedBack = 0;
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    showToast() {},
    navigateBack() {
      navigatedBack += 1;
    },
  };

  try {
    const page = createProfilePhoneChangePage({
      changeUserPhone: async () => ({
        success: true,
        token: "token-1",
        refreshToken: "refresh-1",
        expiresIn: 3600,
        user: { nickname: "小陈同学" },
      }),
      saveTokenInfo: (...args) => {
        savedTokens.push(args);
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      oldPhone: "13812345678",
      oldCode: "123456",
      newPhone: "13912345678",
      newCode: "654321",
      newCodeValid: true,
    };

    await instance.submit();

    assert.equal(storage.userProfile.phone, "13912345678");
    assert.equal(storage.userProfile.nickname, "小陈同学");
    assert.deepEqual(savedTokens, [["token-1", "refresh-1", 3600]]);
    assert.equal(navigatedBack, 1);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
