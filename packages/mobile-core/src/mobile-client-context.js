function trimValue(value) {
  return String(value || "").trim();
}

function readBuildPlatform() {
  if (typeof process === "undefined" || !process?.env?.UNI_PLATFORM) {
    return "";
  }
  return String(process.env.UNI_PLATFORM).trim();
}

function readRuntimePlatform() {
  if (
    typeof globalThis.uni === "undefined" ||
    typeof globalThis.uni.getSystemInfoSync !== "function"
  ) {
    return "";
  }
  try {
    const systemInfo = globalThis.uni.getSystemInfoSync() || {};
    return String(systemInfo.uniPlatform || systemInfo.platform || "").trim();
  } catch (_error) {
    return "";
  }
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

export function getMobileRuntimePlatform(fallbackPlatform = "app") {
  return normalizeMobileRuntimePlatform(
    readRuntimePlatform() || readBuildPlatform(),
    fallbackPlatform,
  );
}

export function getMobileClientId(fallbackPlatform = "app") {
  return resolveMobileClientId(
    getMobileRuntimePlatform(fallbackPlatform),
    fallbackPlatform,
  );
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

export function getWalletRechargeRuntimeProfile(options = {}) {
  const fallbackPlatform = options.fallbackPlatform || "app";
  return buildWalletRechargeRuntimeProfile({
    userType: options.userType || "customer",
    rawPlatform:
      options.rawPlatform || getMobileRuntimePlatform(fallbackPlatform),
    fallbackPlatform,
  });
}

export function getWalletWithdrawRuntimeProfile(options = {}) {
  const fallbackPlatform = options.fallbackPlatform || "app";
  return buildWalletWithdrawRuntimeProfile({
    userType: options.userType || "customer",
    rawPlatform:
      options.rawPlatform || getMobileRuntimePlatform(fallbackPlatform),
    fallbackPlatform,
  });
}
