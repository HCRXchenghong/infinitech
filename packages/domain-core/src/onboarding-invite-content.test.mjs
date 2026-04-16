import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOnboardingInviteLetterParagraphs,
  buildOnboardingInviteSubmitPayload,
  createOnboardingInviteForm,
  formatOnboardingInviteDateTime,
  getOnboardingInviteTitle,
  getOnboardingInviteTypeLabel,
  isOnboardingInvitePhoneValid,
  ONBOARDING_INVITE_IMAGE_MAX_MB,
  validateOnboardingInviteImageFile,
  validateOnboardingInviteSubmission,
} from "./onboarding-invite-content.js";

test("onboarding invite content exposes stable defaults and labels", () => {
  assert.deepEqual(createOnboardingInviteForm(), {
    merchant_name: "",
    owner_name: "",
    phone: "",
    business_license_image: "",
    name: "",
    id_card_image: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    password: "",
  });
  assert.equal(getOnboardingInviteTypeLabel("merchant"), "商户");
  assert.equal(getOnboardingInviteTitle("rider"), "骑手入职邀请");
  assert.equal(buildOnboardingInviteLetterParagraphs("merchant").length, 3);
  assert.equal(ONBOARDING_INVITE_IMAGE_MAX_MB, 5);
});

test("onboarding invite content validates phone, images and submissions", () => {
  assert.equal(isOnboardingInvitePhoneValid("13800138000"), true);
  assert.equal(isOnboardingInvitePhoneValid("10086"), false);
  assert.deepEqual(
    validateOnboardingInviteImageFile({
      type: "text/plain",
      size: 100,
    }),
    { valid: false, message: "请上传图片文件" },
  );
  assert.deepEqual(
    validateOnboardingInviteImageFile({
      type: "image/png",
      size: 6 * 1024 * 1024,
    }),
    { valid: false, message: "图片不能超过5MB" },
  );
  assert.deepEqual(
    validateOnboardingInviteSubmission("merchant", {
      phone: "13800138000",
      password: "123456",
      merchant_name: "店铺A",
      owner_name: "张三",
      business_license_image: "https://example.com/a.png",
    }),
    { valid: true, message: "" },
  );
  assert.deepEqual(
    validateOnboardingInviteSubmission("rider", {
      phone: "13800138000",
      password: "123456",
      name: "李四",
      id_card_image: "https://example.com/id.png",
      emergency_contact_name: "王五",
      emergency_contact_phone: "10086",
    }),
    { valid: false, message: "请输入正确的紧急联系人电话" },
  );
});

test("onboarding invite content builds payloads and formats time consistently", () => {
  assert.deepEqual(
    buildOnboardingInviteSubmitPayload("merchant", {
      merchant_name: "店铺A",
      owner_name: "张三",
      phone: "13800138000",
      business_license_image: "license.png",
      password: "123456",
    }),
    {
      merchant_name: "店铺A",
      owner_name: "张三",
      phone: "13800138000",
      business_license_image: "license.png",
      password: "123456",
    },
  );
  assert.deepEqual(
    buildOnboardingInviteSubmitPayload("unknown", {}),
    null,
  );
  assert.equal(
    formatOnboardingInviteDateTime("2026-04-16T08:09:10"),
    "2026-04-16 08:09:10",
  );
});
