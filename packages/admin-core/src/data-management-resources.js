function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const DATA_MANAGEMENT_IMPORT_MAX_MB = 10;

export const DATA_MANAGEMENT_BUSINESS_TYPES = Object.freeze([
  Object.freeze({
    key: "users",
    label: "用户",
    exportEndpoint: "/api/users/export",
    importEndpoint: "/api/users/import",
    requestKey: "users",
    filenamePrefix: "users_backup",
  }),
  Object.freeze({
    key: "riders",
    label: "骑手",
    exportEndpoint: "/api/riders/export",
    importEndpoint: "/api/riders/import",
    requestKey: "riders",
    filenamePrefix: "riders_backup",
  }),
  Object.freeze({
    key: "orders",
    label: "订单",
    exportEndpoint: "/api/orders/export",
    importEndpoint: "/api/orders/import",
    requestKey: "orders",
    filenamePrefix: "orders_backup",
  }),
  Object.freeze({
    key: "merchants",
    label: "商户",
    exportEndpoint: "/api/merchants/export",
    importEndpoint: "/api/merchants/import",
    requestKey: "merchants",
    filenamePrefix: "merchants_backup",
  }),
]);

export const DATA_MANAGEMENT_CONFIG_SCOPES = Object.freeze([
  Object.freeze({
    key: "system_settings",
    label: "系统配置",
    exportEndpoint: "/api/data-exports/system-settings",
    importEndpoint: "/api/data-imports/system-settings",
    filenamePrefix: "system_settings_backup",
    signatureKeys: Object.freeze([
      "debug_mode",
      "service_settings",
      "charity_settings",
      "vip_settings",
      "coin_ratio",
      "app_download_config",
    ]),
  }),
  Object.freeze({
    key: "content_config",
    label: "内容配置",
    exportEndpoint: "/api/data-exports/content-config",
    importEndpoint: "/api/data-imports/content-config",
    filenamePrefix: "content_config_backup",
    signatureKeys: Object.freeze([
      "carousel_settings",
      "carousels",
      "push_messages",
      "home_campaigns",
    ]),
  }),
  Object.freeze({
    key: "api_config",
    label: "API 配置",
    exportEndpoint: "/api/data-exports/api-config",
    importEndpoint: "/api/data-imports/api-config",
    filenamePrefix: "api_config_backup",
    signatureKeys: Object.freeze([
      "sms_config",
      "weather_config",
      "wechat_login_config",
      "public_apis",
    ]),
  }),
  Object.freeze({
    key: "payment_config",
    label: "支付配置",
    exportEndpoint: "/api/data-exports/payment-config",
    importEndpoint: "/api/data-imports/payment-config",
    filenamePrefix: "payment_config_backup",
    signatureKeys: Object.freeze([
      "pay_mode",
      "wxpay_config",
      "alipay_config",
      "payment_notices",
    ]),
  }),
]);

const BUSINESS_META_MAP = Object.freeze(
  DATA_MANAGEMENT_BUSINESS_TYPES.reduce((result, item) => {
    result[item.key] = item;
    return result;
  }, {}),
);

const CONFIG_SCOPE_META_MAP = Object.freeze(
  DATA_MANAGEMENT_CONFIG_SCOPES.reduce((result, item) => {
    result[item.key] = item;
    return result;
  }, {}),
);

const DATA_MANAGEMENT_SUMMARY_CARD_META = Object.freeze([
  Object.freeze({
    key: "users",
    label: "用户",
    tip: "用户数据已校验总量",
  }),
  Object.freeze({
    key: "riders",
    label: "骑手",
    tip: "骑手数据已校验总量",
  }),
  Object.freeze({
    key: "orders",
    label: "订单",
    tip: "订单数据已校验总量",
  }),
  Object.freeze({
    key: "merchants",
    label: "商户",
    tip: "商户数据已校验总量",
  }),
  Object.freeze({
    key: "systemSettingKeys",
    label: "系统配置",
    tip: "可导出配置键数量",
  }),
  Object.freeze({
    key: "contentItems",
    label: "内容运营",
    tip: "轮播、推送、首页投放总数",
  }),
  Object.freeze({
    key: "publicApiCount",
    label: "API 配置",
    tip: "第三方与开放接口数量",
  }),
  Object.freeze({
    key: "paymentConfigGroups",
    label: "支付配置",
    tip: "支付配置组数量",
  }),
]);

