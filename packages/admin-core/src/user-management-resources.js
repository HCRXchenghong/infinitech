function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

export const DEFAULT_ADMIN_USER_TYPE = "customer";
export const ADMIN_USER_CACHE_LIMIT = 20;

export function normalizeAdminUserSearchKeyword(value) {
  return normalizeText(value);
}

export function createAdminUserListParams(options = {}) {
  const params = {
    page: Number(options.page || 1),
    limit: Number(options.limit || 15),
    type: normalizeText(options.type || DEFAULT_ADMIN_USER_TYPE) || DEFAULT_ADMIN_USER_TYPE,
  };

  const search = normalizeAdminUserSearchKeyword(options.searchKeyword);
  if (search) {
    params.search = search;
  }

  return params;
}

export function createAdminUserCacheKey(options = {}) {
  const params = createAdminUserListParams(options);
  return `${params.page}-${params.limit}-${params.type}-${params.search || ""}`;
}

export function createEmptyAdminUserForm() {
  return {
    phone: "",
    name: "",
    password: "",
  };
}

export function validateAdminUserCreateForm(form = {}) {
  const phone = normalizeText(form.phone);
  const name = normalizeText(form.name);
  const password = String(form.password || "");

  if (!phone || !name || !password) {
    return {
      valid: false,
      message: "请填写完整信息",
      normalized: { phone, name, password },
    };
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      valid: false,
      message: "请输入正确的手机号",
      normalized: { phone, name, password },
    };
  }

  if (password.length < 6) {
    return {
      valid: false,
      message: "密码至少需要6位",
      normalized: { phone, name, password },
    };
  }

  return {
    valid: true,
    message: "",
    normalized: { phone, name, password },
  };
}

export function buildAdminUserCreatePayload(form = {}, type = DEFAULT_ADMIN_USER_TYPE) {
  const validation = validateAdminUserCreateForm(form);
  return {
    phone: validation.normalized.phone,
    name: validation.normalized.name,
    password: validation.normalized.password,
    type: normalizeText(type || DEFAULT_ADMIN_USER_TYPE) || DEFAULT_ADMIN_USER_TYPE,
  };
}

export function formatAdminUserDateTime(value) {
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

export function getAdminUserVipLabel(level) {
  return normalizeText(level) || "普通用户";
}

export function getAdminUserVipTagType(level) {
  switch (normalizeText(level)) {
    case "至尊VIP":
      return "warning";
    case "尊贵VIP":
      return "danger";
    case "黄金VIP":
      return "success";
    case "优质VIP":
      return "info";
    default:
      return "";
  }
}
