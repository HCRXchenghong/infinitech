import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

export const DINING_BUDDY_PARTY_STATUS_OPTIONS = [
  { label: "开放中", value: "open" },
  { label: "满员", value: "full" },
  { label: "已关闭", value: "closed" },
];

export const DINING_BUDDY_PARTY_CATEGORY_OPTIONS = [
  { label: "聊天", value: "chat" },
  { label: "约饭", value: "food" },
  { label: "学习", value: "study" },
];

export const DINING_BUDDY_REPORT_STATUS_OPTIONS = [
  { label: "待处理", value: "pending" },
  { label: "已处理", value: "resolved" },
  { label: "已驳回", value: "rejected" },
];

export const DINING_BUDDY_RESTRICTION_TYPE_OPTIONS = [
  { label: "禁言 mute", value: "mute" },
  { label: "封禁 ban", value: "ban" },
];

const DEFAULT_RUNTIME_FORM = {
  enabled: true,
  welcome_title: "",
  welcome_subtitle: "",
  publish_limit_per_day: 5,
  message_rate_limit_per_minute: 20,
  default_max_people: 4,
  max_max_people: 6,
  auto_close_expired_hours: 24,
  categories: [],
  questions: [],
};

const DEFAULT_PARTY_FILTERS = {
  status: "",
  category: "",
  search: "",
};

const DEFAULT_REPORT_FILTERS = {
  status: "",
};

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeBoolean(value, fallback = true) {
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

function createLocalKey(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeRestrictionType(value, fallback = "mute") {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "mute" || normalized === "ban") {
    return normalized;
  }
  return fallback;
}

function normalizeReportAction(value, fallback = "") {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "resolve" || normalized === "reject") {
    return normalized;
  }
  return fallback;
}

function normalizePartyAction(value, fallback = "") {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "close" || normalized === "reopen") {
    return normalized;
  }
  return fallback;
}

export function createDiningBuddyRuntimeQuestion(source = {}) {
  return {
    localKey: createLocalKey("question"),
    question: normalizeText(source.question),
    options: Array.isArray(source.options)
      ? source.options.map((item) => ({
        localKey: createLocalKey("option"),
        text: normalizeText(item?.text),
        icon: normalizeText(item?.icon),
      }))
      : [],
  };
}

export function createDiningBuddyRuntimeForm(source = {}) {
  return {
    ...DEFAULT_RUNTIME_FORM,
    enabled: normalizeBoolean(source.enabled, true),
    welcome_title: normalizeText(source.welcome_title),
    welcome_subtitle: normalizeText(source.welcome_subtitle),
    publish_limit_per_day: normalizeNumber(source.publish_limit_per_day, 5),
    message_rate_limit_per_minute: normalizeNumber(source.message_rate_limit_per_minute, 20),
    default_max_people: normalizeNumber(source.default_max_people, 4),
    max_max_people: normalizeNumber(source.max_max_people, 6),
    auto_close_expired_hours: normalizeNumber(source.auto_close_expired_hours, 24),
    categories: Array.isArray(source.categories)
      ? source.categories.map((item) => ({
        id: normalizeText(item?.id),
        label: normalizeText(item?.label),
        icon: normalizeText(item?.icon),
        icon_type: normalizeText(item?.icon_type, "image"),
        enabled: normalizeBoolean(item?.enabled, true),
        sort_order: normalizeNumber(item?.sort_order, 0),
        color: normalizeText(item?.color),
      }))
      : [],
    questions: Array.isArray(source.questions)
      ? source.questions.map((item) => createDiningBuddyRuntimeQuestion(item))
      : [],
  };
}

export function sortDiningBuddyRuntimeCategories(categories = []) {
  return [...(Array.isArray(categories) ? categories : [])].sort(
    (left, right) => normalizeNumber(left?.sort_order, 0) - normalizeNumber(right?.sort_order, 0),
  );
}

export function validateDiningBuddyRuntimeForm(form = {}) {
  if (!normalizeText(form.welcome_title)) {
    return "欢迎标题不能为空";
  }
  return "";
}

export function buildDiningBuddyRuntimePayload(form = {}) {
  const normalized = createDiningBuddyRuntimeForm(form);
  return {
    enabled: normalized.enabled,
    welcome_title: normalized.welcome_title,
    welcome_subtitle: normalized.welcome_subtitle,
    publish_limit_per_day: normalized.publish_limit_per_day,
    message_rate_limit_per_minute: normalized.message_rate_limit_per_minute,
    default_max_people: normalized.default_max_people,
    max_max_people: normalized.max_max_people,
    auto_close_expired_hours: normalized.auto_close_expired_hours,
    categories: normalized.categories.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      icon_type: item.icon_type,
      enabled: item.enabled,
      sort_order: item.sort_order,
      color: item.color,
    })),
    questions: normalized.questions.map((question) => ({
      question: question.question,
      options: (Array.isArray(question.options) ? question.options : [])
        .map((option) => ({
          text: normalizeText(option.text),
          icon: normalizeText(option.icon),
        }))
        .filter((option) => option.text),
    })),
  };
}

export function createDiningBuddyPartyFilterState(overrides = {}) {
  return {
    ...DEFAULT_PARTY_FILTERS,
    status: normalizeText(overrides.status),
    category: normalizeText(overrides.category),
    search: normalizeText(overrides.search),
  };
}