const PLATFORM_BACKUP_SECTION_KEYS = Object.freeze([
  "users",
  "riders",
  "orders",
  "merchants",
  "system_settings",
  "content_config",
  "api_config",
  "payment_config",
]);

export function formatDataManagementExportDate(value = new Date()) {
  return value.toISOString().split("T")[0];
}

export function createDataManagementExportSummary() {
  return {
    users: 0,
    riders: 0,
    orders: 0,
    merchants: 0,
    systemSettingKeys: 0,
    contentItems: 0,
    publicApiCount: 0,
    paymentConfigGroups: 0,
  };
}

export function buildDataManagementContentItemCount(summary = {}) {
  return (
    normalizeNumber(summary?.carousel_count) +
    normalizeNumber(summary?.push_message_count) +
    normalizeNumber(summary?.home_campaign_count)
  );
}

export function buildDataManagementSummaryCards(summary = {}, loaded = false) {
  const normalized = {
    ...createDataManagementExportSummary(),
    ...(summary && typeof summary === "object" ? summary : {}),
  };

  return DATA_MANAGEMENT_SUMMARY_CARD_META.map((item) => ({
    label: item.label,
    value: loaded ? normalized[item.key] : "--",
    tip: item.tip,
  }));
}

export function getDataManagementBusinessMeta(type) {
  return BUSINESS_META_MAP[type] || null;
}

export function getDataManagementConfigMeta(scope) {
  return CONFIG_SCOPE_META_MAP[scope] || null;
}

export function validateDataManagementImportFile(
  file,
  maxMB = DATA_MANAGEMENT_IMPORT_MAX_MB,
) {
  if (!file?.name) {
    return { valid: false, message: "请选择JSON格式的文件" };
  }

  if (file.type !== "application/json" && !file.name.endsWith(".json")) {
    return { valid: false, message: "请选择JSON格式的文件" };
  }

  if (Number(file.size || 0) > maxMB * 1024 * 1024) {
    return { valid: false, message: `文件大小不能超过${maxMB}MB` };
  }

  return { valid: true, message: "" };
}

export function buildDataManagementImportPayload(type, data = []) {
  const meta = getDataManagementBusinessMeta(type);
  if (!meta) {
    return {};
  }
  return { [meta.requestKey]: data };
}

export function buildDataManagementImportConfirmMessage(type, count) {
  const meta = getDataManagementBusinessMeta(type);
  if (!meta) {
    return "";
  }
  return `即将导入 ${count} 条${meta.label}数据，这将覆盖或创建${meta.label}（包括已删除的${meta.label}）。是否继续？`;
}

export function buildDataManagementConfigImportConfirmMessage(scope) {
  const meta = getDataManagementConfigMeta(scope);
  if (!meta) {
    return "";
  }
  return `即将导入${meta.label}，这会按备份内容覆盖或创建对应配置。是否继续？`;
}

