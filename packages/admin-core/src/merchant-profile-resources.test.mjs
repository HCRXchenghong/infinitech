import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_MERCHANT_LICENSE_EXTENSIONS,
  ADMIN_MERCHANT_LICENSE_MAX_FILE_SIZE,
  ADMIN_MERCHANT_LICENSE_MIME_TYPES,
  buildAdminMerchantShopCreatePayload,
  buildAdminMerchantUpdatePayload,
  createAdminMerchantEditFormState,
  createAdminMerchantShopDraft,
  formatAdminMerchantOnboardingSource,
  formatAdminMerchantOnboardingType,
  normalizeAdminMerchantOnboardingInfo,
  normalizeAdminMerchantProfile,
  normalizeAdminMerchantShopSummary,
  validateAdminMerchantLicenseFile,
  validateAdminMerchantUpdateForm,
} from "./merchant-profile-resources.js";

test("merchant profile resources normalize merchant profile state", () => {
  assert.equal(ADMIN_MERCHANT_LICENSE_MAX_FILE_SIZE, 5 * 1024 * 1024);
  assert.deepEqual(ADMIN_MERCHANT_LICENSE_MIME_TYPES, [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);
  assert.deepEqual(ADMIN_MERCHANT_LICENSE_EXTENSIONS, [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
  ]);
  assert.deepEqual(
    normalizeAdminMerchantOnboardingInfo({
      source: "invite",
      inviteType: "merchant",
      submittedAt: "2026-04-16 12:00:00",
      inviteLinkId: "link-1",
      inviteStatus: "active",
      inviteExpiresAt: "2026-05-01 00:00:00",
    }),
    {
      source: "invite",
      inviteType: "merchant",
      submittedAt: "2026-04-16 12:00:00",
      inviteLinkId: "link-1",
      inviteStatus: "active",
      inviteExpiresAt: "2026-05-01 00:00:00",
      invite_type: "merchant",
      submitted_at: "2026-04-16 12:00:00",
      invite_link_id: "link-1",
      invite_status: "active",
      invite_expires_at: "2026-05-01 00:00:00",
    },
  );
  assert.deepEqual(
    normalizeAdminMerchantProfile({
      id: 11,
      name: " 星河咖啡 ",
      ownerName: " 王五 ",
      phone: " 13800138000 ",
      businessLicenseImage: " https://license.png ",
      onboarding_info: {
        source: "invite",
        inviteType: "merchant",
      },
    }),
    {
      id: 11,
      name: "星河咖啡",
      ownerName: " 王五 ",
      phone: "13800138000",
      businessLicenseImage: " https://license.png ",
      onboarding_info: {
        source: "invite",
        inviteType: "merchant",
        invite_type: "merchant",
        submitted_at: "",
        invite_link_id: "",
        invite_status: "",
        invite_expires_at: "",
      },
      owner_name: "王五",
      business_license_image: "https://license.png",
      created_at: "",
      updated_at: "",
    },
  );
  assert.deepEqual(
    createAdminMerchantEditFormState({
      name: "星河咖啡",
      owner_name: "王五",
      phone: "13800138000",
      business_license_image: "https://license.png",
    }),
    {
      name: "星河咖啡",
      owner_name: "王五",
      phone: "13800138000",
      business_license_image: "https://license.png",
    },
  );
});

test("merchant profile resources validate merchant form and uploads", () => {
  assert.deepEqual(
    buildAdminMerchantUpdatePayload({
      name: " 星河咖啡 ",
      owner_name: " ",
      phone: " 13800138000 ",
      business_license_image: " https://license.png ",
    }),
    {
      name: "星河咖啡",
      owner_name: "星河咖啡",
      phone: "13800138000",
      business_license_image: "https://license.png",
    },
  );
  assert.deepEqual(validateAdminMerchantUpdateForm({}), {
    valid: false,
    message: "请完整填写商户信息",
    normalized: {
      name: "",
      owner_name: "",
      phone: "",
      business_license_image: "",
    },
  });
  assert.deepEqual(
    validateAdminMerchantUpdateForm({
      name: "星河咖啡",
      owner_name: "王五",
      phone: "123",
    }),
    {
      valid: false,
      message: "请输入正确的手机号",
      normalized: {
        name: "星河咖啡",
        owner_name: "王五",
        phone: "123",
        business_license_image: "",
      },
    },
  );
  assert.deepEqual(
    validateAdminMerchantUpdateForm({
      name: "星河咖啡",
      owner_name: "王五",
      phone: "13800138000",
    }),
    {
      valid: true,
      message: "",
      normalized: {
        name: "星河咖啡",
        owner_name: "王五",
        phone: "13800138000",
        business_license_image: "",
      },
    },
  );
  assert.deepEqual(
    validateAdminMerchantLicenseFile({
      name: "license.txt",
      type: "text/plain",
      size: 1024,
    }),
    {
      valid: false,
      message: "营业执照仅支持 jpg/jpeg/png/gif/webp 格式",
    },
  );
  assert.deepEqual(
    validateAdminMerchantLicenseFile({
      name: "license.png",
      type: "image/png",
      size: ADMIN_MERCHANT_LICENSE_MAX_FILE_SIZE + 1,
    }),
    {
      valid: false,
      message: "营业执照图片不能超过 5MB",
    },
  );
  assert.deepEqual(
    validateAdminMerchantLicenseFile({
      name: "license.png",
      type: "image/png",
      size: 1024,
    }),
    {
      valid: true,
      message: "",
    },
  );
});

test("merchant profile resources keep shop draft and onboarding semantics stable", () => {
  assert.equal(formatAdminMerchantOnboardingSource("invite"), "邀请链接");
  assert.equal(formatAdminMerchantOnboardingSource("manual"), "管理端手动创建");
  assert.equal(formatAdminMerchantOnboardingType("merchant"), "商户邀请");
  assert.equal(formatAdminMerchantOnboardingType("rider"), "骑手邀请");

  assert.deepEqual(createAdminMerchantShopDraft(), {
    name: "",
    orderType: "外卖类",
    businessCategory: "美食",
    rating: 5,
    monthlySales: 0,
    perCapita: 0,
    minPrice: 0,
    deliveryPrice: 0,
    deliveryTime: "30分钟",
    address: "",
    phone: "",
    coverImage: "",
    backgroundImage: "",
    logo: "",
    announcement: "",
    businessHours: "09:00-22:00",
    tags: [],
    discounts: [],
    isBrand: false,
    isFranchise: false,
    isActive: true,
  });
  assert.deepEqual(
    normalizeAdminMerchantShopSummary({
      id: 7,
      name: " 星河咖啡店 ",
      order_type: "到店",
      rating: "4.8",
      monthly_sales: "123",
      is_active: 1,
    }),
    {
      id: 7,
      name: "星河咖啡店",
      order_type: "到店",
      rating: 4.8,
      monthly_sales: "123",
      is_active: 1,
      logo: "",
      orderType: "到店",
      monthlySales: 123,
      isActive: true,
    },
  );
  assert.deepEqual(
    buildAdminMerchantShopCreatePayload(
      {
        name: "星河咖啡店",
        orderType: "到店",
      },
      "merchant-11",
    ),
    {
      name: "星河咖啡店",
      orderType: "到店",
      businessCategory: "美食",
      rating: 5,
      monthlySales: 0,
      perCapita: 0,
      minPrice: 0,
      deliveryPrice: 0,
      deliveryTime: "30分钟",
      address: "",
      phone: "",
      coverImage: "",
      backgroundImage: "",
      logo: "",
      announcement: "",
      businessHours: "09:00-22:00",
      tags: [],
      discounts: [],
      isBrand: false,
      isFranchise: false,
      isActive: true,
      merchant_id: "merchant-11",
    },
  );
});
