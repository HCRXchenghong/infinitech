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
