import config, { updateConfig } from "./config";
import { buildAuthorizationHeaders } from "../../packages/client-sdk/src/auth.js";
import { createMobilePushApi } from "../../packages/client-sdk/src/mobile-capabilities.js";
import {
  clearMerchantAuthSession,
  ensureMerchantAuthSession,
} from "./auth-session.js";
import {
  buildUniNetworkErrorMessage,
  createUniRequestClient,
  isRetryableUniNetworkError,
} from "../../packages/client-sdk/src/uni-request.js";
import {
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from "../../packages/contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../packages/contracts/src/upload.js";
import {
  readStoredBearerToken,
  uploadAuthenticatedAsset,
} from "../../packages/mobile-core/src/upload.js";

declare const uni: any;

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestOptions {
  url: string;
  method?: RequestMethod;
  data?: Record<string, any> | any;
  header?: Record<string, string>;
  auth?: boolean;
  _skipFallback?: boolean;
}

export interface ApiError extends Error {
  data?: any;
  statusCode?: number;
  error?: string;
}

export interface UploadResult {
  success?: boolean;
  url: string;
  filename?: string;
  [key: string]: any;
}

export const getBaseUrl = () => config.API_BASE_URL;
const HEALTH_PATHS = ["/health", "/api/health"];
const BFF_PORT = "25500";

let resolvingBaseUrlPromise: Promise<string | null> | null = null;

function readAuthToken(): string {
  return readStoredBearerToken(uni, ["token", "access_token"]);
}

function forceMerchantLogout() {
  const session = ensureMerchantAuthSession({ uniApp: uni });
  if (!session.token) return;

  clearMerchantAuthSession({
    uniApp: uni,
    extraStorageKeys: ["merchant_push_registration"],
  });
  uni.reLaunch({ url: "/pages/login/index" });
}

function buildError(message: string, extra?: Partial<ApiError>): ApiError {
  const err = new Error(message) as ApiError;
  if (extra) {
    Object.assign(err, extra);
  }
  err.error = err.error || message;
  return err;
}

function normalizeBaseUrl(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

function parseBaseUrl(
  url: string,
): { protocol: string; host: string; port: string } | null {
  const normalized = normalizeBaseUrl(url);
  const match = normalized.match(/^(https?:\/\/)([^/:]+)(?::(\d+))?$/i);
  if (!match) return null;
  return {
    protocol: match[1],
    host: match[2],
    port: match[3] || "",
  };
}

function uniqueList(list: string[]) {
  const out: string[] = [];
  const set = new Set<string>();
  for (const item of list) {
    const value = normalizeBaseUrl(item);
    if (!value || set.has(value)) continue;
    set.add(value);
    out.push(value);
  }
  return out;
}

function buildCandidateBaseUrls(currentBaseUrl: string): string[] {
  const result: string[] = [];
  const parsed = parseBaseUrl(currentBaseUrl);
  if (parsed) {
    result.push(
      `${parsed.protocol}${parsed.host}${parsed.port ? `:${parsed.port}` : ""}`,
    );
    result.push(`${parsed.protocol}${parsed.host}:${BFF_PORT}`);
  } else {
    result.push(currentBaseUrl);
  }

  const savedIp = String(uni.getStorageSync("dev_local_ip") || "").trim();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(savedIp)) {
    result.push(`http://${savedIp}:${BFF_PORT}`);
  }

  // Fallback to loopback in local development unless an explicit override is provided.
  const defaultIp = process.env.DEFAULT_BFF_IP || "127.0.0.1";
  result.push(`http://${defaultIp}:${BFF_PORT}`);

  return uniqueList(result);
}

function probeBaseUrl(baseUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const paths = [...HEALTH_PATHS];
    const tryNext = () => {
      const path = paths.shift();
      if (!path) {
        resolve(false);
        return;
      }
      uni.request({
        url: `${baseUrl}${path}`,
        method: "GET",
        timeout: 1200,
        success(res: any) {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            resolve(true);
            return;
          }
          tryNext();
        },
        fail() {
          tryNext();
        },
      });
    };
    tryNext();
  });
}

async function resolveReachableBaseUrl(
  currentBaseUrl: string,
): Promise<string | null> {
  if (resolvingBaseUrlPromise) return resolvingBaseUrlPromise;

  resolvingBaseUrlPromise = (async () => {
    const candidates = buildCandidateBaseUrls(currentBaseUrl);
    for (const candidate of candidates) {
      const ok = await probeBaseUrl(candidate);
      if (ok) return candidate;
    }
    return null;
  })();

  try {
    return await resolvingBaseUrlPromise;
  } finally {
    resolvingBaseUrlPromise = null;
  }
}

