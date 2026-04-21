import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

const DEFAULT_PAYMENT_GATEWAY_SUMMARY = {
  mode: { isProd: false },
  wechat: {},
  alipay: {},
  bankCard: {},
};

const DEFAULT_PAY_MODE = {
  isProd: false,
};

const DEFAULT_WXPAY_CONFIG = {
  appId: "",
  mchId: "",
  apiKey: "",
  apiV3Key: "",
  serialNo: "",
  notifyUrl: "",
  refundNotifyUrl: "",
  payoutNotifyUrl: "",
  payoutSceneId: "",
};

const DEFAULT_ALIPAY_CONFIG = {
  appId: "",
  privateKey: "",
  alipayPublicKey: "",
  notifyUrl: "",
  payoutNotifyUrl: "",
  sidecarUrl: "",
  sandbox: true,
};

const DEFAULT_RIDER_DEPOSIT_POLICY = {
  amount: 5000,
  unlock_days: 7,
  auto_approve_withdrawal: true,
  allowed_methods: ["wechat", "alipay"],
};

const DEFAULT_BANK_CARD_CONFIG = {
  arrival_text: "24小时-48小时",
  sidecar_url: "",
  provider_url: "",
  merchant_id: "",
  api_key: "",
  notify_url: "",
};

const DEFAULT_PAYMENT_CALLBACK_FILTER = {
  channel: "",
  eventType: "",
  status: "",
  verified: "",
  transactionId: "",
  thirdPartyOrderId: "",
};

const DEFAULT_BANK_PAYOUT_FORM = {
  requestId: "",
  payoutVoucherUrl: "",
  payoutReferenceNo: "",
  payoutSourceBankName: "",
  payoutSourceBankBranch: "",
  payoutSourceCardNo: "",
  payoutSourceAccountName: "",
  transferResult: "",
};

const DEFAULT_WITHDRAW_HISTORY_TARGET = {
  requestId: "",
  method: "",
  userType: "",
  amount: 0,
};

const DEFAULT_WITHDRAW_REQUEST_FILTER = {
  status: "",
  userType: "",
  withdrawMethod: "",
};

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneValue(value, fallback) {
  const source = value == null ? fallback : value;
  return JSON.parse(JSON.stringify(source));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function normalizeOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return Boolean(value);
}

function normalizeBoolean(value, fallback = false) {
  const normalized = normalizeOptionalBoolean(value);
  return normalized === undefined ? fallback : normalized;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    return value;
  }
  return undefined;
}

function firstText(...values) {
  return normalizeText(firstDefined(...values));
}

function hasAnyKeys(value) {
  return Object.keys(asRecord(value)).length > 0;
}

function copyStructuredValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return cloneValue(value, value);
}

function normalizePage(payload, { listKeys, normalizeItem } = {}) {
  const page = extractPaginatedItems(payload, { listKeys });
  const items = Array.isArray(page.items) ? page.items : [];

  return {
    ...page,
    items:
      typeof normalizeItem === "function"
        ? items.map((item) => normalizeItem(item))
        : items,
  };
}

function formatDateTimeValue(value, options = {}) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }
  if (typeof options.formatDateTime === "function") {
    return options.formatDateTime(raw);
  }
  return formatAdminDateTime(raw, {
    includeSeconds: options.includeSeconds === true,
  });
}

function normalizeWalletTransactionRecord(raw = {}) {
  const source = asRecord(raw);
  const transactionId = firstText(source.transaction_id, source.transactionId);
  const businessType = firstText(source.business_type, source.businessType);
  const paymentChannel = firstText(source.payment_channel, source.paymentChannel);
  const userType = firstText(source.user_type, source.userType);
  const thirdPartyOrderId = firstText(
    source.third_party_order_id,
    source.thirdPartyOrderId,
  );

  return {
    ...source,
    transaction_id: transactionId,
    transactionId: transactionId,
    status: firstText(source.status),
    business_type: businessType,
    businessType: businessType,
    payment_channel: paymentChannel,
    paymentChannel: paymentChannel,
    user_id: firstText(source.user_id, source.userId),
    userId: firstText(source.user_id, source.userId),
    user_type: userType,
    userType: userType,
    third_party_order_id: thirdPartyOrderId,
    thirdPartyOrderId: thirdPartyOrderId,
    created_at: firstDefined(source.created_at, source.createdAt),
    createdAt: firstDefined(source.created_at, source.createdAt),
    updated_at: firstDefined(source.updated_at, source.updatedAt),
    updatedAt: firstDefined(source.updated_at, source.updatedAt),
  };
}

