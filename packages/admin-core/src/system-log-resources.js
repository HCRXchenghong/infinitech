import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";
import { normalizeServiceHealthStatus } from "./service-health-resources.js";

export const SYSTEM_LOG_SOURCE_OPTIONS = [
  { label: "全部来源", value: "all" },
  { label: "来自 BFF", value: "bff" },
  { label: "来自 Go", value: "go" },
];

export const SYSTEM_LOG_ACTION_OPTIONS = [
  { label: "全部操作", value: "all" },
  { label: "新增", value: "create" },
  { label: "删除", value: "delete" },
  { label: "修改", value: "update" },
  { label: "查询", value: "read" },
  { label: "系统", value: "system" },
  { label: "异常", value: "error" },
];

const SIGNAL_LABELS = {
  error: "错误",
  redisConnected: "Redis 连接",
  redisMode: "Redis 模式",
  adapterEnabled: "Adapter 已启用",
  goApiOk: "Go 可用",
  goApiProbe: "Go 探针",
  goApiError: "Go 错误",
  pushWorkerOk: "推送 Worker",
  pushEnabled: "推送已启用",
  pushRunning: "推送运行中",
  pushProvider: "推送通道",
  pushProductionReady: "推送生产就绪",
  pushProductionIssues: "推送生产问题",
  pushWebhookTarget: "Webhook 目标",
  pushWebhookSecure: "Webhook 安全传输",
  pushWebhookPrivate: "Webhook 私有目标",
  pushWebhookAuth: "Webhook 鉴权",
  pushWebhookSignature: "Webhook 签名",
  pushFcmProject: "FCM 项目",
  pushFcmConfigured: "FCM 已配置",
  pushFcmTokenTarget: "FCM Token 目标",
  pushFcmTokenSecure: "FCM Token 安全传输",
  pushFcmTokenPrivate: "FCM Token 私有目标",
  pushFcmApiTarget: "FCM API 目标",
  pushFcmApiSecure: "FCM API 安全传输",
  pushFcmApiPrivate: "FCM API 私有目标",
  pushCycle: "最近周期",
  pushLastSuccessAt: "最近成功",
  pushConsecutiveFailures: "连续失败",
  pushProcessed: "最近处理数",
  pushError: "推送错误",
  pushQueue: "推送队列",
  pushQueued: "待派发",
  pushRetry: "待重试",
  pushDispatching: "派发中",
  pushFailed: "失败数",
  pushOldestQueuedAt: "最老排队时间",
  pushOldestQueuedAgeSeconds: "最老排队年龄",
  pushOldestRetryPendingAt: "最老重试时间",
  pushOldestRetryPendingAgeSeconds: "最老重试年龄",
  pushOldestDispatchingAt: "最老派发时间",
  pushOldestDispatchingAgeSeconds: "最老派发年龄",
  pushLatestSentAt: "最近派发",
  pushLatestFailedAt: "最近失败",
  pushLatestAcknowledgedAt: "最近确认",
};

const TIME_SIGNAL_KEYS = new Set([
  "pushLastSuccessAt",
  "pushOldestQueuedAt",
  "pushOldestRetryPendingAt",
  "pushOldestDispatchingAt",
  "pushLatestSentAt",
  "pushLatestFailedAt",
  "pushLatestAcknowledgedAt",
]);

const AGE_SIGNAL_KEYS = new Set([
  "pushOldestQueuedAgeSeconds",
  "pushOldestRetryPendingAgeSeconds",
  "pushOldestDispatchingAgeSeconds",
]);

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export function createDefaultSystemLogSummary() {
  return {
    create: 0,
    delete: 0,
    update: 0,
    read: 0,
    system: 0,
    error: 0,
  };
}

function normalizeSystemLogSummary(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    create: normalizeNumber(source.create, 0),
    delete: normalizeNumber(source.delete, 0),
    update: normalizeNumber(source.update, 0),
    read: normalizeNumber(source.read, 0),
    system: normalizeNumber(source.system, 0),
    error: normalizeNumber(source.error, 0),
  };
}

