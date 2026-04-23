import {
  createWalletIdempotencyKey,
  fenToWalletYuan,
  formatWalletDateTime,
  isWalletFailureStatus,
  isWalletRechargeSuccessStatus,
  isWalletWithdrawSuccessStatus,
  normalizeWalletArrivalText,
  normalizeWalletFlowStatus,
  normalizeWalletText,
  normalizeWalletWithdrawFailureReason,
  resolveWalletField,
  walletFlowStatusLabel,
} from "./wallet-shared.js";

export const DEFAULT_MERCHANT_WALLET_TYPE_FILTERS = Object.freeze([
  Object.freeze({ label: "全部", value: "" }),
  Object.freeze({ label: "订单收入", value: "payment" }),
  Object.freeze({ label: "退款扣减", value: "refund" }),
  Object.freeze({ label: "提现", value: "withdraw" }),
  Object.freeze({ label: "充值", value: "recharge" }),
]);

const MERCHANT_WALLET_TYPE_LABELS = Object.freeze({
  payment: "订单收入",
  refund: "退款扣减",
  recharge: "余额充值",
  withdraw: "提现申请",
  compensation: "赔付",
  admin_add_balance: "系统加款",
  admin_deduct_balance: "系统扣款",
});

function normalizeMerchantWalletPlatform(platform) {
  return normalizeWalletText(platform) || "app";
}

function buildMerchantIdempotencyKey(prefix, userId, options = {}) {
  return createWalletIdempotencyKey(prefix, normalizeWalletText(userId), options);
}

async function pollMerchantWalletFlow(options = {}) {
  const {
    loadStatus,
    query,
    flowKey,
    successChecker,
    attempts = 1,
    sleepFn,
  } = options;
  if (typeof loadStatus !== "function") {
    throw new TypeError("merchant wallet requires a status loader");
  }

  let latest = null;
  const totalAttempts = Number(attempts || 0);
  const waitFor = typeof sleepFn === "function" ? sleepFn : async () => {};
  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    latest = await loadStatus(query);
    const status = normalizeWalletFlowStatus(latest, flowKey);
    if (successChecker(status) || isWalletFailureStatus(status)) {
      return latest;
    }
    await waitFor(1500);
  }
  return latest;
}

export function createMerchantWalletTypeFilters() {
  return DEFAULT_MERCHANT_WALLET_TYPE_FILTERS.map((item) => ({ ...item }));
}

export function formatMerchantWalletFen(value) {
  return fenToWalletYuan(value);
}

export function formatMerchantWalletAmountText(tx) {
  const amount = Number(tx && tx.amount ? tx.amount : 0);
  const abs = formatMerchantWalletFen(amount);
  if (amount > 0) {
    return `+¥${abs}`;
  }
  if (amount < 0) {
    return `-¥${abs}`;
  }
  return `¥${abs}`;
}

export function resolveMerchantWalletAmountClass(tx) {
  const amount = Number(tx && tx.amount ? tx.amount : 0);
  if (amount > 0) {
    return "income";
  }
  if (amount < 0) {
    return "expense";
  }
  return "flat";
}

export function getMerchantWalletTransactionTypeText(type) {
  const normalized = normalizeWalletText(type);
  return MERCHANT_WALLET_TYPE_LABELS[normalized] || normalized || "交易";
}

export function getMerchantWalletTransactionStatusText(status) {
  const normalized = normalizeWalletText(status).toLowerCase();
  if (normalized === "transferring") {
    return "转账中";
  }
  return walletFlowStatusLabel(normalized, normalizeWalletText(status) || "--");
}

export function formatMerchantWalletTime(value) {
  if (!value) {
    return "--";
  }
  return formatWalletDateTime(value, "") || String(value);
}

export function parseMerchantWalletAmountToFen(value) {
  const amountFen = Math.round(Number(value || 0) * 100);
  return Number.isFinite(amountFen) ? amountFen : 0;
}

export function buildMerchantWalletTransactionQuery(options = {}) {
  return {
    userId: normalizeWalletText(options.userId),
    userType: "merchant",
    limit: Number(options.limit || 100),
    page: Number(options.page || 1),
  };
}

export function buildMerchantWalletRechargeOptionsQuery(options = {}) {
  return {
    userType: "merchant",
    platform: normalizeMerchantWalletPlatform(options.platform),
    scene: normalizeWalletText(options.scene) || "wallet_recharge",
  };
}

export function buildMerchantWalletWithdrawOptionsQuery(options = {}) {
  return {
    userType: "merchant",
    platform: normalizeMerchantWalletPlatform(options.platform),
  };
}

