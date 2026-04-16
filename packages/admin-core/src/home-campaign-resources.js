const DEFAULT_HOME_CAMPAIGN_PROMOTE_LABEL = "推广";
const DEFAULT_HOME_CAMPAIGN_OBJECT_TYPE = "shop";
const DEFAULT_HOME_CAMPAIGN_STATUS = "draft";

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

function unwrapObjectPayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

function readNamedList(source = {}, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }
  return [];
}

function normalizeHomeCampaignObjectType(value, fallback = "") {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "shop" || normalized === "product") {
    return normalized;
  }
  return fallback;
}

function normalizeHomeCampaignStatus(value, fallback = DEFAULT_HOME_CAMPAIGN_STATUS) {
  const normalized = normalizeText(value).toLowerCase();
  if (
    [
      "draft",
      "approved",
      "active",
      "scheduled",
      "paused",
      "rejected",
      "ended",
    ].includes(normalized)
  ) {
    return normalized;
  }
  return fallback;
}

function createDefaultHomeCampaignTimeRange(now = new Date()) {
  const startAt = now instanceof Date ? now : new Date(now);
  const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    startAt: formatAdminHomeCampaignDateTime(startAt),
    endAt: formatAdminHomeCampaignDateTime(endAt),
  };
}

export function formatAdminHomeCampaignDateTime(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return normalizeText(value);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function createAdminHomeCampaignFilters(overrides = {}) {
  return {
    objectType: normalizeHomeCampaignObjectType(overrides.objectType, ""),
    status: normalizeHomeCampaignStatus(overrides.status, ""),
    city: normalizeText(overrides.city),
    businessCategory: normalizeText(overrides.businessCategory),
  };
}

export function buildAdminHomeCampaignListQuery(filters = {}) {
  const query = {};
  const objectType = normalizeHomeCampaignObjectType(filters.objectType, "");
  const status = normalizeHomeCampaignStatus(filters.status, "");
  const city = normalizeText(filters.city);
  const businessCategory = normalizeText(filters.businessCategory);

  if (objectType) {
    query.objectType = objectType;
  }
  if (status) {
    query.status = status;
  }
  if (city) {
    query.city = city;
  }
  if (businessCategory) {
    query.businessCategory = businessCategory;
  }

  return query;
}

export function buildAdminHomeSlotQuery(filters = {}) {
  const query = {};
  const city = normalizeText(filters.city);
  const businessCategory = normalizeText(filters.businessCategory);

  if (city) {
    query.city = city;
  }
  if (businessCategory) {
    query.businessCategory = businessCategory;
  }

  return query;
}

export function createAdminHomeCampaignForm(source = {}, options = {}) {
  const defaults = createDefaultHomeCampaignTimeRange(options.now);
  const locked = normalizeBoolean(options.locked, false);

  return {
    objectType: normalizeHomeCampaignObjectType(
      source.objectType,
      DEFAULT_HOME_CAMPAIGN_OBJECT_TYPE,
    ),
    targetId: normalizeText(source.targetId),
    slotPosition: Math.max(1, normalizeNumber(source.slotPosition, 1)),
    city: normalizeText(source.city),
    businessCategory: normalizeText(source.businessCategory),
    status: normalizeHomeCampaignStatus(
      source.status,
      locked ? "approved" : DEFAULT_HOME_CAMPAIGN_STATUS,
    ),
    isPositionLocked: normalizeBoolean(source.isPositionLocked, locked),
    promoteLabel: normalizeText(
      source.promoteLabel,
      DEFAULT_HOME_CAMPAIGN_PROMOTE_LABEL,
    ),
    contractNo: normalizeText(source.contractNo),
    serviceRecordNo: normalizeText(source.serviceRecordNo),
    remark: normalizeText(source.remark),
    startAt: source.startAt
      ? formatAdminHomeCampaignDateTime(source.startAt)
      : defaults.startAt,
    endAt: source.endAt
      ? formatAdminHomeCampaignDateTime(source.endAt)
      : defaults.endAt,
  };
}

export function getAdminHomeCampaignDialogTitle(editingId, form = {}) {
  if (normalizeText(editingId)) {
    return "编辑首页推广计划";
  }
  if (normalizeBoolean(form.isPositionLocked, false)) {
    return "锁定位次";
  }
  return "新建首页推广计划";
}

export function createAdminHomeCampaignTargetOptions(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const id = normalizeText(item?.id, normalizeText(item?.uid));
    return {
      id,
      name: normalizeText(item?.name, `ID ${id || "-"}`),
    };
  });
}

export function extractAdminHomeCampaignNamedList(payload = {}, field) {
  return readNamedList(unwrapObjectPayload(payload), [field, "items", "list"]);
}

export function extractAdminHomeCampaignPage(payload = {}) {
  return {
    items: extractAdminHomeCampaignNamedList(payload, "campaigns"),
  };
}