export function createSystemLogFilters(overrides = {}) {
  return {
    source: normalizeText(overrides.source, "all"),
    action: normalizeText(overrides.action, "all"),
    keyword: normalizeText(overrides.keyword),
  };
}

export function createSystemLogPagination(overrides = {}) {
  return {
    page: normalizeNumber(overrides.page, 1),
    limit: normalizeNumber(overrides.limit, 50),
    total: normalizeNumber(overrides.total, 0),
  };
}

export function createSystemLogVerifyForm(overrides = {}) {
  return {
    verifyAccount: normalizeText(overrides.verifyAccount),
    verifyPassword: normalizeText(overrides.verifyPassword),
  };
}

export function buildSystemLogListQuery(filters = {}, pagination = {}) {
  const normalizedFilters = createSystemLogFilters(filters);
  const normalizedPagination = createSystemLogPagination(pagination);
  const query = {
    page: normalizedPagination.page,
    limit: normalizedPagination.limit,
  };
  if (normalizedFilters.source && normalizedFilters.source !== "all") {
    query.source = normalizedFilters.source;
  }
  if (normalizedFilters.action && normalizedFilters.action !== "all") {
    query.action = normalizedFilters.action;
  }
  if (normalizedFilters.keyword) {
    query.keyword = normalizedFilters.keyword;
  }
  return query;
}

export function getSystemLogClearSourceLabel(source) {
  if (source === "bff") {
    return "BFF 来源";
  }
  if (source === "go") {
    return "Go 来源";
  }
  return "全部来源";
}

export function getSystemLogActionTagType(actionType) {
  if (actionType === "create") return "success";
  if (actionType === "delete") return "danger";
  if (actionType === "update") return "warning";
  if (actionType === "read") return "info";
  if (actionType === "error") return "danger";
  return "";
}

export function formatSystemLogProbeType(probe) {
  if (probe === "ready") return "/ready";
  if (probe === "health") return "/health";
  if (probe === "tcp") return "TCP";
  return String(probe || "-");
}

export function formatSystemLogTime(raw) {
  if (!raw) return "--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatSystemLogMethodPath(item) {
  if (item?.method && item?.path) {
    return `${item.method} ${item.path}`;
  }
  return item?.message || "-";
}

