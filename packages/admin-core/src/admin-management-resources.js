import { extractPaginatedItems } from "../../contracts/src/http.js";

export const ADMIN_MANAGEMENT_ROLE_OPTIONS = [
  { label: "管理员", value: "admin" },
  { label: "超级管理员", value: "super_admin" },
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

function normalizeAdminRole(value, fallback = "admin") {
  const role = normalizeText(value).toLowerCase();
  if (role === "admin" || role === "super_admin") {
    return role;
  }
  return fallback;
}

export function normalizeAdminManagementRecord(raw = {}) {
  const source = asRecord(raw);
  const id = normalizeText(source.id, normalizeText(source.legacyId));
  const phone = normalizeText(source.phone);
  const name = normalizeText(source.name);
  const type = normalizeAdminRole(source.type, "admin");
  const createdAt = source.created_at ?? source.createdAt ?? "";

  return {
    ...source,
    id,
    legacyId: normalizeText(source.legacyId, id),
    uid: normalizeText(source.uid),
    tsid: normalizeText(source.tsid),
    phone,
    name,
    type,
    created_at: createdAt,
    createdAt,
  };
}

export function extractAdminManagementPage(payload = {}) {
  const page = extractPaginatedItems(payload, {
    listKeys: ["admins", "items", "list"],
  });

  return {
    ...page,
    items: Array.isArray(page.items)
      ? page.items.map((item) => normalizeAdminManagementRecord(item))
      : [],
  };
}

export function filterAdminManagementRecords(items = [], keyword = "") {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  const records = Array.isArray(items) ? items : [];
  if (!normalizedKeyword) {
    return records.map((item) => normalizeAdminManagementRecord(item));
  }

  return records
    .map((item) => normalizeAdminManagementRecord(item))
    .filter((item) => {
      const phone = normalizeText(item.phone).toLowerCase();
      const name = normalizeText(item.name).toLowerCase();
      return phone.includes(normalizedKeyword) || name.includes(normalizedKeyword);
    });
}

export function resolveAdminManagementId(admin = {}) {
  const source = normalizeAdminManagementRecord(admin);
  return normalizeText(source.id || source.legacyId || source.uid || source.tsid);
}

export function getAdminManagementRoleLabel(type) {
  const role = normalizeAdminRole(type, "");
  if (role === "super_admin") {
    return "超级管理员";
  }
  if (role === "admin") {
    return "管理员";
  }
  return normalizeText(type, "管理员");
}

export function getAdminManagementRoleTagType(type) {
  const role = normalizeAdminRole(type, "");
  if (role === "super_admin") {
    return "danger";
  }
  if (role === "admin") {
    return "";
  }
  return "info";
}

export function formatAdminManagementTime(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return "-";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function createAdminManagementFormState(source = {}) {
  const admin = normalizeAdminManagementRecord(source);
  return {
    phone: admin.phone,
    name: admin.name,
    type: admin.type || "admin",
    password: "",
  };
}

export function createAdminManagementFormRules(options = {}) {
  const requirePassword = options.requirePassword !== false;
  return {
    phone: [
      { required: true, message: "请输入手机号", trigger: "blur" },
      { pattern: /^1[3-9]\d{9}$/, message: "手机号格式不正确", trigger: "blur" },
    ],
    name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
    type: [{ required: true, message: "请选择管理员类型", trigger: "change" }],
    password: requirePassword
      ? [{ required: true, message: "请输入密码", trigger: "blur" }]
      : [],
  };
}

export function getAdminManagementDialogTitle(editingAdmin) {
  return editingAdmin ? "编辑管理员" : "添加管理员";
}

export function buildAdminManagementPayload(form = {}, options = {}) {
  const includePassword = options.includePassword !== false;
  const payload = {
    phone: normalizeText(form.phone),
    name: normalizeText(form.name),
    type: normalizeAdminRole(form.type, ""),
  };

  if (includePassword) {
    payload.password = normalizeText(form.password);
  }

  return payload;
}

export function validateAdminManagementPayload(payload = {}, options = {}) {
  const requirePassword = options.requirePassword !== false;
  const phone = normalizeText(payload.phone);
  const name = normalizeText(payload.name);
  const type = normalizeAdminRole(payload.type, "");
  const password = normalizeText(payload.password);

  if (!phone) {
    return "请输入手机号";
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return "手机号格式不正确";
  }
  if (!name) {
    return "请输入姓名";
  }
  if (!type) {
    return "请选择管理员类型";
  }
  if (requirePassword && !password) {
    return "请输入密码";
  }
  return "";
}

export function buildAdminManagementCredentialReceiptMeta(admin = {}) {
  const record = normalizeAdminManagementRecord(admin);
  const adminId = resolveAdminManagementId(record);
  return {
    scene: "admin-reset-password",
    subject: `管理员 ${record.name || record.phone || adminId}`,
    account: record.phone || adminId,
  };
}
