import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";
import { extractErrorMessage, extractUploadAsset } from "../../contracts/src/http.js";

export function createAuthenticatedUploadOptions({
  baseUrl,
  token,
  filePath,
  fieldName = "file",
  uploadPath = "/api/upload",
}) {
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  return {
    url: `${normalizedBaseUrl}${uploadPath}`,
    filePath,
    name: fieldName,
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

export function normalizeResourceUrl(url, baseUrl) {
  const raw = String(url || "").trim();
  if (!raw) return "";
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
  formData = undefined,
  header = undefined,
  onUnauthorized = undefined,
}) {
  const resolvedFilePath = String(filePath || "").trim();
  const resolvedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = String(uploadPath || "/api/upload").startsWith("/")
    ? String(uploadPath || "/api/upload")
    : `/${String(uploadPath || "/api/upload")}`;
  const headers = {
    ...buildAuthorizationHeaders(token),
    ...(header || {}),
  };

  return new Promise((resolve, reject) => {
    uniApp.uploadFile({
      url: `${resolvedBaseUrl}${normalizedPath}`,
      filePath: resolvedFilePath,
      name: fieldName,
      formData,
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
        const normalizedUrl = normalizeResourceUrl(
          asset?.asset_url || asset?.url || parsed?.url || "",
          resolvedBaseUrl,
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