export function buildDiningBuddyPartyListQuery(filters = {}) {
  const normalized = createDiningBuddyPartyFilterState(filters);
  const query = {};
  if (normalized.status) {
    query.status = normalized.status;
  }
  if (normalized.category) {
    query.category = normalized.category;
  }
  if (normalized.search) {
    query.search = normalized.search;
  }
  return query;
}

export function getDiningBuddyPartyActionLabel(action) {
  const normalized = normalizePartyAction(action);
  if (normalized === "close") {
    return "关闭";
  }
  if (normalized === "reopen") {
    return "重开";
  }
  return normalizeText(action, "处理");
}

export function buildDiningBuddyPartyActionPayload(reason = "") {
  return {
    reason: normalizeText(reason),
  };
}

export function createDiningBuddyReportFilterState(overrides = {}) {
  return {
    ...DEFAULT_REPORT_FILTERS,
    status: normalizeText(overrides.status),
  };
}

export function buildDiningBuddyReportListQuery(filters = {}) {
  const normalized = createDiningBuddyReportFilterState(filters);
  return normalized.status ? { status: normalized.status } : {};
}

export function getDiningBuddyReportActionLabel(action) {
  const normalized = normalizeReportAction(action);
  if (normalized === "resolve") {
    return "受理";
  }
  if (normalized === "reject") {
    return "驳回";
  }
  return normalizeText(action, "处理");
}

export function buildDiningBuddyReportActionPayload(action, options = {}) {
  const normalizedAction = normalizeReportAction(action);
  return {
    resolution_note: normalizeText(options.resolutionNote),
    resolution_action: normalizedAction === "resolve"
      ? normalizeText(options.resolutionAction, "manual_review")
      : normalizeText(options.resolutionAction),
  };
}

export function createDiningBuddySensitiveForm(source = {}) {
  return {
    id: normalizeText(source.id),
    word: normalizeText(source.word),
    description: normalizeText(source.description),
    enabled: normalizeBoolean(source.enabled, true),
  };
}

export function getDiningBuddySensitiveDialogTitle(form = {}) {
  return normalizeText(form.id) ? "编辑敏感词" : "新增敏感词";
}

export function validateDiningBuddySensitiveForm(form = {}) {
  if (!normalizeText(form.word)) {
    return "敏感词不能为空";
  }
  return "";
}

export function buildDiningBuddySensitivePayload(form = {}) {
  const normalized = createDiningBuddySensitiveForm(form);
  return {
    word: normalized.word,
    description: normalized.description,
    enabled: normalized.enabled,
  };
}

export function createDiningBuddyRestrictionForm(source = {}) {
  return {
    id: normalizeText(source.id),
    target_user_id: normalizeText(
      source.target_user_id,
      normalizeText(source.user_uid, normalizeText(source.user_id)),
    ),
    restriction_type: normalizeRestrictionType(source.restriction_type, "mute"),
    reason: normalizeText(source.reason),
    note: normalizeText(source.note),
    expires_at: normalizeText(source.expires_at),
  };
}

export function getDiningBuddyRestrictionDialogTitle(form = {}) {
  return normalizeText(form.id) ? "编辑用户限制" : "新增用户限制";
}

export function validateDiningBuddyRestrictionForm(form = {}) {
  if (!normalizeText(form.target_user_id)) {
    return "目标用户和限制类型不能为空";
  }
  if (!normalizeRestrictionType(form.restriction_type, "")) {
    return "目标用户和限制类型不能为空";
  }
  return "";
}

export function buildDiningBuddyRestrictionPayload(form = {}) {
  const normalized = createDiningBuddyRestrictionForm(form);
  return {
    target_user_id: normalized.target_user_id,
    restriction_type: normalized.restriction_type,
    reason: normalized.reason,
    note: normalized.note,
    expires_at: normalized.expires_at,
  };
}

export function buildDiningBuddyMessageDeletePayload(reason = "") {
  return {
    reason: normalizeText(reason),
  };
}

export function extractDiningBuddyRuntimeSettings(payload = {}) {
  const data = extractEnvelopeData(payload);
  return createDiningBuddyRuntimeForm(data && typeof data === "object" ? data : {});
}

export function extractDiningBuddyPartyList(payload = {}) {
  return extractPaginatedItems(payload, { listKeys: ["parties", "items"] }).items;
}

export function extractDiningBuddyPartyDetail(payload = {}, fallback = {}) {
  const data = extractEnvelopeData(payload);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    return fallback;
  }
  return {};
}

export function extractDiningBuddyMessageList(payload = {}) {
  return extractPaginatedItems(payload, { listKeys: ["messages", "items"] }).items;
}

export function extractDiningBuddyReportList(payload = {}) {
  return extractPaginatedItems(payload, { listKeys: ["reports", "items"] }).items;
}

export function extractDiningBuddySensitiveWordList(payload = {}) {
  return extractPaginatedItems(payload).items;
}

export function extractDiningBuddyRestrictionList(payload = {}) {
  return extractPaginatedItems(payload).items;
}

export function extractDiningBuddyAuditLogList(payload = {}) {
  return extractPaginatedItems(payload).items;
}
