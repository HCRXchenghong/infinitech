function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = normalizeText(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return Boolean(value);
}

function normalizeRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const ADMIN_MERCHANT_LICENSE_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ADMIN_MERCHANT_LICENSE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ADMIN_MERCHANT_LICENSE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
];

export function formatAdminMerchantOnboardingSource(source) {
  if (source === "invite") {
    return "邀请链接";
  }
  if (source === "manual") {
    return "管理端手动创建";
  }
  return normalizeText(source) || "-";
}

export function formatAdminMerchantOnboardingType(inviteType) {
  if (inviteType === "merchant") {
    return "商户邀请";
  }
  if (inviteType === "rider") {
    return "骑手邀请";
  }
  return normalizeText(inviteType) || "-";
}

export function normalizeAdminMerchantOnboardingInfo(info) {
  const source = normalizeRecord(info);
  if (Object.keys(source).length === 0) {
    return null;
  }
  return {
    ...source,
    source: normalizeText(source.source),
    invite_type: normalizeText(source.invite_type ?? source.inviteType),
    submitted_at: source.submitted_at ?? source.submittedAt ?? "",
    invite_link_id: source.invite_link_id ?? source.inviteLinkId ?? "",
    invite_status: normalizeText(source.invite_status ?? source.inviteStatus),
    invite_expires_at: source.invite_expires_at ?? source.inviteExpiresAt ?? "",
  };
}

export function normalizeAdminMerchantProfile(source = {}) {
  const merchant = normalizeRecord(source);
  return {
    ...merchant,
    id: merchant.id ?? merchant.merchant_id ?? merchant.merchantId ?? "",
    name: normalizeText(merchant.name),
    owner_name: normalizeText(
      merchant.owner_name ?? merchant.ownerName ?? merchant.name,
    ),
    phone: normalizeText(merchant.phone),
    business_license_image: normalizeText(
      merchant.business_license_image ?? merchant.businessLicenseImage,
    ),
    onboarding_info: normalizeAdminMerchantOnboardingInfo(merchant.onboarding_info),
    created_at: merchant.created_at ?? merchant.createdAt ?? "",
    updated_at: merchant.updated_at ?? merchant.updatedAt ?? "",
  };
}

export function createAdminMerchantEditFormState(merchant = {}) {
  const normalized = normalizeAdminMerchantProfile(merchant);
  return {
    name: normalized.name,
    owner_name: normalized.owner_name,
    phone: normalized.phone,
    business_license_image: normalized.business_license_image,
  };
}

export function buildAdminMerchantUpdatePayload(form = {}) {
  const name = normalizeText(form.name);
  const ownerName = normalizeText(form.owner_name ?? form.ownerName ?? name);

  return {
    name,
    owner_name: ownerName || name,
    phone: normalizeText(form.phone),
    business_license_image: normalizeText(
      form.business_license_image ?? form.businessLicenseImage,
    ),
  };
}

export function validateAdminMerchantUpdateForm(form = {}) {
  const normalized = buildAdminMerchantUpdatePayload(form);
  if (!normalized.name || !normalized.owner_name || !normalized.phone) {
    return {
      valid: false,
      message: "请完整填写商户信息",
      normalized,
    };
  }
  if (!/^1[3-9]\d{9}$/.test(normalized.phone)) {
    return {
      valid: false,
      message: "请输入正确的手机号",
      normalized,
    };
  }
  return {
    valid: true,
    message: "",
    normalized,
  };
}

export function validateAdminMerchantLicenseFile(file = {}) {
  const fileName = normalizeText(file.name).toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const mimeType = normalizeText(file.type).toLowerCase();
  const hasValidMime = ADMIN_MERCHANT_LICENSE_MIME_TYPES.includes(mimeType);
  const hasValidExtension = ADMIN_MERCHANT_LICENSE_EXTENSIONS.includes(extension);

  if (!hasValidMime && !hasValidExtension) {
    return {
      valid: false,
      message: "营业执照仅支持 jpg/jpeg/png/gif/webp 格式",
    };
  }

  if (normalizeNumber(file.size, 0) > ADMIN_MERCHANT_LICENSE_MAX_FILE_SIZE) {
    return {
      valid: false,
      message: "营业执照图片不能超过 5MB",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function normalizeAdminMerchantShopSummary(source = {}) {
  const shop = normalizeRecord(source);
  return {
    ...shop,
    id: shop.id ?? shop.shop_id ?? shop.shopId ?? "",
    name: normalizeText(shop.name),
    logo: normalizeText(shop.logo),
    orderType: normalizeText(shop.orderType ?? shop.order_type, "外卖类"),
    rating: normalizeNumber(shop.rating, 0),
    monthlySales: normalizeNumber(shop.monthlySales ?? shop.monthly_sales, 0),
    isActive: normalizeBoolean(shop.isActive ?? shop.is_active, false),
  };
}

export function createAdminMerchantShopDraft() {
  return {
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
  };
}

export function buildAdminMerchantShopCreatePayload(shop = {}, merchantId = "") {
  return {
    ...createAdminMerchantShopDraft(),
    ...normalizeRecord(shop),
    merchant_id: normalizeText(merchantId),
  };
}