export function createDefaultPaymentGatewaySummary() {
  return cloneValue(DEFAULT_PAYMENT_GATEWAY_SUMMARY, DEFAULT_PAYMENT_GATEWAY_SUMMARY);
}

export function normalizePaymentGatewaySummary(raw = {}) {
  const source = asRecord(raw);
  const modeSource = asRecord(source.mode);

  return {
    mode: {
      ...cloneValue(modeSource, {}),
      isProd: normalizeBoolean(
        firstDefined(modeSource.isProd, modeSource.is_prod),
        false,
      ),
    },
    wechat: cloneValue(source.wechat, {}),
    alipay: cloneValue(source.alipay, {}),
    bankCard: cloneValue(firstDefined(source.bankCard, source.bank_card), {}),
  };
}

export function normalizePaymentCenterConfig(payload = {}) {
  const source = asRecord(extractEnvelopeData(payload));
  const payMode = {
    ...cloneValue(DEFAULT_PAY_MODE, DEFAULT_PAY_MODE),
    ...cloneValue(source.pay_mode, {}),
  };
  payMode.isProd = normalizeBoolean(
    firstDefined(payMode.isProd, payMode.is_prod),
    false,
  );

  const alipayConfig = {
    ...cloneValue(DEFAULT_ALIPAY_CONFIG, DEFAULT_ALIPAY_CONFIG),
    ...cloneValue(source.alipay_config, {}),
  };
  alipayConfig.sandbox = normalizeBoolean(alipayConfig.sandbox, true);

  const bankCardConfig = {
    ...cloneValue(DEFAULT_BANK_CARD_CONFIG, DEFAULT_BANK_CARD_CONFIG),
    ...cloneValue(source.bank_card_config, {}),
  };
  delete bankCardConfig.allow_stub;
  delete bankCardConfig.allowStub;
  bankCardConfig.sidecar_url = normalizeText(bankCardConfig.sidecar_url);
  bankCardConfig.provider_url = normalizeText(bankCardConfig.provider_url);
  bankCardConfig.merchant_id = normalizeText(bankCardConfig.merchant_id);
  bankCardConfig.api_key = normalizeText(bankCardConfig.api_key);
  bankCardConfig.notify_url = normalizeText(bankCardConfig.notify_url);

  return {
    gatewaySummary: normalizePaymentGatewaySummary(source.gateway_summary),
    pay_mode: payMode,
    wxpay_config: {
      ...cloneValue(DEFAULT_WXPAY_CONFIG, DEFAULT_WXPAY_CONFIG),
      ...cloneValue(source.wxpay_config, {}),
    },
    alipay_config: alipayConfig,
    channel_matrix: cloneValue(source.channel_matrix, []),
    withdraw_fee_rules: cloneValue(source.withdraw_fee_rules, []),
    settlement_subjects: cloneValue(source.settlement_subjects, []),
    settlement_rules: cloneValue(source.settlement_rules, []),
    rider_deposit_policy: {
      ...cloneValue(DEFAULT_RIDER_DEPOSIT_POLICY, DEFAULT_RIDER_DEPOSIT_POLICY),
      ...cloneValue(source.rider_deposit_policy, {}),
    },
    bank_card_config: bankCardConfig,
  };
}

export function createPaymentCenterConfigDraft(payload = {}) {
  const normalized = normalizePaymentCenterConfig(payload);
  return {
    gatewaySummary: cloneValue(
      normalized.gatewaySummary,
      DEFAULT_PAYMENT_GATEWAY_SUMMARY,
    ),
    pay_mode: cloneValue(normalized.pay_mode, DEFAULT_PAY_MODE),
    wxpay_config: cloneValue(normalized.wxpay_config, DEFAULT_WXPAY_CONFIG),
    alipay_config: cloneValue(normalized.alipay_config, DEFAULT_ALIPAY_CONFIG),
    channel_matrix: cloneValue(normalized.channel_matrix, []),
    withdraw_fee_rules: cloneValue(normalized.withdraw_fee_rules, []),
    settlement_subjects: cloneValue(normalized.settlement_subjects, []),
    settlementRulesText: JSON.stringify(
      cloneValue(normalized.settlement_rules, []),
      null,
      2,
    ),
    rider_deposit_policy: cloneValue(
      normalized.rider_deposit_policy,
      DEFAULT_RIDER_DEPOSIT_POLICY,
    ),
    bank_card_config: cloneValue(
      normalized.bank_card_config,
      DEFAULT_BANK_CARD_CONFIG,
    ),
  };
}