function shouldTryFallback(errMsg: string) {
  return isRetryableUniNetworkError(errMsg);
}

function uploadFileByBaseUrl(
  filePath: string,
  baseUrl: string,
  uploadDomain: string,
): Promise<UploadResult> {
  const token = readAuthToken();
  return uploadAuthenticatedAsset({
    uniApp: uni,
    baseUrl,
    filePath,
    token,
    uploadDomain,
    onUnauthorized: token ? () => forceMerchantLogout() : undefined,
  }) as Promise<UploadResult>;
}

export async function uploadImage(
  filePath: string,
  options: { uploadDomain?: string } = {},
): Promise<UploadResult> {
  const normalizedPath = String(filePath || "").trim();
  if (!normalizedPath) {
    throw buildError("缺少上传文件路径");
  }

  const baseUrl = normalizeBaseUrl(getBaseUrl());
  const uploadDomain = String(
    options.uploadDomain || UPLOAD_DOMAINS.SHOP_MEDIA,
  ).trim();
  try {
    return await uploadFileByBaseUrl(normalizedPath, baseUrl, uploadDomain);
  } catch (err: any) {
    const errMsg = String(
      err?.error || err?.message || err?.data?.errMsg || "",
    );
    if (shouldTryFallback(errMsg)) {
      try {
        const resolved = await resolveReachableBaseUrl(baseUrl);
        if (resolved && resolved !== baseUrl) {
          updateConfig({
            API_BASE_URL: resolved,
            SOCKET_URL: resolved,
          });
          return await uploadFileByBaseUrl(normalizedPath, resolved, uploadDomain);
        }
      } catch (_fallbackErr) {
        // ignore fallback errors and return original upload error
      }
    }
    throw err;
  }
}

export function readAuthorizationHeader(): Record<string, string> {
  const token = readAuthToken();
  return buildAuthorizationHeaders(token);
}

const requestClient = createUniRequestClient({
  uniApp: uni,
  getBaseUrl,
  getTimeout: () => config.TIMEOUT,
  getAuthToken: readAuthToken,
  onUnauthorized() {
    forceMerchantLogout();
  },
  createHttpError(payload: any, statusCode: number) {
    return buildError(payload?.error || `请求失败: ${statusCode}`, {
      data: payload,
      statusCode,
    });
  },
  createNetworkError(error: any, { baseUrl }: { baseUrl: string }) {
    const message = buildUniNetworkErrorMessage(
      error,
      { baseUrl },
      {
        defaultMessage: "网络请求失败",
        timeoutMessage: "请求超时，请检查后端服务",
        unreachableMessage: () => `无法连接服务器：${baseUrl}（请确认 BFF 已启动，端口通常为 25500）`,
      },
    );
    return buildError(message, { data: error });
  },
  retryOnNetworkError: async ({
    baseUrl,
    error,
    retryRequest,
  }: {
    baseUrl: string;
    error: any;
    retryRequest: (overrideOptions?: Partial<RequestOptions>) => Promise<any>;
  }) => {
    if (!shouldTryFallback(error)) {
      return null;
    }

    const resolved = await resolveReachableBaseUrl(baseUrl);
    if (!resolved || resolved === baseUrl) {
      return null;
    }

    updateConfig({
      API_BASE_URL: resolved,
      SOCKET_URL: resolved,
    });

    return {
      retried: true,
      value: await retryRequest({
        _skipFallback: true,
      }),
    };
  },
})

export function request<T = any>(options: RequestOptions): Promise<T> {
  return requestClient(options) as Promise<T>;
}

function apiGet<T = any>(url: string, data?: Record<string, any>, auth = true) {
  return request<T>({ url, method: "GET", data, auth });
}

function apiPost<T = any>(
  url: string,
  data?: Record<string, any>,
  auth = true,
) {
  return request<T>({ url, method: "POST", data, auth });
}

const mobilePushApi = createMobilePushApi({
  post(url: string, data?: Record<string, any>) {
    return apiPost(url, data);
  },
});

function apiPut<T = any>(url: string, data?: Record<string, any>, auth = true) {
  return request<T>({ url, method: "PUT", data, auth });
}

function apiDelete<T = any>(
  url: string,
  data?: Record<string, any>,
  auth = true,
) {
  return request<T>({ url, method: "DELETE", data, auth });
}

// Auth
export const merchantLogin = (credentials: {
  phone: string;
  code?: string;
  password?: string;
}) => apiPost("/api/auth/merchant/login", credentials, false);

