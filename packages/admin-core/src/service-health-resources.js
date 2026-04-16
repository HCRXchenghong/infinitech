import { extractEnvelopeData } from "../../contracts/src/http.js";

const DEFAULT_SERVICE_HEALTH_STATUS = {
  checkedAt: "",
  overall: "unknown",
  services: [],
  journeys: [],
};

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneValue(value, fallback) {
  const source = value == null ? fallback : value;
  return JSON.parse(JSON.stringify(source));
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

export function createDefaultServiceHealthStatus() {
  return cloneValue(DEFAULT_SERVICE_HEALTH_STATUS, DEFAULT_SERVICE_HEALTH_STATUS);
}

export function normalizeServiceHealthStatus(raw = {}) {
  const source = asRecord(raw);

  return {
    checkedAt: normalizeText(source.checkedAt, normalizeText(source.checked_at)),
    overall: normalizeText(source.overall, "unknown") || "unknown",
    services: Array.isArray(source.services) ? cloneValue(source.services, []) : [],
    journeys: Array.isArray(source.journeys) ? cloneValue(source.journeys, []) : [],
  };
}

export function extractServiceHealthStatus(payload = {}, options = {}) {
  const source = options.path ? extractEnvelopeData(payload)?.[options.path] : extractEnvelopeData(payload);
  return normalizeServiceHealthStatus(source);
}

export function serviceHealthStatusTag(status) {
  if (status === "up" || status === "ok" || status === "ready") {
    return "success";
  }
  if (status === "degraded") {
    return "warning";
  }
  if (status === "down" || status === "error") {
    return "danger";
  }
  return "info";
}

export function serviceHealthStatusLabel(status) {
  if (status === "up" || status === "ok" || status === "ready") {
    return "在线";
  }
  if (status === "degraded") {
    return "降级";
  }
  if (status === "down" || status === "error") {
    return "异常";
  }
  return "未知";
}

export function serviceHealthOverallStatusLabel(status) {
  if (status === "ok" || status === "ready") {
    return "整体正常";
  }
  if (status === "degraded") {
    return "核心正常，存在降级";
  }
  if (status === "down" || status === "error") {
    return "核心异常";
  }
  return "状态未知";
}

export function serviceHealthJourneyStatusLabel(status) {
  if (status === "ok" || status === "ready") {
    return "正常";
  }
  if (status === "degraded") {
    return "降级";
  }
  if (status === "down" || status === "error") {
    return "阻断";
  }
  return "未知";
}

export function formatServiceHealthDetail(detail) {
  if (!detail) {
    return "暂未返回扩展说明";
  }
  const summary = String(detail)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("，");
  return summary || "暂未返回扩展说明";
}