export function buildPaymentCenterConfigPayload(draft = {}) {
  let settlementRules = [];

  try {
    const parsed = JSON.parse(
      normalizeText(firstDefined(draft.settlementRulesText), "[]"),
    );
    if (!Array.isArray(parsed)) {
      throw new Error("分账规则 JSON 必须是数组");
    }
    settlementRules = cloneValue(parsed, []);
  } catch (error) {
    if (error?.message === "分账规则 JSON 必须是数组") {
      throw error;
    }
    throw new Error("分账规则 JSON 格式不正确，请先修正后再保存");
  }

  return {
    pay_mode: cloneValue(draft.pay_mode, DEFAULT_PAY_MODE),
    wxpay_config: cloneValue(draft.wxpay_config, DEFAULT_WXPAY_CONFIG),
    alipay_config: cloneValue(draft.alipay_config, DEFAULT_ALIPAY_CONFIG),
    channel_matrix: cloneValue(draft.channel_matrix, []),
    withdraw_fee_rules: cloneValue(draft.withdraw_fee_rules, []),
    settlement_rules: settlementRules,
    settlement_subjects: cloneValue(draft.settlement_subjects, []),
    rider_deposit_policy: cloneValue(
      draft.rider_deposit_policy,
      DEFAULT_RIDER_DEPOSIT_POLICY,
    ),
    bank_card_config: cloneValue(
      draft.bank_card_config,
      DEFAULT_BANK_CARD_CONFIG,
    ),
  };
}

export function normalizeWithdrawRequestRecord(raw = {}) {
  const source = asRecord(raw);
  const transaction = normalizeWalletTransactionRecord(source.transaction);
  const requestId = firstText(source.request_id, source.requestId);
  const transactionId = firstText(
    source.transaction_id,
    source.transactionId,
    transaction.transaction_id,
  );
  const userType = firstText(source.user_type, source.userType);
  const withdrawMethod = firstText(source.withdraw_method, source.withdrawMethod);
  const thirdPartyOrderId = firstText(
    source.third_party_order_id,
    source.thirdPartyOrderId,
    transaction.third_party_order_id,
  );
  const autoRetrySource = asRecord(firstDefined(source.auto_retry, source.autoRetry));
  const responseData = firstDefined(source.response_data, source.responseData);
  const gatewaySubmitted = normalizeOptionalBoolean(
    firstDefined(source.gateway_submitted, source.gatewaySubmitted),
  );

  return {
    ...source,
    request_id: requestId,
    requestId: requestId,
    transaction_id: transactionId,
    transactionId: transactionId,
    user_type: userType,
    userType: userType,
    withdraw_method: withdrawMethod,
    withdrawMethod: withdrawMethod,
    status: firstText(source.status),
    amount: normalizeNumber(source.amount, 0),
    fee: normalizeNumber(source.fee, 0),
    actual_amount: normalizeNumber(
      firstDefined(source.actual_amount, source.actualAmount),
      0,
    ),
    actualAmount: normalizeNumber(
      firstDefined(source.actual_amount, source.actualAmount),
      0,
    ),
    third_party_order_id: thirdPartyOrderId,
    thirdPartyOrderId: thirdPartyOrderId,
    transfer_result: firstText(source.transfer_result, source.transferResult),
    transferResult: firstText(source.transfer_result, source.transferResult),
    reject_reason: firstText(source.reject_reason, source.rejectReason),
    rejectReason: firstText(source.reject_reason, source.rejectReason),
    transaction_status: firstText(
      source.transaction_status,
      source.transactionStatus,
      transaction.status,
    ),
    transactionStatus: firstText(
      source.transaction_status,
      source.transactionStatus,
      transaction.status,
    ),
    arrival_text: firstText(source.arrival_text, source.arrivalText),
    arrivalText: firstText(source.arrival_text, source.arrivalText),
    response_data: copyStructuredValue(responseData),
    responseData: copyStructuredValue(responseData),
    auto_retry: cloneValue(autoRetrySource, {}),
    autoRetry: cloneValue(autoRetrySource, {}),
    gateway_submitted: gatewaySubmitted,
    gatewaySubmitted: gatewaySubmitted,
    created_at: firstDefined(source.created_at, source.createdAt),
    createdAt: firstDefined(source.created_at, source.createdAt),
    updated_at: firstDefined(source.updated_at, source.updatedAt),
    updatedAt: firstDefined(source.updated_at, source.updatedAt),
    reviewed_at: firstDefined(source.reviewed_at, source.reviewedAt),
    reviewedAt: firstDefined(source.reviewed_at, source.reviewedAt),
    completed_at: firstDefined(source.completed_at, source.completedAt),
    completedAt: firstDefined(source.completed_at, source.completedAt),
    transaction: hasAnyKeys(transaction) ? transaction : undefined,
  };
}

