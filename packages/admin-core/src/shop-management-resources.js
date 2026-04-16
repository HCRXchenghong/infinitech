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

function normalizeInteger(value, { fallback = 0, min, max } = {}) {
  let parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    parsed = fallback;
  }
  parsed = Math.floor(parsed);
  if (typeof min === "number") {
    parsed = Math.max(min, parsed);
  }
  if (typeof max === "number") {
    parsed = Math.min(max, parsed);
  }
  return parsed;
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

function firstNonEmptyString(...values) {
  for (const item of values) {
    const normalized = normalizeText(item);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

export function normalizeAdminShopTextList(source) {
  if (Array.isArray(source)) {
    return source.map((item) => normalizeText(item)).filter(Boolean);
  }
  if (typeof source === "string") {
    const text = source.trim();
    if (!text) {
      return [];
    }
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(item)).filter(Boolean);
      }
    } catch {
      return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function splitAdminShopText(text) {
  return String(text || "")
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseAdminShopImages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return [];
    }
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(item)).filter(Boolean);
      }
    } catch {
      return splitAdminShopText(text);
    }
  }
  return [];
}

export function getAdminMerchantQualification(source = {}) {
  return firstNonEmptyString(
    source.merchantQualification,
    source.merchant_qualification,
    source.merchantQualificationImage,
    source.businessLicense,
    source.businessLicenseImage,
  );
}

export function getAdminFoodBusinessLicense(source = {}) {
  return firstNonEmptyString(
    source.foodBusinessLicense,
    source.food_business_license,
    source.foodBusinessLicenseImage,
    source.foodLicense,
    source.foodLicenseImage,
  );
}

export function formatAdminShopDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return normalizeText(value) || "-";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatAdminShopDate(value) {
  if (!value) {
    return "-";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return normalizeText(value) || "-";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeAdminShopDateValue(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const matched = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) {
      return matched[1];
    }
  }
  return formatAdminShopDate(value);
}

export function formatAdminShopAge(value) {
  const age = normalizeNumber(value, 0);
  if (age <= 0) {
    return "-";
  }
  return `${Math.floor(age)} 岁`;
}

export function normalizeAdminShopDetail(source = {}) {
  const detail = source && typeof source === "object" ? source : {};
  return {
    ...detail,
    id: detail.id ?? detail.shop_id ?? detail.shopId ?? "",
    name: normalizeText(detail.name),
    phone: normalizeText(detail.phone),
    orderType: normalizeText(detail.orderType ?? detail.order_type),
    merchantType: normalizeText(detail.merchantType ?? detail.merchant_type),
    businessCategoryKey: normalizeText(
      detail.businessCategoryKey ?? detail.business_category_key,
    ),
    businessCategory: normalizeText(
      detail.businessCategory ?? detail.business_category ?? detail.category,
    ),
    category: normalizeText(detail.category),
    rating: normalizeNumber(detail.rating, 0),
    monthlySales: normalizeInteger(detail.monthlySales ?? detail.monthly_sales, {
      fallback: 0,
      min: 0,
    }),
    businessHours: normalizeText(detail.businessHours ?? detail.business_hours),
    address: normalizeText(detail.address),
    announcement: normalizeText(detail.announcement),
    isActive: normalizeBoolean(detail.isActive ?? detail.is_active, false),
    isTodayRecommended: normalizeBoolean(
      detail.isTodayRecommended ?? detail.is_today_recommended,
      false,
    ),
    todayRecommendPosition: normalizeInteger(
      detail.todayRecommendPosition ?? detail.today_recommend_position,
      {
        fallback: 0,
        min: 0,
      },
    ),
    merchantQualification: getAdminMerchantQualification(detail),
    foodBusinessLicense: getAdminFoodBusinessLicense(detail),
    logo: normalizeText(detail.logo),
    coverImage: normalizeText(detail.coverImage ?? detail.cover_image),
    backgroundImage: normalizeText(
      detail.backgroundImage ?? detail.background_image,
    ),
    tags: normalizeAdminShopTextList(detail.tags),
    discounts: normalizeAdminShopTextList(detail.discounts),
    menuNotes: normalizeText(detail.menuNotes ?? detail.menu_notes),
    employeeName: normalizeText(detail.employeeName ?? detail.employee_name),
    employeeAge: normalizeInteger(detail.employeeAge ?? detail.employee_age, {
      fallback: 0,
      min: 0,
    }),
    employeePosition: normalizeText(
      detail.employeePosition ?? detail.employee_position,
    ),
    idCardFrontImage: normalizeText(
      detail.idCardFrontImage ?? detail.id_card_front_image,
    ),
    idCardBackImage: normalizeText(
      detail.idCardBackImage ?? detail.id_card_back_image,
    ),
    idCardExpireAt: normalizeAdminShopDateValue(
      detail.idCardExpireAt ?? detail.id_card_expire_at,
    ),
    healthCertFrontImage: normalizeText(
      detail.healthCertFrontImage ?? detail.health_cert_front_image,
    ),
    healthCertBackImage: normalizeText(
      detail.healthCertBackImage ?? detail.health_cert_back_image,
    ),
    healthCertExpireAt: normalizeAdminShopDateValue(
      detail.healthCertExpireAt ?? detail.health_cert_expire_at,
    ),
    employmentStartAt: normalizeAdminShopDateValue(
      detail.employmentStartAt ?? detail.employment_start_at,
    ),
    employmentEndAt: normalizeAdminShopDateValue(
      detail.employmentEndAt ?? detail.employment_end_at,
    ),
  };
}