export const requestSMSCode = (
  phone: string,
  scene: string = "merchant_login",
) => apiPost("/api/request-sms-code", { phone, scene }, false).then((response) =>
  extractSMSResult(response),
);

export const verifySMSCodeCheck = (payload: {
  phone: string;
  code: string;
  scene?: string;
}) => apiPost("/api/verify-sms-code-check", payload, false).then((response) =>
  extractSMSResult(response),
);

export const merchantSetNewPassword = (payload: {
  phone: string;
  code: string;
  password: string;
}) => apiPost("/api/auth/merchant/set-new-password", payload, false);

// Merchant / Shop
export const fetchMerchantShops = (merchantId: string | number) =>
  apiGet<{ shops: any[] }>(`/api/merchants/${merchantId}/shops`);

export const fetchShopDetail = (shopId: string | number) =>
  apiGet(`/api/shops/${shopId}`).then((response) =>
    extractEnvelopeData(response) || response || null,
  );

export const fetchShopMenu = (shopId: string | number) =>
  apiGet(`/api/shops/${shopId}/menu`).then((response) => {
    const data: any = extractEnvelopeData(response) || response || {};
    if (Array.isArray(data?.products)) {
      return data.products;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    return Array.isArray(data) ? data : [];
  });

export const updateShop = (
  shopId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/shops/${shopId}`, payload);

export const createShop = (payload: Record<string, any>) =>
  apiPost("/api/shops", payload);

export const deleteShop = (shopId: string | number) =>
  apiDelete(`/api/shops/${shopId}`);

// Orders
export const fetchOrders = (
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) => apiGet<{ orders: any[]; total: number }>("/api/orders", params);

export const fetchOrderDetail = (orderId: string | number) =>
  apiGet(`/api/orders/${orderId}`);

export const dispatchOrder = (orderId: string | number) =>
  apiPost(`/api/orders/${orderId}/dispatch`, {});

export const pickupOrder = (orderId: string | number) =>
  apiPost(`/api/orders/${orderId}/pickup`, {});

export const deliverOrder = (orderId: string | number) =>
  apiPost(`/api/orders/${orderId}/deliver`, {});

export const fetchGroupbuyVouchers = (params: Record<string, any> = {}) =>
  apiGet("/api/groupbuy/vouchers", params);

export const redeemGroupbuyVoucherByScan = (payload: Record<string, any>) =>
  apiPost("/api/merchant/groupbuy/vouchers/redeem-by-scan", payload);

export const createMerchantGroupbuyRefund = (payload: Record<string, any>) =>
  apiPost("/api/merchant/groupbuy/refunds", payload);

// Categories
export const fetchCategories = (shopId: string | number) =>
  apiGet<any[]>("/api/categories", { shopId }).then((payload) =>
    extractPaginatedItems(payload, {
      listKeys: ["categories", "items", "records", "list"],
    }).items,
  );

export const createCategory = (payload: {
  shopId: number;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) => apiPost("/api/categories", payload);

export const updateCategory = (
  categoryId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/categories/${categoryId}`, payload);

export const deleteCategory = (
  categoryId: string | number,
  shopId: string | number,
) => apiDelete(`/api/categories/${categoryId}`, { shopId });

// Products
export const fetchProducts = (params: {
  shopId: string | number;
  categoryId?: string | number;
}) => apiGet<any[]>("/api/products", params).then((payload) =>
  extractPaginatedItems(payload, {
    listKeys: ["products", "items", "records", "list"],
  }).items,
);

export const fetchProductDetail = (productId: string | number) =>
  apiGet(`/api/products/${productId}`).then((payload) => extractEnvelopeData(payload) || payload || null);

export const createProduct = (payload: Record<string, any>) =>
  apiPost("/api/products", payload);

export const updateProduct = (
  productId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/products/${productId}`, payload);

export const deleteProduct = (
  productId: string | number,
  params: { shopId: string | number; categoryId?: string | number },
) => apiDelete(`/api/products/${productId}`, params);

// Banners / Decoration
export const fetchBanners = (shopId: string | number) =>
  apiGet<any[]>("/api/banners", { shopId }).then((payload) =>
    extractPaginatedItems(payload, {
      listKeys: ["banners", "items", "records", "list"],
    }).items,
  );

export const createBanner = (payload: Record<string, any>) =>
  apiPost("/api/banners", payload);

export const updateBanner = (
  bannerId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/banners/${bannerId}`, payload);

export const deleteBanner = (
  bannerId: string | number,
  shopId: string | number,
) => apiDelete(`/api/banners/${bannerId}`, { shopId });

// Coupons
export const fetchShopCoupons = (shopId: string | number) =>
  apiGet(`/api/shops/${shopId}/coupons`);

export const fetchActiveCoupons = (shopId: string | number) =>
  apiGet(`/api/shops/${shopId}/coupons/active`);

export const fetchCouponDetail = (couponId: string | number) =>
  apiGet(`/api/coupons/${couponId}`);

export const createCoupon = (payload: Record<string, any>) =>
  apiPost("/api/coupons", payload);

export const updateCoupon = (
  couponId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/coupons/${couponId}`, payload);

export const deleteCoupon = (couponId: string | number) =>
  apiDelete(`/api/coupons/${couponId}`, {});

// Reviews
export const fetchShopReviews = (
  shopId: string | number,
  params: { page?: number; pageSize?: number } = {},
) => apiGet(`/api/shops/${shopId}/reviews`, params);

export const updateReview = (
  reviewId: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/reviews/${reviewId}`, payload);

export const deleteReview = (reviewId: string | number) =>
  apiDelete(`/api/reviews/${reviewId}`);

// After-sales
export const fetchAfterSales = (
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) => apiGet("/api/after-sales", params);

export const updateAfterSalesStatus = (
  id: string | number,
  payload: Record<string, any>,
) => apiPut(`/api/after-sales/${id}/status`, payload);

// Wallet
export const fetchWalletBalance = (
  userId: string | number,
  userType: "customer" | "rider" | "merchant" = "merchant",
) => apiGet("/api/wallet/balance", { userId: String(userId), userType });

export const fetchWalletTransactions = (params: Record<string, any>) =>
  apiGet("/api/wallet/transactions", params);

export const fetchWalletTransactionStatus = (
  transactionId: string | number,
  params: Record<string, any> = {},
) =>
  apiGet(
    `/api/wallet/transactions/${encodeURIComponent(String(transactionId))}`,
    params,
  );

export const fetchWithdrawRecords = (params: Record<string, any>) =>
  apiGet("/api/wallet/withdraw/records", params);

export const fetchWalletPaymentOptions = (params: Record<string, any>) =>
  apiGet("/api/payment/options", params);

export const fetchWalletWithdrawOptions = (params: Record<string, any>) =>
  apiGet("/api/wallet/withdraw/options", params);

export const previewWalletWithdrawFee = (payload: Record<string, any>) =>
  apiPost("/api/wallet/withdraw/fee-preview", payload);

export const createRecharge = (payload: Record<string, any>) =>
  apiPost("/api/wallet/recharge/intent", payload);

export const fetchWalletRechargeStatus = (params: Record<string, any>) =>
  apiGet("/api/wallet/recharge/status", params);

export const createWithdraw = (payload: Record<string, any>) =>
  apiPost("/api/wallet/withdraw/apply", payload);

export const fetchWalletWithdrawStatus = (params: Record<string, any> = {}) => {
  const requestId =
    params.requestId ??
    params.request_id ??
    params.withdrawRequestId ??
    params.withdraw_request_id;

  if (
    requestId !== undefined &&
    requestId !== null &&
    String(requestId).trim()
  ) {
    const nextParams = { ...params };
    delete nextParams.requestId;
    delete nextParams.request_id;
    delete nextParams.withdrawRequestId;
    delete nextParams.withdraw_request_id;
    return apiGet(
      `/api/wallet/withdraw/status/${encodeURIComponent(String(requestId).trim())}`,
      nextParams,
    );
  }

  return apiGet("/api/wallet/withdraw/status", params);
};

// Message (Go 目前返回空数组，占位直连)
export const fetchConversations = () =>
  apiGet("/api/messages/conversations").then((payload) =>
    extractPaginatedItems(payload, {
      listKeys: ["conversations", "items", "records", "list"],
    }).items,
  );

export const fetchHistory = (roomId: string) =>
  apiGet(`/api/messages/${roomId}`).then((payload) =>
    extractPaginatedItems(payload, {
      listKeys: ["messages", "items", "records", "list"],
    }).items,
  );

export const upsertConversation = (payload: Record<string, any>) =>
  apiPost("/api/messages/conversations/upsert", payload).then(
    (response) => extractEnvelopeData(response) || {},
  );

export const markConversationRead = (chatId: string) =>
  apiPost(`/api/messages/conversations/${encodeURIComponent(chatId)}/read`, {});

export const fetchPublicRuntimeSettings = () =>
  apiGet("/api/public/runtime-settings");

export const { registerPushDevice, unregisterPushDevice, ackPushMessage } = mobilePushApi;