export function extractWithdrawRequestPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "withdrawRequests", "requests", "records"],
    normalizeItem: normalizeWithdrawRequestRecord,
  });
}

export function normalizePaymentCallbackRecord(raw = {}) {
  const source = asRecord(raw);
  const transaction = normalizeWalletTransactionRecord(source.transaction);
  const withdraw = normalizeWithdrawRequestRecord(source.withdraw);
  const callbackId = firstText(source.callback_id, source.callbackId);
  const eventType = firstText(source.event_type, source.eventType);
  const transactionId = firstText(
    source.transaction_id,
    source.transactionId,
    transaction.transaction_id,
  );
  const thirdPartyOrderId = firstText(
    source.third_party_order_id,
    source.thirdPartyOrderId,
    transaction.third_party_order_id,
    withdraw.third_party_order_id,
  );
  const verified = normalizeOptionalBoolean(source.verified);
  const requestHeaders = firstDefined(source.request_headers, source.requestHeaders);
  const requestBody = firstDefined(source.request_body, source.requestBody);
  const responseBody = firstDefined(source.response_body, source.responseBody);
  const isAdminReplay = normalizeBoolean(
    firstDefined(source.is_admin_replay, source.isAdminReplay),
    false,
  );

  return {
    ...source,
    callback_id: callbackId,
    callbackId: callbackId,
    channel: firstText(source.channel),
    event_type: eventType,
    eventType: eventType,
    status: firstText(source.status),
    verified: verified,
    transaction_id: transactionId,
    transactionId: transactionId,
    third_party_order_id: thirdPartyOrderId,
    thirdPartyOrderId: thirdPartyOrderId,
    request_body_preview: firstText(
      source.request_body_preview,
      source.requestBodyPreview,
    ),
    requestBodyPreview: firstText(
      source.request_body_preview,
      source.requestBodyPreview,
    ),
    is_admin_replay: isAdminReplay,
    isAdminReplay: isAdminReplay,
    replayed_from_callback_id: firstText(
      source.replayed_from_callback_id,
      source.replayedFromCallbackId,
    ),
    replayedFromCallbackId: firstText(
      source.replayed_from_callback_id,
      source.replayedFromCallbackId,
    ),
    replay_admin_name: firstText(
      source.replay_admin_name,
      source.replayAdminName,
    ),
    replayAdminName: firstText(
      source.replay_admin_name,
      source.replayAdminName,
    ),
    replay_admin_id: firstText(source.replay_admin_id, source.replayAdminId),
    replayAdminId: firstText(source.replay_admin_id, source.replayAdminId),
    replay_fingerprint: firstText(
      source.replay_fingerprint,
      source.replayFingerprint,
    ),
    replayFingerprint: firstText(
      source.replay_fingerprint,
      source.replayFingerprint,
    ),
    created_at: firstDefined(source.created_at, source.createdAt),
    createdAt: firstDefined(source.created_at, source.createdAt),
    processed_at: firstDefined(source.processed_at, source.processedAt),
    processedAt: firstDefined(source.processed_at, source.processedAt),
    request_headers: copyStructuredValue(requestHeaders),
    requestHeaders: copyStructuredValue(requestHeaders),
    request_headers_raw: firstText(
      source.request_headers_raw,
      source.requestHeadersRaw,
    ),
    requestHeadersRaw: firstText(
      source.request_headers_raw,
      source.requestHeadersRaw,
    ),
    request_body: copyStructuredValue(requestBody),
    requestBody: copyStructuredValue(requestBody),
    request_body_raw: firstText(source.request_body_raw, source.requestBodyRaw),
    requestBodyRaw: firstText(source.request_body_raw, source.requestBodyRaw),
    response_body: copyStructuredValue(responseBody),
    responseBody: copyStructuredValue(responseBody),
    response_body_raw: firstText(
      source.response_body_raw,
      source.responseBodyRaw,
    ),
    responseBodyRaw: firstText(
      source.response_body_raw,
      source.responseBodyRaw,
    ),
    transaction: hasAnyKeys(transaction) ? transaction : undefined,
    withdraw: hasAnyKeys(withdraw) ? withdraw : undefined,
  };
}