export function createAdminShopReviewListParams(options = {}) {
  return {
    page: normalizeInteger(options.page, { fallback: 1, min: 1 }),
    pageSize: normalizeInteger(options.pageSize ?? options.limit, {
      fallback: 200,
      min: 1,
    }),
  };
}

export function createAdminShopBasicFormState(
  shop = {},
  { merchantTypeOption = {}, businessCategoryOption = {} } = {},
) {
  const detail = normalizeAdminShopDetail(shop);
  return {
    name: detail.name,
    phone: detail.phone,
    orderType:
      normalizeText(detail.orderType || merchantTypeOption.legacyOrderTypeLabel) ||
      "外卖类",
    merchantType:
      normalizeText(merchantTypeOption.key || detail.merchantType) || "takeout",
    businessCategoryKey:
      normalizeText(businessCategoryOption.key || detail.businessCategoryKey) ||
      "food",
    businessCategory:
      normalizeText(businessCategoryOption.label || detail.businessCategory) ||
      "美食",
    rating: normalizeNumber(detail.rating, 0),
    monthlySales: normalizeInteger(detail.monthlySales, { fallback: 0, min: 0 }),
    businessHours: detail.businessHours,
    address: detail.address,
    announcement: detail.announcement,
    isActive: detail.isActive,
    isTodayRecommended: detail.isTodayRecommended,
    todayRecommendPosition: normalizeInteger(detail.todayRecommendPosition, {
      fallback: 1,
      min: 1,
    }),
    merchantQualification: detail.merchantQualification,
    foodBusinessLicense: detail.foodBusinessLicense,
  };
}

export function buildAdminShopBasicPayload(
  form = {},
  { merchantTypeOption = {}, businessCategoryOption = {} } = {},
) {
  return {
    name: normalizeText(form.name),
    phone: normalizeText(form.phone),
    orderType:
      normalizeText(merchantTypeOption.legacyOrderTypeLabel || form.orderType) ||
      "外卖类",
    merchantType:
      normalizeText(merchantTypeOption.key || form.merchantType) || "takeout",
    businessCategoryKey:
      normalizeText(
        businessCategoryOption.key || form.businessCategoryKey || form.businessCategory,
      ) || "food",
    businessCategory:
      normalizeText(businessCategoryOption.label || form.businessCategory) || "美食",
    rating: normalizeNumber(form.rating, 0),
    monthlySales: normalizeInteger(form.monthlySales, { fallback: 0, min: 0 }),
    businessHours: normalizeText(form.businessHours),
    address: normalizeText(form.address),
    announcement: normalizeText(form.announcement),
    isActive: normalizeBoolean(form.isActive, false),
    isTodayRecommended: normalizeBoolean(form.isTodayRecommended, false),
    todayRecommendPosition: normalizeInteger(form.todayRecommendPosition, {
      fallback: 1,
      min: 1,
    }),
    merchantQualification: normalizeText(form.merchantQualification),
    foodBusinessLicense: normalizeText(form.foodBusinessLicense),
  };
}

