/**
 * Admin Settings Controller - 管理后台设置控制器
 * 处理轮播图、推送消息、系统设置等
 */

const FormData = require("form-data");
const fs = require("fs");
const { logger } = require("../utils/logger");
const { verifyCriticalCredential } = require("../utils/criticalActionVerify");
const {
  resolveClearAllVerifyCredential,
  isClearAllVerifyConfigured,
  BFF_COMBINED_LOG_PATH,
  BFF_ERROR_LOG_PATH,
  GO_COMBINED_LOG_PATH,
  GO_ERROR_LOG_PATH,
} = require("./adminSettings/constants");
const {
  normalizePublicAssetUrl,
  normalizeSettingsProxyPayload,
  handleProxyError,
  requestSettingsRaw,
  proxySettingsRequest,
} = require("./adminSettings/proxyClient");
const { safeUnlinkTempFile, clearLogFile } = require("./adminSettings/fileOps");
const {
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
} = require("../utils/apiEnvelope");

function createProxyHandler(method, pathResolver, optionsResolver) {
  return async function proxyHandler(req, res) {
    const path = typeof pathResolver === "function" ? pathResolver(req) : pathResolver;
    const options = typeof optionsResolver === "function" ? optionsResolver(req) : (optionsResolver || {});
    return proxySettingsRequest(req, res, method, path, options);
  };
}

function normalizeAssetUrlFields(req, payload, fields) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const normalized = { ...payload };
  for (const field of fields) {
    if (typeof normalized[field] === "string" && normalized[field]) {
      normalized[field] = normalizePublicAssetUrl(req, normalized[field]);
    }
  }

  if (normalized.data && typeof normalized.data === "object" && !Array.isArray(normalized.data)) {
    normalized.data = normalizeAssetUrlFields(req, normalized.data, fields);
  }

  return normalized;
}

function respondSettingsError(req, res, status, message, options = {}) {
  return res.status(status).json(
    buildErrorEnvelopePayload(req, status, message, {
      code: options.code,
      data: options.data,
      legacy: options.legacy,
    }),
  );
}

function respondSettingsSuccess(req, res, message, data, options = {}) {
  return res.status(options.status || 200).json(
    buildSuccessEnvelopePayload(req, message, data, {
      legacy: options.legacy || (data && typeof data === "object" && !Array.isArray(data) ? data : undefined),
    }),
  );
}

function respondSettingsProxyResponse(req, res, response, options = {}) {
  const payload = normalizeSettingsProxyPayload(
    req,
    response,
    options.defaultErrorMessage || "请求后端服务失败，请稍后重试",
  );
  const normalizedPayload = normalizeAssetUrlFields(req, payload, options.assetFields || []);
  return res.status(response.status).json(normalizedPayload);
}

const getCarousel = createProxyHandler("get", "/api/carousel", (req) => ({ params: req.query }));
const createCarousel = createProxyHandler("post", "/api/carousel", (req) => ({ body: req.body }));
const updateCarousel = createProxyHandler("put", (req) => `/api/carousel/${req.params.id}`, (req) => ({ body: req.body }));
const deleteCarousel = createProxyHandler("delete", (req) => `/api/carousel/${req.params.id}`);
const getCarouselSettings = createProxyHandler("get", "/api/carousel-settings");
const updateCarouselSettings = createProxyHandler("post", "/api/carousel-settings", (req) => ({ body: req.body }));

const getPushMessages = createProxyHandler("get", "/api/push-messages", (req) => ({ params: req.query }));
const createPushMessage = createProxyHandler("post", "/api/push-messages", (req) => ({ body: req.body }));
const runPushDispatchCycle = createProxyHandler("post", "/api/push-messages/dispatch-cycle", (req) => ({ body: req.body }));
const getPushMessageStats = createProxyHandler("get", (req) => `/api/push-messages/${req.params.id}/stats`);
const getPushMessageDeliveries = createProxyHandler("get", (req) => `/api/push-messages/${req.params.id}/deliveries`, (req) => ({ params: req.query }));
const updatePushMessage = createProxyHandler("put", (req) => `/api/push-messages/${req.params.id}`, (req) => ({ body: req.body }));
const deletePushMessage = createProxyHandler("delete", (req) => `/api/push-messages/${req.params.id}`);
const getPublicAPIs = createProxyHandler("get", "/api/public-apis", (req) => ({ params: req.query }));
const createPublicAPI = createProxyHandler("post", "/api/public-apis", (req) => ({ body: req.body }));
const updatePublicAPI = createProxyHandler("put", (req) => `/api/public-apis/${req.params.id}`, (req) => ({ body: req.body }));
const deletePublicAPI = createProxyHandler("delete", (req) => `/api/public-apis/${req.params.id}`);