export function extractPaymentCallbackPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "callbacks", "records"],
    normalizeItem: normalizePaymentCallbackRecord,
  });
}

export function extractPaymentCallbackDetail(payload = {}) {
  const data = extractEnvelopeData(payload);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return normalizePaymentCallbackRecord(data);
}

export function formatAdminDateTime(value, options = {}) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (part) => String(part).padStart(2, "0");
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (options.includeSeconds) {
    return `${base}:${pad(date.getSeconds())}`;
  }
  return base;
}

export function getWithdrawAutoRetry(row) {
  const source = asRecord(row);
  const retrySource = asRecord(firstDefined(source.auto_retry, source.autoRetry));
  if (!hasAnyKeys(retrySource)) {
    return null;
  }
  return {
    ...retrySource,
    eligible: normalizeBoolean(retrySource.eligible, false),
    retryExhausted: normalizeBoolean(
      firstDefined(retrySource.retryExhausted, retrySource.retry_exhausted),
      false,
    ),
    retryCount: normalizeNumber(
      firstDefined(retrySource.retryCount, retrySource.retry_count),
      0,
    ),
    maxRetryCount: normalizeNumber(
      firstDefined(retrySource.maxRetryCount, retrySource.max_retry_count),
      0,
    ),
    nextRetryAt: firstText(retrySource.nextRetryAt, retrySource.next_retry_at),
    lastRetryAt: firstText(retrySource.lastRetryAt, retrySource.last_retry_at),
    lastFailureReason: firstText(
      retrySource.lastFailureReason,
      retrySource.last_failure_reason,
    ),
  };
}

export function withdrawAutoRetryTag(row) {
  const retry = getWithdrawAutoRetry(row);
  if (!retry?.eligible) {
    return "info";
  }
  if (retry.retryExhausted) {
    return "danger";
  }
  if (retry.nextRetryAt) {
    return "warning";
  }
  if (retry.retryCount > 0) {
    return "success";
  }
  return "info";
}

export function withdrawAutoRetryLabel(row, options = {}) {
  const retry = getWithdrawAutoRetry(row);
  if (!retry?.eligible) {
    return options.disabledLabel ?? "未启用";
  }
  if (retry.retryExhausted) {
    return "已耗尽";
  }
  if (retry.nextRetryAt) {
    if (options.includeNextRetryAt) {
      return `待自动重试：${formatDateTimeValue(retry.nextRetryAt, options)}`;
    }
    return "待自动重试";
  }
  if (retry.retryCount > 0) {
    return `已重试 ${retry.retryCount}/${retry.maxRetryCount || 3}`;
  }
  return "自动重试已启用";
}

export function withdrawAutoRetryHint(row, options = {}) {
  const retry = getWithdrawAutoRetry(row);
  if (!retry?.eligible) {
    return options.disabledHint ?? "-";
  }
  if (retry.nextRetryAt) {
    return `下次重试：${formatDateTimeValue(retry.nextRetryAt, options)}`;
  }
  if (retry.retryExhausted) {
    return retry.lastFailureReason || "已达到最大重试次数";
  }
  if (retry.lastRetryAt) {
    return `最近重试：${formatDateTimeValue(retry.lastRetryAt, options)}`;
  }
  if (retry.retryCount > 0) {
    return `累计重试 ${retry.retryCount} 次`;
  }
  return "等待网关回调或人工处理";
}

export function withdrawStatusLabel(status) {
  return {
    pending: "待审核",
    pending_review: "待审核",
    pending_transfer: "待打款",
    transferring: "转账中",
    success: "已完成",
    failed: "已失败",
    rejected: "已驳回",
  }[String(status || "")] || status || "-";
}