function toDisplayLabel(key) {
  if (SIGNAL_LABELS[key]) {
    return SIGNAL_LABELS[key];
  }
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

export function formatSystemLogAgeSeconds(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 秒";
  if (numeric < 60) return `${numeric} 秒`;
  const minutes = Math.floor(numeric / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `${days} 天`;
}

export function formatSystemLogAgeMs(ms) {
  const numeric = Number(ms);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 秒";
  return formatSystemLogAgeSeconds(Math.floor(numeric / 1000));
}

export function normalizeSystemLogSignalValue(key, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  if (text === "true") return "正常";
  if (text === "false") return "异常";

  if (AGE_SIGNAL_KEYS.has(key) && /^\d+$/.test(text)) {
    return formatSystemLogAgeSeconds(text);
  }

  if (TIME_SIGNAL_KEYS.has(key)) {
    return formatSystemLogTime(text);
  }

  return text;
}

export function resolveSystemLogSignalType(key, rawValue) {
  const value = String(rawValue ?? "").trim();
  const numeric = Number(value);

  if (
    key.endsWith("Error")
    || key === "error"
    || key === "pushError"
    || key === "goApiError"
    || key === "pushProductionIssues"
  ) {
    return "danger";
  }

  if (
    [
      "redisConnected",
      "adapterEnabled",
      "goApiOk",
      "pushWorkerOk",
      "pushEnabled",
      "pushRunning",
      "pushProductionReady",
      "pushWebhookSecure",
      "pushWebhookAuth",
      "pushWebhookSignature",
      "pushFcmConfigured",
      "pushFcmTokenSecure",
      "pushFcmApiSecure",
    ].includes(key)
  ) {
    return value === "true" ? "success" : "danger";
  }

  if (["pushWebhookPrivate", "pushFcmTokenPrivate", "pushFcmApiPrivate"].includes(key)) {
    return value === "true" ? "danger" : "success";
  }

  if (key === "redisMode") {
    if (value === "redis") return "success";
    if (value) return "warning";
  }

  if (key === "goApiProbe") {
    return "info";
  }

  if (key === "pushCycle") {
    if (value === "ok") return "success";
    if (value === "dispatching") return "info";
    return "warning";
  }

  if (
    [
      "pushQueue",
      "pushQueued",
      "pushRetry",
      "pushDispatching",
      "pushFailed",
      "pushConsecutiveFailures",
      "pushOldestQueuedAgeSeconds",
      "pushOldestRetryPendingAgeSeconds",
      "pushOldestDispatchingAgeSeconds",
    ].includes(key)
  ) {
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "info";
    }
    if (["pushFailed", "pushConsecutiveFailures"].includes(key)) {
      return numeric >= 3 ? "danger" : "warning";
    }
    if (AGE_SIGNAL_KEYS.has(key)) {
      return numeric >= 900 ? "danger" : "warning";
    }
    return "warning";
  }

  return "info";
}

export function parseSystemLogServiceDetail(detail) {
  return String(detail || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return {
          key: part,
          label: part,
          value: "",
          rawValue: "",
          type: "info",
        };
      }

      const key = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();
      return {
        key,
        label: toDisplayLabel(key),
        value: normalizeSystemLogSignalValue(key, rawValue),
        rawValue,
        type: resolveSystemLogSignalType(key, rawValue),
      };
    });
}

export function getSystemLogServiceSignals(item) {
  return parseSystemLogServiceDetail(item?.detail)
    .filter((signal) => signal.key !== "status")
    .slice(0, 14);
}

export function resolveSystemLogServiceSummary(item) {
  if (!item?.detail) return "";
  const signals = parseSystemLogServiceDetail(item.detail);
  if (signals.length === 0) return "";
  return signals
    .slice(0, 4)
    .map((signal) => `${signal.label}${signal.value ? `：${signal.value}` : ""}`)
    .join("，");
}

export function buildSystemLogDeletePayload(log = {}, verifyForm = {}) {
  return {
    source: normalizeText(log.source),
    raw: normalizeText(log.raw),
    verifyAccount: normalizeText(verifyForm.verifyAccount),
    verifyPassword: normalizeText(verifyForm.verifyPassword),
  };
}

export function buildSystemLogClearPayload(source, verifyForm = {}) {
  return {
    source: normalizeText(source, "all"),
    verifyAccount: normalizeText(verifyForm.verifyAccount),
    verifyPassword: normalizeText(verifyForm.verifyPassword),
  };
}

export function extractSystemLogPage(payload = {}) {
  const data = extractEnvelopeData(payload);
  const source = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const summarySource =
    source.summary && typeof source.summary === "object" && !Array.isArray(source.summary)
      ? source.summary
      : source;
  const page = extractPaginatedItems(payload);

  return {
    items: page.items,
    total: page.total,
    page: page.page,
    limit: page.limit,
    summary: normalizeSystemLogSummary(summarySource),
    serviceStatus: normalizeServiceHealthStatus(source.serviceStatus),
    files: source.files && typeof source.files === "object" && !Array.isArray(source.files)
      ? source.files
      : {},
    pagination: {
      total: page.total,
      page: page.page,
      limit: page.limit,
    },
  };
}

export function extractSystemLogViewState(payload = {}) {
  const page = extractSystemLogPage(payload);
  return {
    items: page.items,
    total: page.total,
    summary: normalizeSystemLogSummary(page.summary),
    serviceStatus: normalizeServiceHealthStatus(page.serviceStatus),
  };
}
