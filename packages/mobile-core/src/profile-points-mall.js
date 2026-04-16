import {
  extractEnvelopeData,
  extractErrorMessage,
} from "../../contracts/src/http.js";
import {
  DEFAULT_VIP_CENTER_SETTINGS,
  mapVIPPointRewardList,
  normalizeVIPCenterSettings,
} from "./vip-center.js";

function trimProfilePointsMallText(value) {
  return String(value || "").trim();
}

function normalizeProfilePointsMallNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export function createDefaultConsumerPointsMallVipConfig() {
  return normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS);
}

export function resolveConsumerPointsMallUserId(profile = {}) {
  return trimProfilePointsMallText(profile.id || profile.userId || profile.phone);
}

export function resolveConsumerPointsMallStoredBalance(value) {
  return Math.max(0, normalizeProfilePointsMallNumber(value, 0));
}

export function normalizeConsumerPointsMallVipSettings(payload) {
  const data = extractEnvelopeData(payload);
  return normalizeVIPCenterSettings(data || {});
}

export function normalizeConsumerPointsMallGoods(payload) {
  const data = extractEnvelopeData(payload);
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.list)
      ? data.list
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data?.goods)
            ? data.goods
            : [];

  return mapVIPPointRewardList(source);
}

export function normalizeConsumerPointsMallBalance(payload, fallback = 0) {
  const data = extractEnvelopeData(payload);
  const candidates = [
    data?.balance,
    data?.points,
    payload?.balance,
    payload?.points,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return Math.max(0, normalizeProfilePointsMallNumber(fallback, 0));
}

export function canConsumerPointsMallRedeem(points, item = {}) {
  return (
    normalizeProfilePointsMallNumber(points, 0) >=
    normalizeProfilePointsMallNumber(item?.points, 0)
  );
}

export function buildConsumerPointsMallRedeemPayload({
  profile = {},
  item = {},
} = {}) {
  return {
    userId: resolveConsumerPointsMallUserId(profile),
    phone: trimProfilePointsMallText(profile.phone),
    goodId: item?.id ?? item?.goodId ?? "",
  };
}

export function buildConsumerPointsMallRedeemConfirmation(item = {}) {
  const points = Math.max(0, normalizeProfilePointsMallNumber(item?.points, 0));
  const name = trimProfilePointsMallText(item?.name) || "当前商品";
  return `确认使用 ${points} 积分兑换「${name}」吗？`;
}

export function normalizeConsumerPointsMallRedeemResult(
  payload,
  currentBalance = 0,
) {
  const data = extractEnvelopeData(payload);
  const success = Boolean(data?.success ?? payload?.success);
  return {
    success,
    balance: success
      ? normalizeConsumerPointsMallBalance(data, currentBalance)
      : normalizeConsumerPointsMallBalance(currentBalance, 0),
    errorMessage: extractErrorMessage(data || payload, "兑换失败"),
  };
}

export function normalizeConsumerPointsMallErrorMessage(
  error,
  fallback = "兑换失败",
) {
  return extractErrorMessage(error, fallback);
}