export function withdrawStatusTag(status) {
  if (status === "success") {
    return "success";
  }
  if (status === "failed" || status === "rejected") {
    return "danger";
  }
  if (status === "pending_transfer" || status === "transferring") {
    return "warning";
  }
  return "info";
}

export function withdrawMethodLabel(method) {
  return {
    wechat: "微信提现",
    alipay: "支付宝提现",
    bank_card: "银行卡提现",
  }[String(method || "")] || method || "-";
}

export function withdrawUserTypeLabel(userType) {
  return {
    customer: "用户",
    rider: "骑手",
    merchant: "商户",
  }[String(userType || "")] || userType || "-";
}

export function withdrawOperationTypeLabel(value) {
  return {
    withdraw_approve: "审核通过",
    withdraw_reject: "审核驳回",
    withdraw_execute: "发起打款",
    withdraw_mark_processing: "标记转账中",
    withdraw_complete: "确认打款成功",
    withdraw_fail: "标记打款失败",
    withdraw_sync_gateway_status: "同步网关状态",
    withdraw_retry_payout: "重试打款",
    withdraw_supplement_success: "补记成功",
    withdraw_supplement_fail: "补记失败",
  }[String(value || "").trim()] || String(value || "-");
}

export function paymentCallbackStatusTag(row) {
  const status = String(row?.status || "");
  if (row?.verified === false) {
    return "danger";
  }
  if (status === "success") {
    return "success";
  }
  if (status === "processing" || status === "pending") {
    return "warning";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "ignored") {
    return "info";
  }
  return "info";
}

export function paymentCallbackStatusLabel(row) {
  if (!row) {
    return "-";
  }
  const status = String(row.status || "");
  if (row.verified === false) {
    return "验签失败";
  }
  if (status === "success") {
    return "已处理";
  }
  if (status === "processing") {
    return "处理中";
  }
  if (status === "pending") {
    return "待处理";
  }
  if (status === "ignored") {
    return "已忽略";
  }
  if (status === "failed") {
    return "处理失败";
  }
  return status || "-";
}

export function paymentCallbackChannelLabel(channel) {
  return {
    wechat: "微信",
    alipay: "支付宝",
    bank_card: "银行卡",
  }[String(channel || "")] || channel || "-";
}

export function settlementSnapshotStatusLabel(status) {
  return {
    pending_settlement: "待结算",
    settled: "已结算",
    reversed: "已冲销",
    missing: "未生成",
  }[String(status || "")] || status || "-";
}

export function maskCardNo(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "-";
  }
  if (raw.length <= 8) {
    return raw;
  }
  return `${raw.slice(0, 4)} **** **** ${raw.slice(-4)}`;
}

export function createPaymentCallbackFilterState(overrides = {}) {
  return {
    ...DEFAULT_PAYMENT_CALLBACK_FILTER,
    ...overrides,
    channel: normalizeText(overrides.channel),
    eventType: normalizeText(overrides.eventType),
    status: normalizeText(overrides.status),
    verified: normalizeText(overrides.verified),
    transactionId: normalizeText(overrides.transactionId),
    thirdPartyOrderId: normalizeText(overrides.thirdPartyOrderId),
  };
}

export function createWithdrawRequestFilterState(overrides = {}) {
  return {
    ...DEFAULT_WITHDRAW_REQUEST_FILTER,
    ...overrides,
    status: normalizeText(overrides.status),
    userType: normalizeText(overrides.userType),
    withdrawMethod: normalizeText(overrides.withdrawMethod),
  };
}

export function filterWithdrawRequests(records = [], filter = {}) {
  const normalizedFilter = createWithdrawRequestFilterState(filter);
  return asArray(records).filter((item) => {
    if (
      normalizedFilter.status
      && normalizeText(item?.status) !== normalizedFilter.status
    ) {
      return false;
    }
    if (
      normalizedFilter.userType
      && firstText(item?.user_type, item?.userType) !== normalizedFilter.userType
    ) {
      return false;
    }
    if (
      normalizedFilter.withdrawMethod
      && firstText(item?.withdraw_method, item?.withdrawMethod)
        !== normalizedFilter.withdrawMethod
    ) {
      return false;
    }
    return true;
  });
}