export function buildMerchantRechargePayload(options = {}) {
  const userId = normalizeWalletText(options.userId);
  const channel = normalizeWalletText(options.channel);
  return {
    userId,
    userType: "merchant",
    amount: Number(options.amountFen || 0),
    platform: normalizeMerchantWalletPlatform(options.platform),
    paymentMethod: channel,
    paymentChannel: channel,
    idempotencyKey: buildMerchantIdempotencyKey(
      normalizeWalletText(options.idempotencyKeyPrefix) || "merchant_recharge",
      userId,
      {
        nowFn: options.nowFn,
        randomFn: options.randomFn,
      },
    ),
    description:
      normalizeWalletText(options.description) || "商户端余额充值",
  };
}

export function buildMerchantWithdrawPreviewPayload(options = {}) {
  return {
    userId: normalizeWalletText(options.userId),
    userType: "merchant",
    amount: Number(options.amountFen || 0),
    withdrawMethod: normalizeWalletText(options.channel),
    platform: normalizeMerchantWalletPlatform(options.platform),
  };
}

export function buildMerchantWithdrawPayload(options = {}) {
  const userId = normalizeWalletText(options.userId);
  return {
    userId,
    userType: "merchant",
    amount: Number(options.amountFen || 0),
    platform: normalizeMerchantWalletPlatform(options.platform),
    withdrawMethod: normalizeWalletText(options.channel),
    withdrawAccount: normalizeWalletText(options.withdrawAccount),
    withdrawName: normalizeWalletText(options.withdrawName) || "商户",
    bankName: normalizeWalletText(options.bankName),
    bankBranch: normalizeWalletText(options.bankBranch),
    remark: normalizeWalletText(options.remark) || "商户端提现申请",
    idempotencyKey: buildMerchantIdempotencyKey(
      normalizeWalletText(options.idempotencyKeyPrefix) || "merchant_withdraw",
      userId,
      {
        nowFn: options.nowFn,
        randomFn: options.randomFn,
      },
    ),
  };
}

export function buildMerchantRechargeStatusQuery(options = {}) {
  return {
    userId: normalizeWalletText(options.userId),
    userType: "merchant",
    rechargeOrderId: normalizeWalletText(options.rechargeOrderId),
    transactionId: normalizeWalletText(options.transactionId),
  };
}

export function buildMerchantWithdrawStatusQuery(options = {}) {
  return {
    userId: normalizeWalletText(options.userId),
    userType: "merchant",
    requestId: normalizeWalletText(options.withdrawRequestId),
    transactionId: normalizeWalletText(options.transactionId),
  };
}

export async function pollMerchantRechargeStatus(options = {}) {
  return pollMerchantWalletFlow({
    loadStatus: options.loadStatus,
    query: buildMerchantRechargeStatusQuery({
      userId: options.userId,
      rechargeOrderId: options.rechargeOrderId,
      transactionId: options.transactionId,
    }),
    flowKey: "recharge",
    successChecker: isWalletRechargeSuccessStatus,
    attempts: options.attempts || 8,
    sleepFn: options.sleepFn,
  });
}

export async function pollMerchantWithdrawStatus(options = {}) {
  return pollMerchantWalletFlow({
    loadStatus: options.loadStatus,
    query: buildMerchantWithdrawStatusQuery({
      userId: options.userId,
      withdrawRequestId: options.withdrawRequestId,
      transactionId: options.transactionId,
    }),
    flowKey: "withdraw",
    successChecker: isWalletWithdrawSuccessStatus,
    attempts: options.attempts || 5,
    sleepFn: options.sleepFn,
  });
}

export function buildMerchantWithdrawConfirmText(preview, channel) {
  const notice = normalizeWalletText(channel && channel.reviewNotice);
  const feeText = formatMerchantWalletFen(resolveWalletField(preview, "fee", 0));
  const actualText = formatMerchantWalletFen(
    resolveWalletField(preview, "actualAmount", 0),
  );
  const arrivalText =
    normalizeWalletArrivalText(preview) ||
    normalizeWalletText(resolveWalletField(preview, "arrivalText", "")) ||
    "以通道处理为准";
  return `${notice ? `${notice}\n` : ""}手续费 ¥${feeText}，预计到账 ¥${actualText}，到账时效：${arrivalText}`;
}

export function resolveMerchantWithdrawFailureReason(
  payload,
  fallback = "可重新申请或联系平台处理",
) {
  return normalizeWalletWithdrawFailureReason(payload, "withdraw") || fallback;
}