export function extractAdminHomeSlotCollections(payload = {}) {
  const source = unwrapObjectPayload(payload);
  return {
    products: readNamedList(source, ["products", "items", "list"]),
    shops: readNamedList(source, ["shops", "stores", "list"]),
  };
}

export function getAdminHomeCampaignObjectTypeLabel(objectType) {
  const normalized = normalizeHomeCampaignObjectType(objectType, "");
  if (normalized === "shop") {
    return "商户";
  }
  if (normalized === "product") {
    return "商品";
  }
  return normalizeText(objectType, "-");
}

export function getAdminHomeCampaignObjectTypeTagType(objectType) {
  const normalized = normalizeHomeCampaignObjectType(objectType, "");
  if (normalized === "shop") {
    return "success";
  }
  if (normalized === "product") {
    return "warning";
  }
  return "info";
}

export function getAdminHomeCampaignStatusLabel(status) {
  const normalized = normalizeHomeCampaignStatus(status, "");
  const map = {
    draft: "草稿",
    approved: "已审核",
    active: "投放中",
    scheduled: "已排期",
    paused: "已暂停",
    rejected: "已驳回",
    ended: "已结束",
  };
  return map[normalized] || normalizeText(status, "-");
}

export function getAdminHomeCampaignStatusTagType(status) {
  switch (normalizeHomeCampaignStatus(status, "")) {
    case "active":
      return "success";
    case "approved":
    case "scheduled":
      return "primary";
    case "paused":
      return "warning";
    case "rejected":
    case "ended":
      return "info";
    default:
      return "";
  }
}

export function getAdminHomeCampaignPositionSourceLabel(source) {
  const normalized = normalizeText(source).toLowerCase();
  const map = {
    featured: "推荐位",
    organic: "自然排序",
    paid_campaign: "付费计划",
    manual_locked: "手工锁位",
  };
  return map[normalized] || normalizeText(source, "-");
}

export function getAdminHomeCampaignPositionSourceTagType(source) {
  switch (normalizeText(source).toLowerCase()) {
    case "manual_locked":
      return "danger";
    case "paid_campaign":
      return "warning";
    case "featured":
      return "success";
    default:
      return "info";
  }
}

export function getAdminHomeCampaignLockLabel(locked) {
  return normalizeBoolean(locked, false) ? "是" : "否";
}

export function getAdminHomeCampaignLockTagType(locked) {
  return normalizeBoolean(locked, false) ? "danger" : "info";
}

export function getAdminHomeCampaignPromoteLabel(item = {}) {
  if (!normalizeBoolean(item.isPromoted, false)) {
    return "-";
  }
  return normalizeText(item.promoteLabel, DEFAULT_HOME_CAMPAIGN_PROMOTE_LABEL);
}

export function canAdminHomeCampaignPerformAction(row = {}, action) {
  const status = normalizeHomeCampaignStatus(
    row.effectiveStatus || row.status,
    "",
  );
  if (action === "approve") {
    return status === "draft" || status === "rejected";
  }
  if (action === "reject") {
    return status === "draft" || status === "approved" || status === "scheduled";
  }
  if (action === "pause") {
    return status === "approved" || status === "active" || status === "scheduled";
  }
  if (action === "resume") {
    return status === "paused";
  }
  return false;
}

export function buildAdminHomeCampaignPayload(form = {}) {
  return {
    objectType: normalizeHomeCampaignObjectType(form.objectType, ""),
    targetId: normalizeText(form.targetId),
    slotPosition: normalizeNumber(form.slotPosition, 0),
    city: normalizeText(form.city),
    businessCategory: normalizeText(form.businessCategory),
    status: normalizeHomeCampaignStatus(form.status, DEFAULT_HOME_CAMPAIGN_STATUS),
    isPositionLocked: normalizeBoolean(form.isPositionLocked, false),
    promoteLabel: normalizeText(
      form.promoteLabel,
      DEFAULT_HOME_CAMPAIGN_PROMOTE_LABEL,
    ),
    contractNo: normalizeText(form.contractNo),
    serviceRecordNo: normalizeText(form.serviceRecordNo),
    remark: normalizeText(form.remark),
    startAt: normalizeText(form.startAt),
    endAt: normalizeText(form.endAt),
  };
}

export function validateAdminHomeCampaignForm(form = {}) {
  const payload = buildAdminHomeCampaignPayload(form);
  if (!payload.objectType) {
    return "请选择对象类型";
  }
  if (!payload.targetId) {
    return "请选择投放对象";
  }
  if (!payload.slotPosition || payload.slotPosition <= 0) {
    return "目标位次必须大于 0";
  }
  if (!payload.startAt || !payload.endAt) {
    return "请选择投放时间范围";
  }
  return "";
}