export function countAutoRetryWithdrawRequests(records = []) {
  return asArray(records).filter((item) => {
    const retry = getWithdrawAutoRetry(item);
    return normalizeText(item?.status) === "failed"
      && Boolean(retry?.eligible)
      && normalizeText(retry?.nextRetryAt) !== "";
  }).length;
}

export function collectBankWithdrawRequests(records = []) {
  return asArray(records).filter(
    (item) => firstText(item?.withdraw_method, item?.withdrawMethod) === "bank_card",
  );
}

export function collectPendingBankWithdrawRequests(records = []) {
  return collectBankWithdrawRequests(records).filter((item) =>
    [
      "pending",
      "pending_review",
      "pending_transfer",
      "transferring",
    ].includes(normalizeText(item?.status)),
  );
}

export function buildPaymentCallbackQuery(filter = {}) {
  const normalized = createPaymentCallbackFilterState(filter);
  const query = {
    page: 1,
    limit: 50,
  };

  if (normalized.channel) {
    query.channel = normalized.channel;
  }
  if (normalized.eventType) {
    query.eventType = normalized.eventType;
  }
  if (normalized.status) {
    query.status = normalized.status;
  }
  if (normalized.verified) {
    query.verified = normalized.verified;
  }
  if (normalized.transactionId) {
    query.transactionId = normalized.transactionId;
  }
  if (normalized.thirdPartyOrderId) {
    query.thirdPartyOrderId = normalized.thirdPartyOrderId;
  }

  return query;
}

export function getPaymentCallbackId(row = {}) {
  return firstText(row.callback_id, row.callbackId);
}

export function canReplayPaymentCallback(row = {}) {
  if (!row || row.verified !== true) {
    return false;
  }
  const channel = normalizeText(row.channel);
  return channel === "wechat" || channel === "alipay" || channel === "bank_card";
}

export function createPaymentCallbackReplayPayload(remark = "") {
  return {
    remark: normalizeText(remark),
  };
}

export function createWithdrawHistoryTargetState(overrides = {}) {
  return {
    ...DEFAULT_WITHDRAW_HISTORY_TARGET,
    ...overrides,
    requestId: normalizeText(overrides.requestId),
    method: normalizeText(overrides.method),
    userType: normalizeText(overrides.userType),
    amount: normalizeNumber(overrides.amount, 0),
  };
}

export function getWithdrawRequestId(row = {}) {
  return firstText(row.request_id, row.requestId);
}

export function getWithdrawTransactionId(row = {}) {
  return firstText(row.transaction_id, row.transactionId);
}

export function buildWithdrawHistoryTarget(row = {}) {
  return createWithdrawHistoryTargetState({
    requestId: getWithdrawRequestId(row),
    method: firstText(row.withdraw_method, row.withdrawMethod),
    userType: firstText(row.user_type, row.userType),
    amount: normalizeNumber(row.amount, 0),
  });
}

export function formatAdminWalletOperationActor(row = {}) {
  const name = firstText(row.admin_name, row.adminName);
  const id = firstText(row.admin_id, row.adminId);
  if (name && id) {
    return `${name} / ${id}`;
  }
  return name || id || "-";
}

export function createBankPayoutFormState(row = {}) {
  return {
    ...DEFAULT_BANK_PAYOUT_FORM,
    requestId: getWithdrawRequestId(row),
    payoutVoucherUrl: firstText(row.payout_voucher_url, row.payoutVoucherUrl),
    payoutReferenceNo: firstText(
      row.payout_reference_no,
      row.payoutReferenceNo,
      row.third_party_order_id,
      row.thirdPartyOrderId,
    ),
    payoutSourceBankName: firstText(
      row.payout_source_bank_name,
      row.payoutSourceBankName,
    ),
    payoutSourceBankBranch: firstText(
      row.payout_source_bank_branch,
      row.payoutSourceBankBranch,
    ),
    payoutSourceCardNo: firstText(
      row.payout_source_card_no,
      row.payoutSourceCardNo,
    ),
    payoutSourceAccountName: firstText(
      row.payout_source_account_name,
      row.payoutSourceAccountName,
    ),
    transferResult: firstText(row.transfer_result, row.transferResult)
      || (hasAnyKeys(asRecord(row)) ? "已人工完成银行卡打款" : ""),
  };
}

