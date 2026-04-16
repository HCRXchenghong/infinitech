import {
  buildWalletRechargeRuntimeProfile,
  buildWalletWithdrawRuntimeProfile,
  normalizeMobileRuntimePlatform,
  resolveMobileClientId,
} from "../../packages/mobile-core/src/mobile-client-context.js";

function readBuildPlatform() {
  if (typeof process === "undefined" || !process?.env?.UNI_PLATFORM) {
    return "";
  }
  return String(process.env.UNI_PLATFORM).trim();
}

function readRuntimePlatform() {
  if (typeof uni === "undefined" || typeof uni.getSystemInfoSync !== "function") {
    return "";
  }
  try {
    const systemInfo = uni.getSystemInfoSync() || {};
    return String(systemInfo.uniPlatform || systemInfo.platform || "").trim();
  } catch (_error) {
    return "";
  }
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
