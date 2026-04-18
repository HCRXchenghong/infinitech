import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerCooperationPayload,
  buildConsumerInviteLink,
  buildConsumerInviteMessage,
  buildConsumerInviteSharePath,
  buildConsumerInviteShareRecordPayload,
  CONSUMER_INVITE_CODE_STORAGE_KEY,
  CONSUMER_INVITE_REGISTER_PAGE_URL,
  CONSUMER_PROFILE_STORAGE_KEY,
  createProfileCooperationPage,
  createProfileInviteFriendsPage,
  createDefaultConsumerCooperationForm,
  createDefaultConsumerCooperationTypeOptions,
  DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE,
  DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER,
  DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK,
  DEFAULT_CONSUMER_INVITE_SHARE_TITLE,
  DEFAULT_CONSUMER_INVITER_NAME,
  DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE,
  extractConsumerInviteCode,
  extractConsumerInviteLandingUrl,
  hasConsumerInviteCode,
  normalizeConsumerCooperationForm,
  normalizeConsumerCooperationTypeIndex,
  resolveConsumerInviteCodeDisplay,
  resolveConsumerInviteProfile,
  validateConsumerCooperationForm,
} from "./profile-outreach.js";

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  Object.entries(page.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });

  return instance;
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("profile outreach cooperation helpers normalize and validate forms", () => {
  const longContent = ` ${"x".repeat(520)} `;

  assert.deepEqual(createDefaultConsumerCooperationForm(), {
    subject: "",
    name: "",
    phone: "",
    content: "",
  });
  assert.deepEqual(createDefaultConsumerCooperationTypeOptions(), [
    { label: "用户反馈", value: "feedback" },
    { label: "商务合作", value: "cooperation" },
  ]);
  assert.equal(normalizeConsumerCooperationTypeIndex("1"), 1);
  assert.equal(normalizeConsumerCooperationTypeIndex("9"), 0);
  assert.deepEqual(
    normalizeConsumerCooperationForm({
      subject: "  品牌合作 ",
      name: " 小陈 ",
      phone: " 13812345678 ",
      content: longContent,
    }),
    {
      subject: "品牌合作",
      name: "小陈",
      phone: "13812345678",
      content: "x".repeat(500),
    },
  );
  assert.deepEqual(validateConsumerCooperationForm({}), {
    valid: false,
    message: DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE,
  });
  assert.deepEqual(
    validateConsumerCooperationForm({
      name: "小陈",
      phone: "13812345678",
      content: "希望洽谈合作",
    }),
    { valid: true, message: "" },
  );
});

test("profile outreach cooperation helpers build backend payloads", () => {
  assert.deepEqual(
    buildConsumerCooperationPayload(
      {
        subject: "",
        name: " 小陈 ",
        phone: "13812345678",
        content: " 希望了解商务合作 ",
      },
      1,
    ),
    {
      company: "未填写主题",
      contact_name: "小陈",
      contact_phone: "13812345678",
      cooperation_type: "cooperation",
      city: "",
      description: "希望了解商务合作",
    },
  );
});

test("profile outreach invite helpers normalize responses and copy content", () => {
  assert.equal(CONSUMER_PROFILE_STORAGE_KEY, "userProfile");
  assert.equal(CONSUMER_INVITE_CODE_STORAGE_KEY, "inviteCode");
  assert.equal(DEFAULT_CONSUMER_INVITER_NAME, "悦享e食用户");
  assert.equal(
    DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE,
    "暂时无法获取邀请码，请稍后再试。",
  );
  assert.equal(DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER, "暂未获取");
  assert.equal(
    extractConsumerInviteLandingUrl({
      data: { invite_landing_url: " https://example.com/invite " },
    }),
    "https://example.com/invite",
  );
  assert.equal(extractConsumerInviteCode({ code: "  INV123  " }), "INV123");
  assert.deepEqual(resolveConsumerInviteProfile({ id: "u-1", phone: "13812345678" }), {
    userId: "u-1",
    phone: "13812345678",
    name: DEFAULT_CONSUMER_INVITER_NAME,
  });
  assert.equal(hasConsumerInviteCode("  ABC  "), true);
  assert.equal(resolveConsumerInviteCodeDisplay(""), "暂未获取");
  assert.equal(
    buildConsumerInviteLink("https://example.com/path?scene=user", "AB C"),
    "https://example.com/path?scene=user&inviteCode=AB%20C",
  );
  assert.equal(
    buildConsumerInviteSharePath("AB C"),
    `${CONSUMER_INVITE_REGISTER_PAGE_URL}?inviteCode=AB%20C`,
  );
  assert.equal(
    buildConsumerInviteMessage({
      inviteCode: "INV123",
      inviteLink: "https://example.com/invite?inviteCode=INV123",
      inviterName: "小陈",
    }),
    "小陈邀请你体验悦享e食，邀请码：INV123。注册时填写邀请码即可绑定邀请关系，注册链接：https://example.com/invite?inviteCode=INV123",
  );
  assert.equal(
    buildConsumerInviteMessage(),
    DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK,
  );
  assert.deepEqual(
    buildConsumerInviteShareRecordPayload(
      { userId: "u-2", phone: "13900000000", nickname: "小林" },
      " INV123 ",
    ),
    {
      userId: "u-2",
      phone: "13900000000",
      code: "INV123",
    },
  );
  assert.equal(DEFAULT_CONSUMER_INVITE_SHARE_TITLE, "邀请你加入悦享e食");
});

