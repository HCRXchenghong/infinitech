import {
  extractEnvelopeData,
  extractErrorMessage as extractContractErrorMessage,
  extractUploadAsset,
} from "@infinitech/contracts";
import {
  extractOfficialSiteRecordCollection,
  extractOfficialSiteSupportMessageBundle,
} from "@infinitech/admin-core";
import request from "@/utils/request";

export const extractErrorMessage = extractContractErrorMessage;

export function resolveOfficialSiteMediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || typeof window === "undefined") {
    return raw;
  }

  const currentOrigin = String(window.location.origin || "").trim();
  if (!currentOrigin) {
    return raw;
  }

  try {
    if (raw.startsWith("/uploads/")) {
      return `${currentOrigin}${raw}`;
    }

    const parsed = new URL(raw, currentOrigin);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${currentOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (_error) {
    return raw;
  }

  return raw;
}

export function normalizeOfficialSiteMediaList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => resolveOfficialSiteMediaUrl(item))
    .filter(Boolean);
}

export function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
}

export async function uploadOfficialSiteFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await request.post(
    "/api/official-site/exposures/assets",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  const asset = extractUploadAsset(data);
  if (!asset || typeof asset !== "object") {
    return asset;
  }
  return {
    ...asset,
    url: resolveOfficialSiteMediaUrl(asset.url),
  };
}

export async function getPublicAppDownloadConfig() {
  const { data } = await request.get("/api/public/app-download-config");
  const payload = extractEnvelopeData(data);
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    ...payload,
    mini_program_qr_url: resolveOfficialSiteMediaUrl(
      payload.mini_program_qr_url,
    ),
  };
}

export async function listPublicOfficialSiteExposures() {
  const { data } = await request.get("/api/official-site/exposures");
  const page = extractOfficialSiteRecordCollection(data);
  const records = page.records.map((item) => ({
    ...item,
    photo_urls: normalizeOfficialSiteMediaList(item?.photo_urls),
  }));
  return {
    records,
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}

export async function getPublicOfficialSiteExposureDetail(id) {
  const { data } = await request.get(`/api/official-site/exposures/${id}`);
  const payload = extractEnvelopeData(data);
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    ...payload,
    photo_urls: normalizeOfficialSiteMediaList(payload.photo_urls),
  };
}

export async function listPublicOfficialSiteNews(params = {}) {
  const { data } = await request.get("/api/official-site/news", { params });
  const page = extractOfficialSiteRecordCollection(data);
  const records = page.records.map((item) => ({
    ...item,
    cover: resolveOfficialSiteMediaUrl(item?.cover),
  }));
  return {
    records,
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}

export async function getPublicOfficialSiteNewsDetail(id) {
  const { data } = await request.get(`/api/official-site/news/${id}`);
  const payload = extractEnvelopeData(data);
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    ...payload,
    cover: resolveOfficialSiteMediaUrl(payload.cover),
    content_blocks: Array.isArray(payload.content_blocks)
      ? payload.content_blocks.map((block) => {
          if (!block || typeof block !== "object") return block;
          if (block.type !== "image") return block;
          return {
            ...block,
            url: resolveOfficialSiteMediaUrl(block.url),
          };
        })
      : payload.content_blocks,
  };
}

export async function createOfficialSiteExposure(payload) {
  const { data } = await request.post("/api/official-site/exposures", payload);
  return extractEnvelopeData(data) || data;
}

export async function createOfficialSiteCooperation(payload) {
  const { data } = await request.post(
    "/api/official-site/cooperations",
    payload,
  );
  return extractEnvelopeData(data) || data;
}

export async function createOfficialSiteSupportSession(payload) {
  const { data } = await request.post(
    "/api/official-site/support/sessions",
    payload,
  );
  return extractOfficialSiteSupportMessageBundle(data);
}

export async function getOfficialSiteSupportMessages(token) {
  const { data } = await request.get(
    `/api/official-site/support/sessions/${token}/messages`,
  );
  return extractOfficialSiteSupportMessageBundle(data);
}

export async function appendOfficialSiteSupportMessage(token, payload) {
  const { data } = await request.post(
    `/api/official-site/support/sessions/${token}/messages`,
    payload,
  );
  return extractEnvelopeData(data) || data;
}

export async function getOfficialSiteSupportSocketToken(token) {
  const { data } = await request.get(
    `/api/official-site/support/sessions/${token}/socket-token`,
  );
  return extractEnvelopeData(data) || data;
}

export async function listAdminOfficialSiteExposures(params = {}) {
  const { data } = await request.get("/api/admin/official-site/exposures", {
    params,
  });
  const page = extractOfficialSiteRecordCollection(data);
  return {
    records: page.records.map((item) => ({
      ...item,
      photo_urls: normalizeOfficialSiteMediaList(item?.photo_urls),
    })),
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}

export async function updateAdminOfficialSiteExposure(id, payload) {
  const { data } = await request.put(
    `/api/admin/official-site/exposures/${id}`,
    payload,
  );
  return extractEnvelopeData(data) || data;
}

export async function listAdminOfficialSiteCooperations(params = {}) {
  const { data } = await request.get("/api/admin/official-site/cooperations", {
    params,
  });
  const page = extractOfficialSiteRecordCollection(data);
  return {
    records: page.records,
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}

export async function updateAdminOfficialSiteCooperation(id, payload) {
  const { data } = await request.put(
    `/api/admin/official-site/cooperations/${id}`,
    payload,
  );
  return extractEnvelopeData(data) || data;
}

export async function listAdminOfficialSiteSupportSessions(params = {}) {
  const { data } = await request.get(
    "/api/admin/official-site/support/sessions",
    { params },
  );
  const page = extractOfficialSiteRecordCollection(data);
  return {
    records: page.records,
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}

export async function getAdminOfficialSiteSupportMessages(id) {
  const { data } = await request.get(
    `/api/admin/official-site/support/sessions/${id}/messages`,
  );
  return extractOfficialSiteSupportMessageBundle(data);
}

export async function appendAdminOfficialSiteSupportMessage(id, payload) {
  const { data } = await request.post(
    `/api/admin/official-site/support/sessions/${id}/messages`,
    payload,
  );
  return extractEnvelopeData(data) || data;
}

export async function updateAdminOfficialSiteSupportSession(id, payload) {
  const { data } = await request.put(
    `/api/admin/official-site/support/sessions/${id}`,
    payload,
  );
  return extractEnvelopeData(data) || data;
}
