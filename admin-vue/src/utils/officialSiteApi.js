import request from '@/utils/request';

export function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.list)) return payload.list;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.records)) return payload.data.records;
    if (Array.isArray(payload.data.list)) return payload.data.list;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }
  return [];
}

export function extractPayloadData(payload) {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload;
}

export function extractErrorMessage(error, fallback = '请求失败，请稍后重试') {
  return error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;
}

export function resolveOfficialSiteMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || typeof window === 'undefined') {
    return raw;
  }

  const currentOrigin = String(window.location.origin || '').trim();
  if (!currentOrigin) {
    return raw;
  }

  try {
    if (raw.startsWith('/uploads/')) {
      return `${currentOrigin}${raw}`;
    }

    const parsed = new URL(raw, currentOrigin);
    if (parsed.pathname.startsWith('/uploads/')) {
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
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '0.00';
  }
  return amount.toFixed(2);
}

export async function uploadOfficialSiteFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await request.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  const payload = extractPayloadData(data);
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  return {
    ...payload,
    url: resolveOfficialSiteMediaUrl(payload.url)
  };
}

export async function getPublicAppDownloadConfig() {
  const { data } = await request.get('/api/public/app-download-config');
  const payload = extractPayloadData(data);
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  return {
    ...payload,
    mini_program_qr_url: resolveOfficialSiteMediaUrl(payload.mini_program_qr_url)
  };
}

export async function listPublicOfficialSiteExposures() {
  const { data } = await request.get('/api/official-site/exposures');
  const records = extractRecords(data).map((item) => ({
    ...item,
    photo_urls: normalizeOfficialSiteMediaList(item?.photo_urls)
  }));
  return {
    records,
    total: Number(data?.total || 0)
  };
}

export async function getPublicOfficialSiteExposureDetail(id) {
  const { data } = await request.get(`/api/official-site/exposures/${id}`);
  const payload = extractPayloadData(data);
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  return {
    ...payload,
    photo_urls: normalizeOfficialSiteMediaList(payload.photo_urls)
  };
}

export async function listPublicOfficialSiteNews(params = {}) {
  const { data } = await request.get('/api/official-site/news', { params });
  const records = extractRecords(data).map((item) => ({
    ...item,
    cover: resolveOfficialSiteMediaUrl(item?.cover)
  }));
  return {
    records,
    total: Number(data?.total || 0)
  };
}

export async function getPublicOfficialSiteNewsDetail(id) {
  const { data } = await request.get(`/api/official-site/news/${id}`);
  const payload = extractPayloadData(data);
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  return {
    ...payload,
    cover: resolveOfficialSiteMediaUrl(payload.cover),
    content_blocks: Array.isArray(payload.content_blocks)
      ? payload.content_blocks.map((block) => {
        if (!block || typeof block !== 'object') return block;
        if (block.type !== 'image') return block;
        return {
          ...block,
          url: resolveOfficialSiteMediaUrl(block.url)
        };
      })
      : payload.content_blocks
  };
}

export async function createOfficialSiteExposure(payload) {
  const { data } = await request.post('/api/official-site/exposures', payload);
  return extractPayloadData(data);
}

export async function createOfficialSiteCooperation(payload) {
  const { data } = await request.post('/api/official-site/cooperations', payload);
  return extractPayloadData(data);
}

export async function createOfficialSiteSupportSession(payload) {
  const { data } = await request.post('/api/official-site/support/sessions', payload);
  return data;
}

export async function getOfficialSiteSupportMessages(token) {
  const { data } = await request.get(`/api/official-site/support/sessions/${token}/messages`);
  return data;
}

export async function appendOfficialSiteSupportMessage(token, payload) {
  const { data } = await request.post(`/api/official-site/support/sessions/${token}/messages`, payload);
  return data;
}

export async function getOfficialSiteSupportSocketToken(token) {
  const { data } = await request.get(`/api/official-site/support/sessions/${token}/socket-token`);
  return extractPayloadData(data);
}

export async function listAdminOfficialSiteExposures(params = {}) {
  const { data } = await request.get('/api/admin/official-site/exposures', { params });
  return {
    records: extractRecords(data).map((item) => ({
      ...item,
      photo_urls: normalizeOfficialSiteMediaList(item?.photo_urls)
    })),
    total: Number(data?.total || 0)
  };
}

export async function updateAdminOfficialSiteExposure(id, payload) {
  const { data } = await request.put(`/api/admin/official-site/exposures/${id}`, payload);
  return extractPayloadData(data);
}

export async function listAdminOfficialSiteCooperations(params = {}) {
  const { data } = await request.get('/api/admin/official-site/cooperations', { params });
  return {
    records: extractRecords(data),
    total: Number(data?.total || 0)
  };
}

export async function updateAdminOfficialSiteCooperation(id, payload) {
  const { data } = await request.put(`/api/admin/official-site/cooperations/${id}`, payload);
  return extractPayloadData(data);
}

export async function listAdminOfficialSiteSupportSessions(params = {}) {
  const { data } = await request.get('/api/admin/official-site/support/sessions', { params });
  return {
    records: extractRecords(data),
    total: Number(data?.total || 0)
  };
}

export async function getAdminOfficialSiteSupportMessages(id) {
  const { data } = await request.get(`/api/admin/official-site/support/sessions/${id}/messages`);
  return data;
}

export async function appendAdminOfficialSiteSupportMessage(id, payload) {
  const { data } = await request.post(`/api/admin/official-site/support/sessions/${id}/messages`, payload);
  return extractPayloadData(data);
}

export async function updateAdminOfficialSiteSupportSession(id, payload) {
  const { data } = await request.put(`/api/admin/official-site/support/sessions/${id}`, payload);
  return extractPayloadData(data);
}
