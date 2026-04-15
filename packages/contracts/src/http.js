function trimText(value) {
  return String(value == null ? "" : value).trim();
}

export function extractEnvelopeData(payload) {
  if (
    payload &&
    typeof payload === "object" &&
    payload.data !== undefined
  ) {
    return payload.data;
  }
  return payload;
}

export function extractEnvelopeRequestId(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  return trimText(payload.request_id || payload.requestId);
}

export function extractEnvelopeCode(payload, fallback = "OK") {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return trimText(payload.code) || fallback;
}

export function extractEnvelopeMessage(payload, fallback = "") {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return trimText(payload.message || payload.error) || fallback;
}

export function extractPaginatedItems(payload, options = {}) {
  const data = extractEnvelopeData(payload);
  const listKeys = Array.isArray(options.listKeys) && options.listKeys.length > 0
    ? options.listKeys
    : ["items", "records", "list"];
  const pagination = data && typeof data === "object" && data.pagination && typeof data.pagination === "object"
    ? data.pagination
    : {};
  const normalized = {
    items: [],
    total: 0,
    page: 0,
    limit: 0,
  };

  if (Array.isArray(data)) {
    normalized.items = data;
    normalized.total = data.length;
    return normalized;
  }

  if (!data || typeof data !== "object") {
    return normalized;
  }

  for (const key of listKeys) {
    if (Array.isArray(data[key])) {
      normalized.items = data[key];
      break;
    }
  }

  normalized.total = Number(
    data.total ?? pagination.total ?? payload?.total ?? normalized.items.length ?? 0,
  );
  normalized.page = Number(data.page ?? pagination.page ?? payload?.page ?? 0);
  normalized.limit = Number(
    data.limit ??
      data.pageSize ??
      data.page_size ??
      pagination.limit ??
      pagination.pageSize ??
      pagination.page_size ??
      payload?.limit ??
      payload?.pageSize ??
      payload?.page_size ??
      0,
  );
  return normalized;
}

function resolveCredentialSource(payload = {}) {
  if (payload?.temporaryCredential && typeof payload.temporaryCredential === "object") {
    return payload.temporaryCredential;
  }
  if (payload?.data?.temporaryCredential && typeof payload.data.temporaryCredential === "object") {
    return payload.data.temporaryCredential;
  }
  return null;
}

export function extractTemporaryCredential(payload = {}) {
  const source = resolveCredentialSource(payload);
  const temporaryPassword = trimText(
    source?.temporaryPassword ||
      payload?.newPassword ||
      payload?.data?.newPassword,
  );

  if (!temporaryPassword) {
    return null;
  }

  return {
    temporaryPassword,
    deliveryMode: trimText(source?.deliveryMode || "operator_receipt") || "operator_receipt",
    subjectHint: trimText(source?.subjectHint),
  };
}

export function extractUploadAsset(payload) {
  const data = extractEnvelopeData(payload);
  if (!data || typeof data !== "object") {
    return null;
  }
  const assetId = String(data.asset_id || data.assetId || data.assetRef || "").trim();
  const url = String(data.asset_url || data.assetUrl || data.previewUrl || data.url || "").trim();
  if (!url) {
    if (!assetId) {
      return null;
    }
  }
  return {
    ...data,
    asset_id: assetId,
    url,
    filename: String(data.filename || "").trim(),
  };
}

export function extractErrorMessage(payload, fallback = "请求失败") {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === "string") {
    return payload.trim() || fallback;
  }

  if (payload.error && typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.message && typeof payload.message === "string") {
    return payload.message;
  }

  if (payload.response?.data) {
    return extractErrorMessage(payload.response.data, fallback);
  }

  return fallback;
}
