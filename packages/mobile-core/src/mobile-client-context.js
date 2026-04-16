function trimValue(value) {
  return String(value || "").trim();
}

export function normalizeMobileRuntimePlatform(
  rawPlatform,
  fallbackPlatform = "app",
) {
  const fallback = trimValue(fallbackPlatform) || "app";
  const value = trimValue(rawPlatform).toLowerCase();
  if (!value) {
    return fallback;
  }
  if (
    value === "mini_program" ||
    value.includes("mp-") ||
    value.includes("mini") ||
    value.includes("weixin") ||
    value === "wx"
  ) {
    return "mini_program";
  }
  if (value === "app" || value.includes("app")) {
    return "app";
  }
  return fallback;
}

export function resolveMobileClientId(
  rawPlatform,
  fallbackPlatform = "app",
) {
  return normalizeMobileRuntimePlatform(rawPlatform, fallbackPlatform) === "app"
    ? "app-mobile"
    : "user-vue";
}

export function buildWalletRechargeRuntimeProfile({
  userType = "customer",
  rawPlatform,
  fallbackPlatform = "app",
} = {}) {
  const platform = normalizeMobileRuntimePlatform(rawPlatform, fallbackPlatform);
  return {
    platform,
    clientId: resolveMobileClientId(platform, fallbackPlatform),
    clientPaymentPlatform: platform,
    idempotencyKeyPrefix: `${userType}_${platform}_recharge`,
    rechargeDescription:
      platform === "app" ? "用户 App 余额充值" : "用户端余额充值",
  };
}

export function buildWalletWithdrawRuntimeProfile({
  userType = "customer",
  rawPlatform,
  fallbackPlatform = "app",
} = {}) {
  const platform = normalizeMobileRuntimePlatform(rawPlatform, fallbackPlatform);
  return {
    platform,
    clientId: resolveMobileClientId(platform, fallbackPlatform),
    idempotencyKeyPrefix: `${userType}_${platform}_withdraw`,
  };
}