test("profile outreach cooperation page submits and resets with shared payload rules", async () => {
  const loadingStates = [];
  const toasts = [];
  const submissions = [];
  let navigateBackCount = 0;
  const originalUni = globalThis.uni;

  globalThis.uni = {
    showLoading(payload) {
      loadingStates.push(`show:${payload.title}`);
    },
    hideLoading() {
      loadingStates.push("hide");
    },
    showToast(payload) {
      toasts.push(payload);
    },
    navigateBack() {
      navigateBackCount += 1;
    },
  };

  try {
    const page = createProfileCooperationPage({
      submitCooperation: async (payload) => {
        submissions.push(payload);
        return { success: true };
      },
    });
    const instance = createPageInstance(page);

    instance.handleTypeChange({ detail: { value: 1 } });
    instance.form = {
      subject: " 品牌合作 ",
      name: " 小陈 ",
      phone: " 13812345678 ",
      content: " 希望进一步沟通合作方案 ",
    };

    await instance.submitForm();
    instance.goBack();

    assert.deepEqual(submissions, [
      {
        company: "品牌合作",
        contact_name: "小陈",
        contact_phone: "13812345678",
        cooperation_type: "cooperation",
        city: "",
        description: "希望进一步沟通合作方案",
      },
    ]);
    assert.deepEqual(instance.form, createDefaultConsumerCooperationForm());
    assert.equal(instance.typeIndex, 0);
    assert.equal(instance.submitting, false);
    assert.deepEqual(loadingStates, ["show:提交中...", "hide"]);
    assert.equal(toasts.at(-1)?.title, "提交成功");
    assert.equal(navigateBackCount, 1);
  } finally {
    globalThis.uni = originalUni;
  }
});

test("profile outreach invite page initializes shared runtime data and records share behavior", async () => {
  const storage = {
    [CONSUMER_PROFILE_STORAGE_KEY]: {
      id: "user-8",
      phone: "13812345678",
      nickname: "小陈",
    },
  };
  const clipboard = [];
  const sharePayloads = [];
  const toasts = [];
  let navigateBackCount = 0;
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    setClipboardData({ data, success }) {
      clipboard.push(data);
      success?.();
    },
    showToast(payload) {
      toasts.push(payload);
    },
    navigateBack() {
      navigateBackCount += 1;
    },
  };

  try {
    const page = createProfileInviteFriendsPage({
      fetchInviteCode: async ({ userId, phone }) => {
        assert.equal(userId, "user-8");
        assert.equal(phone, "13812345678");
        return { code: "INV123" };
      },
      fetchPublicRuntimeSettings: async () => ({
        data: {
          invite_landing_url: "https://example.com/invite",
        },
      }),
      recordInviteShare: async (payload) => {
        sharePayloads.push(payload);
        return { success: true };
      },
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance);
    await flushPromises();

    assert.equal(instance.inviterName, "小陈");
    assert.equal(instance.inviteCode, "INV123");
    assert.equal(instance.inviteLandingURL, "https://example.com/invite");
    assert.equal(instance.codeStatus, "ready");
    assert.equal(storage[CONSUMER_INVITE_CODE_STORAGE_KEY], "INV123");
    assert.equal(
      page.onShareAppMessage.call(instance).path,
      `${CONSUMER_INVITE_REGISTER_PAGE_URL}?inviteCode=INV123`,
    );

    instance.shareInvite();
    await flushPromises();
    instance.goBack();

    assert.deepEqual(sharePayloads, [
      {
        userId: "user-8",
        phone: "13812345678",
        code: "INV123",
      },
    ]);
    assert.equal(clipboard[0], instance.inviteMessage);
    assert.equal(toasts.at(-1)?.title, "邀请文案已复制");
    assert.equal(navigateBackCount, 1);
  } finally {
    globalThis.uni = originalUni;
  }
});
