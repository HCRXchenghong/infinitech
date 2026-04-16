import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";
import { normalizeServiceHealthStatus } from "./service-health-resources.js";

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
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
