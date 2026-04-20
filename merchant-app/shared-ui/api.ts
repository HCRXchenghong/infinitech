import config, { updateConfig } from "./config";
import { buildUniNetworkErrorMessage } from "../../packages/client-sdk/src/uni-request.js";
import {
  extractAuthSessionResult,
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from "../../packages/contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../packages/contracts/src/upload.js";
import { createRoleApiRuntimeBindings } from "../../packages/mobile-core/src/role-api-shell.js";
import {
  clearMerchantAuthSession,
  ensureMerchantAuthSession,
} from "./auth-session.js";

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

const merchantApiRuntime = createRoleApiRuntimeBindings({
  role: "merchant",
  config,
  uniApp: uni,
  defaultUploadDomain: UPLOAD_DOMAINS.SHOP_MEDIA,
  enableBaseUrlFallback: true,
  fallbackPort: "25500",
  fallbackHealthPaths: ["/health", "/api/health"],
  savedIpStorageKey: "dev_local_ip",
  defaultFallbackIp: process.env.DEFAULT_BFF_IP || "127.0.0.1",
  updateRuntimeConfig(patch: Record<string, string>) {
    updateConfig(patch);
  },
  onUnauthorized() {
    forceMerchantLogout();
  },
  buildUploadValidationError(message: string) {
    return buildError(message);
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
        unreachableMessage: () =>
          `无法连接服务器：${baseUrl}（请确认 BFF 已启动，端口通常为 25500）`,
      },
    );
    return buildError(message, { data: error });
  },
  shouldLogNetworkError() {
    return false;
  },
});

export const getBaseUrl = merchantApiRuntime.getBaseUrl;

export async function uploadImage(
  filePath: string,
  options: { uploadDomain?: string } = {},
): Promise<UploadResult> {
  return merchantApiRuntime.uploadImage(filePath, options) as Promise<UploadResult>;
}

export function readAuthorizationHeader(): Record<string, string> {
  return merchantApiRuntime.readAuthorizationHeader() as Record<string, string>;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  return merchantApiRuntime.request(options) as Promise<T>;
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
}) =>
  apiPost("/api/auth/merchant/login", credentials, false).then((response) =>
    extractAuthSessionResult(response),
  );

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

export const { registerPushDevice, unregisterPushDevice, ackPushMessage } = merchantApiRuntime;