const getDebugMode = createProxyHandler("get", "/api/debug-mode");
const updateDebugMode = createProxyHandler("post", "/api/debug-mode", (req) => ({ body: req.body }));

const getSMSConfig = createProxyHandler("get", "/api/sms-config");
const updateSMSConfig = createProxyHandler("post", "/api/sms-config", (req) => ({ body: req.body }));

const getWeatherConfig = createProxyHandler("get", "/api/weather-config");
const updateWeatherConfig = createProxyHandler("post", "/api/weather-config", (req) => ({ body: req.body }));

const getWechatLoginConfig = createProxyHandler("get", "/api/wechat-login-config");
const updateWechatLoginConfig = createProxyHandler("post", "/api/wechat-login-config", (req) => ({ body: req.body }));

const getServiceSettings = createProxyHandler("get", "/api/service-settings");
const updateServiceSettings = createProxyHandler("post", "/api/service-settings", (req) => ({ body: req.body }));
const getHomeEntrySettings = createProxyHandler("get", "/api/home-entry-settings");
const updateHomeEntrySettings = createProxyHandler("post", "/api/home-entry-settings", (req) => ({ body: req.body }));
const getErrandSettings = createProxyHandler("get", "/api/errand-settings");
const updateErrandSettings = createProxyHandler("post", "/api/errand-settings", (req) => ({ body: req.body }));
const getMerchantTaxonomySettings = createProxyHandler("get", "/api/merchant-taxonomy-settings");
const updateMerchantTaxonomySettings = createProxyHandler("post", "/api/merchant-taxonomy-settings", (req) => ({ body: req.body }));
const getRiderRankSettings = createProxyHandler("get", "/api/rider-rank-settings");
const updateRiderRankSettings = createProxyHandler("post", "/api/rider-rank-settings", (req) => ({ body: req.body }));
const getDiningBuddySettings = createProxyHandler("get", "/api/dining-buddy-settings");
const updateDiningBuddySettings = createProxyHandler("post", "/api/dining-buddy-settings", (req) => ({ body: req.body }));
const getPublicRuntimeSettings = createProxyHandler("get", "/api/public/runtime-settings");
const getCharitySettings = createProxyHandler("get", "/api/charity-settings");
const updateCharitySettings = createProxyHandler("post", "/api/charity-settings", (req) => ({ body: req.body }));
const getPublicCharitySettings = createProxyHandler("get", "/api/public/charity-settings");
const getVIPSettings = createProxyHandler("get", "/api/vip-settings");
const updateVIPSettings = createProxyHandler("post", "/api/vip-settings", (req) => ({ body: req.body }));
const getPublicVIPSettings = createProxyHandler("get", "/api/public/vip-settings");
const exportSystemSettings = createProxyHandler("get", "/api/data-exports/system-settings");
const exportContentConfig = createProxyHandler("get", "/api/data-exports/content-config");
const exportAPIConfig = createProxyHandler("get", "/api/data-exports/api-config");
const exportPaymentConfig = createProxyHandler("get", "/api/data-exports/payment-config");
const importSystemSettings = createProxyHandler("post", "/api/data-imports/system-settings", (req) => ({ body: req.body }));
const importContentConfig = createProxyHandler("post", "/api/data-imports/content-config", (req) => ({ body: req.body }));
const importAPIConfig = createProxyHandler("post", "/api/data-imports/api-config", (req) => ({ body: req.body }));
const importPaymentConfig = createProxyHandler("post", "/api/data-imports/payment-config", (req) => ({ body: req.body }));

const getPayMode = createProxyHandler("get", "/api/pay-config/mode");
const updatePayMode = createProxyHandler("post", "/api/pay-config/mode", (req) => ({ body: req.body }));
const getWxpayConfig = createProxyHandler("get", "/api/pay-config/wxpay");
const updateWxpayConfig = createProxyHandler("post", "/api/pay-config/wxpay", (req) => ({ body: req.body }));
const getAlipayConfig = createProxyHandler("get", "/api/pay-config/alipay");
const updateAlipayConfig = createProxyHandler("post", "/api/pay-config/alipay", (req) => ({ body: req.body }));