export function createAdminShopImageFormState(shop = {}) {
  const detail = normalizeAdminShopDetail(shop);
  return {
    logo: detail.logo,
    coverImage: detail.coverImage,
    backgroundImage: detail.backgroundImage,
  };
}

export function buildAdminShopImagePayload(form = {}) {
  return {
    logo: normalizeText(form.logo),
    coverImage: normalizeText(form.coverImage),
    backgroundImage: normalizeText(form.backgroundImage),
  };
}

export function createAdminShopTagFormState(shop = {}) {
  const detail = normalizeAdminShopDetail(shop);
  return {
    tagsText: detail.tags.join(","),
    discountsText: detail.discounts.join(","),
  };
}

export function buildAdminShopTagPayload(form = {}) {
  return {
    tags: splitAdminShopText(form.tagsText),
    discounts: splitAdminShopText(form.discountsText),
  };
}

export function createAdminShopMenuFormState(shop = {}) {
  const detail = normalizeAdminShopDetail(shop);
  return {
    menuNotes: detail.menuNotes,
  };
}

export function buildAdminShopMenuPayload(form = {}) {
  return {
    menuNotes: normalizeText(form.menuNotes),
  };
}

export function createAdminShopStaffFormState(shop = {}) {
  const detail = normalizeAdminShopDetail(shop);
  return {
    employeeName: detail.employeeName,
    employeeAge: normalizeInteger(detail.employeeAge, { fallback: 0 }),
    employeePosition: detail.employeePosition,
    idCardFrontImage: detail.idCardFrontImage,
    idCardBackImage: detail.idCardBackImage,
    idCardExpireAt: normalizeAdminShopDateValue(detail.idCardExpireAt),
    healthCertFrontImage: detail.healthCertFrontImage,
    healthCertBackImage: detail.healthCertBackImage,
    healthCertExpireAt: normalizeAdminShopDateValue(detail.healthCertExpireAt),
    employmentStartAt: normalizeAdminShopDateValue(detail.employmentStartAt),
    employmentEndAt: normalizeAdminShopDateValue(detail.employmentEndAt),
  };
}

export function hasAdminShopStaffRecord(shop = {}) {
  const record = createAdminShopStaffFormState(shop);
  return Boolean(
    record.employeeName ||
      record.employeeAge > 0 ||
      record.employeePosition ||
      record.idCardFrontImage ||
      record.idCardBackImage ||
      record.idCardExpireAt ||
      record.healthCertFrontImage ||
      record.healthCertBackImage ||
      record.healthCertExpireAt ||
      record.employmentStartAt ||
      record.employmentEndAt,
  );
}

export function validateAdminShopStaffForm(form = {}) {
  const normalized = createAdminShopStaffFormState(form);
  const rawAge = Number(form.employeeAge ?? 0);
  if (!normalized.employeeName) {
    return {
      valid: false,
      message: "请填写员工姓名",
      normalized,
    };
  }

  if (Number.isFinite(rawAge) && rawAge < 0) {
    return {
      valid: false,
      message: "年龄不能小于 0",
      normalized: {
        ...normalized,
        employeeAge: rawAge,
      },
    };
  }

  if (
    normalized.employmentStartAt &&
    normalized.employmentEndAt &&
    normalized.employmentStartAt > normalized.employmentEndAt
  ) {
    return {
      valid: false,
      message: "离职时间不能早于入职时间",
      normalized,
    };
  }

  return {
    valid: true,
    message: "",
    normalized,
  };
}

