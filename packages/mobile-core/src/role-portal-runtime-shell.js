import { createPortalRuntimeStore } from "./portal-runtime.js";

function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function mergeFieldMap(baseFieldMap = {}, overrides = {}) {
  return {
    ...(baseFieldMap && typeof baseFieldMap === "object" ? baseFieldMap : {}),
    ...(overrides && typeof overrides === "object" ? overrides : {}),
  };
}

export const DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS = Object.freeze({
  title: "商户工作台",
  subtitle: "悦享e食 · Merchant Console",
  loginFooter: "账号由平台管理员分配，登录后可直接管理订单和商品",
  privacyPolicy:
    "我们会在必要范围内处理商户信息，用于订单履约、结算和风控，详细条款请联系平台管理员获取。",
  serviceAgreement:
    "使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。",
});

export const DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS = Object.freeze({
  title: "骑手登录",
  subtitle: "悦享e食 · 骑手端",
  loginFooter: "骑手账号由平台邀约开通",
});

export const DEFAULT_MERCHANT_PORTAL_RUNTIME_FIELD_MAP = Object.freeze({
  title: "merchant_portal_title",
  subtitle: "merchant_portal_subtitle",
  loginFooter: "merchant_portal_login_footer",
  privacyPolicy: "merchant_privacy_policy",
  serviceAgreement: "merchant_service_agreement",
});

export const DEFAULT_RIDER_PORTAL_RUNTIME_FIELD_MAP = Object.freeze({
  title: "rider_portal_title",
  subtitle: "rider_portal_subtitle",
  loginFooter: "rider_portal_login_footer",
});

export function resolveRolePortalRuntimeDefaultSettings(role, defaultSettings = {}) {
  const normalizedRole = trimValue(role);
  const baseDefaults =
    normalizedRole === "merchant"
      ? DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS
      : DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS;

  return {
    ...baseDefaults,
    ...(defaultSettings && typeof defaultSettings === "object" ? defaultSettings : {}),
  };
}

export function resolveRolePortalRuntimeFieldMap(role, fieldMap = {}) {
  const normalizedRole = trimValue(role);
  const baseFieldMap =
    normalizedRole === "merchant"
      ? DEFAULT_MERCHANT_PORTAL_RUNTIME_FIELD_MAP
      : DEFAULT_RIDER_PORTAL_RUNTIME_FIELD_MAP;

  return mergeFieldMap(baseFieldMap, fieldMap);
}

export function createDefaultRolePortalRuntimeBindings(options = {}) {
  const createPortalRuntimeStoreImpl =
    options.createPortalRuntimeStoreImpl || createPortalRuntimeStore;

  return createPortalRuntimeStoreImpl({
    fetchRuntimeSettings: options.fetchRuntimeSettings,
    defaultSettings: resolveRolePortalRuntimeDefaultSettings(
      options.role,
      options.defaultSettings,
    ),
    fieldMap: resolveRolePortalRuntimeFieldMap(options.role, options.fieldMap),
  });
}