const getCoinRatio = createProxyHandler("get", "/api/coin-ratio");
const updateCoinRatio = createProxyHandler("post", "/api/coin-ratio", (req) => ({ body: req.body }));
const adminRecharge = createProxyHandler("post", "/api/admin/wallet/recharge", (req) => ({ body: req.body }));

const getWeather = createProxyHandler("get", "/api/weather", (req) => ({
  params: req.query || {},
  includeClientIp: true,
}));

async function getAppDownloadConfig(req, res) {
  try {
    const response = await requestSettingsRaw(req, "get", "/api/app-download-config", {
      validateStatus(status) {
        return status < 500;
      }
    });
    return respondSettingsProxyResponse(req, res, response, {
      assetFields: ["ios_url", "android_url", "mini_program_qr_url"],
      defaultErrorMessage: "获取 APP 下载配置失败",
    });
  } catch (error) {
    return handleProxyError(req, res, error, "getAppDownloadConfig", { success: false, error: error.message });
  }
}

async function updateAppDownloadConfig(req, res) {
  try {
    const response = await requestSettingsRaw(req, "post", "/api/app-download-config", {
      body: req.body,
      validateStatus(status) {
        return status < 500;
      }
    });
    return respondSettingsProxyResponse(req, res, response, {
      defaultErrorMessage: "更新 APP 下载配置失败",
    });
  } catch (error) {
    return handleProxyError(req, res, error, "updateAppDownloadConfig", { success: false, error: error.message });
  }
}

async function uploadImage(req, res) {
  if (!req.file) {
    return respondSettingsError(req, res, 400, "没有上传文件");
  }

  const tempFilePath = req.file.path;
  try {
    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath), req.file.originalname);
    const response = await requestSettingsRaw(req, "post", "/api/upload-image", {
      body: form,
      headers: form.getHeaders(),
      validateStatus(status) {
        return status < 500;
      }
    });
    return respondSettingsProxyResponse(req, res, response, {
      assetFields: ["imageUrl", "image_url", "url", "asset_url"],
      defaultErrorMessage: "图片上传失败",
    });
  } catch (error) {
    return handleProxyError(req, res, error, "uploadImage", { success: false, error: error.message });
  } finally {
    safeUnlinkTempFile(tempFilePath);
  }
}

async function uploadEditorImage(req, res) {
  if (!req.file) {
    return respondSettingsError(req, res, 400, "没有上传文件");
  }

  const tempFilePath = req.file.path;
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath), req.file.originalname);
    const response = await requestSettingsRaw(req, "post", "/api/upload/image", {
      body: form,
      headers: form.getHeaders(),
      validateStatus(status) {
        return status < 500;
      }
    });
    return respondSettingsProxyResponse(req, res, response, {
      assetFields: ["url", "asset_url"],
      defaultErrorMessage: "编辑器图片上传失败",
    });
  } catch (error) {
    return handleProxyError(req, res, error, "uploadEditorImage", { success: false, error: error.message });
  } finally {
    safeUnlinkTempFile(tempFilePath);
  }
}

async function uploadPackage(req, res) {
  if (!req.file) {
    return respondSettingsError(req, res, 400, "没有上传文件");
  }

  const tempFilePath = req.file.path;
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath), req.file.originalname);
    const response = await requestSettingsRaw(req, "post", "/api/upload/package", {
      body: form,
      headers: form.getHeaders(),
      validateStatus(status) {
        return status < 500;
      }
    });
    return respondSettingsProxyResponse(req, res, response, {
      assetFields: ["url", "asset_url"],
      defaultErrorMessage: "安装包上传失败",
    });
  } catch (error) {
    return handleProxyError(req, res, error, "uploadPackage", { success: false, error: error.message });
  } finally {
    safeUnlinkTempFile(tempFilePath);
  }
}

