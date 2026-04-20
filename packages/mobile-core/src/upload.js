import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";
import {
  extractErrorMessage,
  extractUploadAsset,
  isProtectedUploadUrl,
  resolveUploadAssetUrl,
} from "../../contracts/src/http.js";
import { normalizeUploadDomain } from "../../contracts/src/upload.js";

export function createAuthenticatedUploadOptions({
  baseUrl,
  token,
  filePath,
  fieldName = "file",
  uploadPath = "/api/upload",
  uploadDomain,
  formData = undefined,
}) {
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedUploadDomain = normalizeUploadDomain(uploadDomain);
  return {
    url: `${normalizedBaseUrl}${uploadPath}`,
    filePath,
    name: fieldName,
    formData: {
      ...(formData && typeof formData === "object" ? formData : {}),
      upload_domain: normalizedUploadDomain,
    },
    header: buildAuthorizationHeaders(token),
  };
}

export function readStoredBearerToken(
  uniApp = globalThis?.uni,
  storageKeys = ["token", "access_token"],
) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }
  for (const key of storageKeys) {
    const raw = String(uniApp.getStorageSync(key) || "").trim();
    if (raw) {
      const headers = buildAuthorizationHeaders(raw);
      return String(headers.Authorization || "").trim();
    }
  }
  return "";
}

export function normalizeResourceUrl(url, baseUrl, options = {}) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const accessPolicy = String(options.accessPolicy || "").trim().toLowerCase();
  if (accessPolicy === "private" && isProtectedUploadUrl(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `http:${raw}`;
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  if (raw.startsWith("/")) return `${normalizedBaseUrl}${raw}`;
  return `${normalizedBaseUrl}/${raw}`;
}

export function uploadAuthenticatedAsset({
  uniApp = globalThis?.uni,
  baseUrl,
  filePath,
  token = "",
  uploadPath = "/api/upload",
  fieldName = "file",
  uploadDomain,
  formData = undefined,
  header = undefined,
  onUnauthorized = undefined,
}) {
  const resolvedFilePath = String(filePath || "").trim();
  const resolvedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedUploadDomain = normalizeUploadDomain(uploadDomain);
  const normalizedPath = String(uploadPath || "/api/upload").startsWith("/")
    ? String(uploadPath || "/api/upload")
    : `/${String(uploadPath || "/api/upload")}`;
  const nextFormData = {
    ...(formData && typeof formData === "object" ? formData : {}),
    upload_domain: normalizedUploadDomain,
  };
  const headers = {
    ...buildAuthorizationHeaders(token),
    ...(header || {}),
  };

  return new Promise((resolve, reject) => {
    uniApp.uploadFile({
      url: `${resolvedBaseUrl}${normalizedPath}`,
      filePath: resolvedFilePath,
      name: fieldName,
      formData: nextFormData,
      header: headers,
      success(res) {
        let parsed = null;
        try {
          parsed =
            typeof res?.data === "string" ? JSON.parse(res.data) : res?.data;
        } catch (_error) {
          reject({
            statusCode: res?.statusCode,
            data: res?.data,
            error: "上传响应解析失败",
          });
          return;
        }

        const asset = extractUploadAsset(parsed);
        const accessPolicy = String(
          asset?.access_policy ||
            asset?.accessPolicy ||
            parsed?.data?.access_policy ||
            parsed?.data?.accessPolicy ||
            parsed?.access_policy ||
            parsed?.accessPolicy ||
            "",
        ).trim();
        const normalizedUrl = normalizeResourceUrl(
          resolveUploadAssetUrl(asset || parsed),
          resolvedBaseUrl,
          { accessPolicy },
        );
        const payload =
          parsed && typeof parsed === "object" ? { ...parsed } : { data: parsed };

        if (normalizedUrl) {
          payload.url = normalizedUrl;
          payload.asset_url = normalizedUrl;
          if (payload.data && typeof payload.data === "object") {
            payload.data = {
              ...payload.data,
              url: normalizedUrl,
              asset_url: normalizedUrl,
            };
          }
        }

        if (
          Number(res?.statusCode || 0) >= 200 &&
          Number(res?.statusCode || 0) < 300 &&
          normalizedUrl
        ) {
          resolve(payload);
          return;
        }

        if (
          typeof onUnauthorized === "function" &&
          Number(res?.statusCode || 0) === 401 &&
          String(token || "").trim()
        ) {
          onUnauthorized();
        }

        reject({
          statusCode: res?.statusCode,
          data: parsed,
          error: extractErrorMessage(parsed, "上传失败"),
        });
      },
      fail(err) {
        reject({
          data: err,
          error: err?.errMsg || "上传失败",
        });
      },
    });
  });
}