export function validateDataManagementBusinessData(data, expectedType) {
  if (!Array.isArray(data) || data.length === 0) {
    return { valid: false, error: "数据格式错误，应为非空数组" };
  }

  const firstItem = data[0];

  if (expectedType === "users") {
    if (
      firstItem.rider_id !== undefined ||
      firstItem.daily_order_count !== undefined
    ) {
      return { valid: false, error: "检测到这是骑手数据，不能导入到用户数据中！" };
    }
    if (
      firstItem.daily_order_id !== undefined ||
      firstItem.order_status !== undefined
    ) {
      return { valid: false, error: "检测到这是订单数据，不能导入到用户数据中！" };
    }
    if (
      firstItem.merchant_id !== undefined ||
      firstItem.merchant_name !== undefined
    ) {
      return { valid: false, error: "检测到这是商户数据，不能导入到用户数据中！" };
    }
  } else if (expectedType === "riders") {
    if (
      firstItem.customer_id !== undefined ||
      firstItem.order_count_today !== undefined
    ) {
      return { valid: false, error: "检测到这是用户数据，不能导入到骑手数据中！" };
    }
    if (
      firstItem.daily_order_id !== undefined ||
      firstItem.order_status !== undefined
    ) {
      return { valid: false, error: "检测到这是订单数据，不能导入到骑手数据中！" };
    }
    if (
      firstItem.merchant_id !== undefined ||
      firstItem.merchant_name !== undefined
    ) {
      return { valid: false, error: "检测到这是商户数据，不能导入到骑手数据中！" };
    }
  } else if (expectedType === "orders") {
    if (
      firstItem.rider_id !== undefined &&
      firstItem.daily_order_count !== undefined
    ) {
      return { valid: false, error: "检测到这是骑手数据，不能导入到订单数据中！" };
    }
    if (
      firstItem.customer_id !== undefined &&
      firstItem.order_count_today !== undefined
    ) {
      return { valid: false, error: "检测到这是用户数据，不能导入到订单数据中！" };
    }
    if (
      firstItem.merchant_id !== undefined &&
      firstItem.merchant_name !== undefined &&
      firstItem.daily_order_id === undefined
    ) {
      return { valid: false, error: "检测到这是商户数据，不能导入到订单数据中！" };
    }
  } else if (expectedType === "merchants") {
    if (
      firstItem.rider_id !== undefined ||
      firstItem.daily_order_count !== undefined
    ) {
      return { valid: false, error: "检测到这是骑手数据，不能导入到商户数据中！" };
    }
    if (
      firstItem.customer_id !== undefined ||
      firstItem.order_count_today !== undefined
    ) {
      return { valid: false, error: "检测到这是用户数据，不能导入到商户数据中！" };
    }
    if (
      firstItem.daily_order_id !== undefined ||
      firstItem.order_status !== undefined
    ) {
      return { valid: false, error: "检测到这是订单数据，不能导入到商户数据中！" };
    }
  }

  return { valid: true };
}

export function validateDataManagementConfigBundle(data, expectedScope) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "配置文件格式错误，应为对象格式" };
  }

  const expectedMeta = getDataManagementConfigMeta(expectedScope);
  if (!expectedMeta) {
    return { valid: false, error: "未知配置类型" };
  }

  if (data.scope && data.scope !== expectedScope) {
    return {
      valid: false,
      error: `检测到这是 ${data.scope} 导出文件，不能导入到 ${expectedScope} 中！`,
    };
  }

  const matchedCount = expectedMeta.signatureKeys.filter(
    (key) => data[key] !== undefined,
  ).length;
  if (matchedCount === 0) {
    return { valid: false, error: "未检测到当前配置类型的关键字段" };
  }

  const conflict = DATA_MANAGEMENT_CONFIG_SCOPES.filter(
    (item) => item.key !== expectedScope,
  )
    .map((item) => ({
      scope: item.key,
      matched: item.signatureKeys.filter((key) => data[key] !== undefined).length,
    }))
    .find((item) => item.matched > matchedCount);

  if (conflict) {
    return {
      valid: false,
      error: `检测到这是 ${conflict.scope} 导出文件，不能导入到 ${expectedScope} 中！`,
    };
  }

  return { valid: true };
}

export function isPlatformBackupPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  return (
    data.backupType === "platform_snapshot" ||
    PLATFORM_BACKUP_SECTION_KEYS.some((key) => data[key] !== undefined)
  );
}

export function buildPlatformBackupSummary(allData = {}) {
  const contentSummary = allData.content_config?.summary || {};
  const apiSummary = allData.api_config?.summary || {};
  const paymentSummary = allData.payment_config?.summary || {};
  const systemSummary = allData.system_settings?.summary || {};

  return {
    usersCount: Array.isArray(allData.users) ? allData.users.length : 0,
    ridersCount: Array.isArray(allData.riders) ? allData.riders.length : 0,
    ordersCount: Array.isArray(allData.orders) ? allData.orders.length : 0,
    merchantsCount: Array.isArray(allData.merchants)
      ? allData.merchants.length
      : 0,
    systemSettingKeys: normalizeNumber(systemSummary.setting_keys),
    contentItemsCount: buildDataManagementContentItemCount(contentSummary),
    publicApiCount: normalizeNumber(apiSummary.public_api_count),
    paymentConfigGroups: normalizeNumber(paymentSummary.config_groups),
  };
}