async function clearAllData(req, res) {
  const verifyCredential = resolveClearAllVerifyCredential();
  if (!isClearAllVerifyConfigured()) {
    logger.error("POST /api/settings/clear-all-data", {
      action: "clear_all_data_verify_unconfigured"
    });
    return respondSettingsError(req, res, 503, "清空全量数据未配置二次校验口令，请联系管理员");
  }

  const verifyAccount = String(req.body?.verifyAccount || "").trim();
  const verifyPassword = String(req.body?.verifyPassword || "");
  const operatorId = String(req.operator?.operatorId || "");
  const operatorName = String(req.operator?.operatorName || "");

  const verified = verifyCriticalCredential({
    req,
    verifyAccount,
    verifyPassword,
    expectedAccount: verifyCredential.account,
    expectedPassword: verifyCredential.password,
  });

  if (!verified.ok) {
    logger.warn("POST /api/settings/clear-all-data", {
      action: "clear_all_data_verify_failed",
      operatorId,
      operatorName,
      ip: req.ip,
      principal: verified.principal,
      remainingAttempts: verified.remainingAttempts,
      lockedUntil: verified.lockedUntil || null,
    });
    return respondSettingsError(
      req,
      res,
      verified.status || 401,
      verified.error || "二次验证失败，账号或密码错误",
      {
        data: { lockedUntil: verified.lockedUntil || null },
        legacy: { lockedUntil: verified.lockedUntil || null },
      },
    );
  }

  try {
    const goResponse = await requestSettingsRaw(req, "post", "/api/admin/clear-all-data", {
      body: {},
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });
    if (goResponse.status >= 400) {
      return respondSettingsProxyResponse(req, res, goResponse, {
        defaultErrorMessage: "清空全部信息失败",
      });
    }

    const logCleanup = [
      clearLogFile(BFF_COMBINED_LOG_PATH),
      clearLogFile(BFF_ERROR_LOG_PATH),
      clearLogFile(GO_COMBINED_LOG_PATH),
      clearLogFile(GO_ERROR_LOG_PATH),
    ];
    const logCleared = logCleanup.reduce((sum, item) => sum + Number(item.cleared || 0), 0);

    logger.info("POST /api/settings/clear-all-data", {
      action: "clear_all_data",
      operatorId,
      operatorName,
      ip: req.ip,
      principal: verified.principal,
      logCleared,
      logCleanup,
      goResult: goResponse.data,
    });

    return respondSettingsSuccess(req, res, "全量数据清理完成", {
      goResult: goResponse.data,
      logCleared,
      logCleanup,
    });
  } catch (error) {
    return handleProxyError(req, res, error, "clearAllData", {
      success: false,
      error: error.message || "清空全部信息失败",
    });
  }
}

module.exports = {
  getCarousel,
  createCarousel,
  updateCarousel,
  deleteCarousel,
  getCarouselSettings,
  updateCarouselSettings,
  getPushMessages,
  createPushMessage,
  runPushDispatchCycle,
  getPushMessageStats,
  getPushMessageDeliveries,
  updatePushMessage,
  deletePushMessage,
  getPublicAPIs,
  createPublicAPI,
  updatePublicAPI,
  deletePublicAPI,
  getDebugMode,
  updateDebugMode,
  getSMSConfig,
  updateSMSConfig,
  getWeatherConfig,
  updateWeatherConfig,
  getWechatLoginConfig,
  updateWechatLoginConfig,
  getServiceSettings,
  updateServiceSettings,
  getHomeEntrySettings,
  updateHomeEntrySettings,
  getErrandSettings,
  updateErrandSettings,
  getMerchantTaxonomySettings,
  updateMerchantTaxonomySettings,
  getRiderRankSettings,
  updateRiderRankSettings,
  getDiningBuddySettings,
  updateDiningBuddySettings,
  getPublicRuntimeSettings,
  getCharitySettings,
  updateCharitySettings,
  getPublicCharitySettings,
  getVIPSettings,
  updateVIPSettings,
  getPublicVIPSettings,
  exportSystemSettings,
  exportContentConfig,
  exportAPIConfig,
  exportPaymentConfig,
  importSystemSettings,
  importContentConfig,
  importAPIConfig,
  importPaymentConfig,
  getAppDownloadConfig,
  updateAppDownloadConfig,
  getPayMode,
  updatePayMode,
  getWxpayConfig,
  updateWxpayConfig,
  getAlipayConfig,
  updateAlipayConfig,
  uploadImage,
  uploadEditorImage,
  uploadPackage,
  getWeather,
  getCoinRatio,
  updateCoinRatio,
  adminRecharge,
  clearAllData,
  normalizeAssetUrlFields,
};