export function buildAdminShopStaffPayload(form = {}) {
  const validation = validateAdminShopStaffForm(form);
  return {
    employeeName: validation.normalized.employeeName,
    employeeAge: normalizeInteger(validation.normalized.employeeAge, {
      fallback: 0,
      min: 0,
    }),
    employeePosition: validation.normalized.employeePosition,
    idCardFrontImage: validation.normalized.idCardFrontImage,
    idCardBackImage: validation.normalized.idCardBackImage,
    idCardExpireAt: validation.normalized.idCardExpireAt || null,
    healthCertFrontImage: validation.normalized.healthCertFrontImage,
    healthCertBackImage: validation.normalized.healthCertBackImage,
    healthCertExpireAt: validation.normalized.healthCertExpireAt || null,
    employmentStartAt: validation.normalized.employmentStartAt || null,
    employmentEndAt: validation.normalized.employmentEndAt || null,
  };
}

export function normalizeAdminShopReview(raw = {}, defaultShopId = "") {
  return {
    id: String(raw.id || ""),
    shopId: String(raw.shopId || raw.shop_id || defaultShopId || ""),
    userId: String(raw.userId || raw.user_id || ""),
    orderId: String(raw.orderId || raw.order_id || ""),
    userName: normalizeText(raw.userName || raw.user_name, "匿名用户"),
    userAvatar: normalizeText(raw.userAvatar || raw.user_avatar),
    rating: normalizeNumber(raw.rating, 0),
    content: normalizeText(raw.content),
    reply: normalizeText(raw.reply),
    images: parseAdminShopImages(raw.images),
    createdAt: raw.created_at || raw.createdAt || "",
  };
}

export function createEmptyAdminShopReviewForm() {
  return {
    userId: "",
    orderId: "",
    userName: "",
    userAvatar: "",
    rating: 5,
    content: "",
    images: [],
    reply: "",
  };
}

function normalizeAdminShopReviewDraft(form = {}) {
  return {
    userId: normalizeText(form.userId),
    orderId: normalizeText(form.orderId),
    userName: normalizeText(form.userName),
    userAvatar: normalizeText(form.userAvatar),
    rating: normalizeNumber(form.rating, 0),
    content: normalizeText(form.content),
    images: parseAdminShopImages(form.images),
    reply: normalizeText(form.reply),
    id: String(form.id || ""),
    shopId: String(form.shopId || form.shop_id || ""),
    createdAt: form.created_at || form.createdAt || "",
  };
}

export function createAdminShopReviewFormState(review = {}) {
  const normalized = normalizeAdminShopReview(review);
  return {
    ...createEmptyAdminShopReviewForm(),
    ...normalized,
    rating: normalized.rating > 0 ? normalized.rating : 5,
  };
}

export function validateAdminShopReviewForm(form = {}) {
  const normalized = {
    ...createEmptyAdminShopReviewForm(),
    ...normalizeAdminShopReviewDraft(form),
  };
  if (!normalized.content) {
    return {
      valid: false,
      message: "评论内容不能为空",
      normalized,
    };
  }

  const rating = normalizeNumber(normalized.rating, 0);
  if (rating <= 0 || rating > 5) {
    return {
      valid: false,
      message: "评分范围必须在 1 - 5 之间",
      normalized,
    };
  }

  return {
    valid: true,
    message: "",
    normalized: {
      ...normalized,
      rating,
      userName: normalized.userName || "匿名用户",
    },
  };
}

export function buildAdminShopReviewPayload(form = {}, shopId = "") {
  const validation = validateAdminShopReviewForm(form);
  return {
    shopId: normalizeText(shopId),
    userId: normalizeText(validation.normalized.userId),
    orderId: normalizeText(validation.normalized.orderId),
    userName: normalizeText(validation.normalized.userName, "匿名用户"),
    userAvatar: normalizeText(validation.normalized.userAvatar),
    rating: validation.normalized.rating,
    content: normalizeText(validation.normalized.content),
    images: parseAdminShopImages(validation.normalized.images),
    reply: normalizeText(validation.normalized.reply),
  };
}