export function validateBankPayoutForm(form = {}) {
  const normalized = createBankPayoutFormState(form);
  if (!normalized.requestId) {
    return "缺少提现申请单号";
  }
  if (!normalized.payoutVoucherUrl) {
    return "请先上传打款凭证";
  }
  if (!normalized.payoutSourceBankName) {
    return "请填写出款银行名称";
  }
  if (!normalized.payoutSourceBankBranch) {
    return "请填写出款银行支行";
  }
  if (!normalized.payoutSourceCardNo) {
    return "请填写出款卡号";
  }
  if (!normalized.payoutSourceAccountName) {
    return "请填写出款账户名称";
  }
  return "";
}

export function buildBankPayoutCompletePayload(form = {}) {
  const normalized = createBankPayoutFormState(form);
  return {
    requestId: normalized.requestId,
    action: "complete",
    remark: normalized.transferResult,
    transferResult: normalized.transferResult,
    payoutVoucherUrl: normalized.payoutVoucherUrl,
    payoutReferenceNo: normalized.payoutReferenceNo,
    payoutSourceBankName: normalized.payoutSourceBankName,
    payoutSourceBankBranch: normalized.payoutSourceBankBranch,
    payoutSourceCardNo: normalized.payoutSourceCardNo,
    payoutSourceAccountName: normalized.payoutSourceAccountName,
    thirdPartyOrderId: normalized.payoutReferenceNo,
  };
}

export function isWithdrawGatewaySubmitted(row = {}) {
  if (row?.gateway_submitted === true || row?.gatewaySubmitted === true) {
    return true;
  }
  if (firstText(row.third_party_order_id, row.thirdPartyOrderId)) {
    return true;
  }
  const responseData = firstDefined(row.response_data, row.responseData);
  if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
    return false;
  }
  return [
    "gateway",
    "integrationTarget",
    "submittedAt",
    "sidecarUrl",
    "outBatchNo",
    "outDetailNo",
    "batchId",
    "processingMode",
    "notifyUrl",
  ].some((key) => normalizeText(responseData[key]));
}

export function canWithdrawAction(row = {}, action) {
  const status = normalizeText(row.status);
  const method = firstText(row.withdraw_method, row.withdrawMethod);
  if (action === "approve" || action === "reject") {
    return status === "pending" || status === "pending_review";
  }
  if (action === "sync_gateway_status") {
    if (method !== "wechat" && method !== "alipay" && method !== "bank_card") {
      return false;
    }
    if (status === "transferring") {
      return true;
    }
    if (status !== "pending_transfer") {
      return false;
    }
    return isWithdrawGatewaySubmitted(row);
  }
  if (action === "execute" || action === "mark_processing") {
    return status === "pending_transfer";
  }
  if (action === "complete" || action === "fail") {
    return status === "pending_transfer" || status === "transferring";
  }
  if (action === "retry_payout") {
    return status === "failed";
  }
  if (action === "supplement_success" || action === "supplement_fail") {
    return (status === "pending_transfer" || status === "transferring")
      && (method === "wechat" || method === "alipay" || method === "bank_card");
  }
  return false;
}

export function getWithdrawReviewActionTitle(action) {
  return {
    approve: "通过提现审核",
    reject: "驳回提现申请",
    execute: "发起打款",
    mark_processing: "标记为转账中",
    complete: "标记为打款成功",
    fail: "标记为打款失败",
    sync_gateway_status: "同步网关状态",
    retry_payout: "重试打款",
    supplement_success: "补记打款成功",
    supplement_fail: "补记打款失败",
  }[normalizeText(action)] || normalizeText(action, "处理提现");
}

export function buildWithdrawReviewPayload(requestId, action, options = {}) {
  const payload = {
    requestId: normalizeText(requestId),
    action: normalizeText(action),
  };
  const remark = normalizeText(options.remark);
  const transferResult = normalizeText(
    firstDefined(options.transferResult, options.remark),
  );
  const thirdPartyOrderId = normalizeText(options.thirdPartyOrderId);

  if (remark || options.remark !== undefined) {
    payload.remark = remark;
  }
  if (action === "reject") {
    payload.rejectReason = remark;
  }
  if (
    transferResult
    || action === "reject"
    || action === "fail"
    || action === "retry_payout"
    || action === "supplement_success"
    || action === "supplement_fail"
  ) {
    payload.transferResult = transferResult;
  }
  if (thirdPartyOrderId) {
    payload.thirdPartyOrderId = thirdPartyOrderId;
  }
  return payload;
}
