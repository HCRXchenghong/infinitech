import {
  clearRoleAuthSession,
  ensureRoleAuthSession,
  persistRoleAuthSession,
  readRoleAuthSessionSnapshot,
} from "../../packages/client-sdk/src/role-auth-session.js";

const DEFAULT_MERCHANT_ROLE = "merchant";
const DEFAULT_MERCHANT_PROFILE_STORAGE_KEY = "merchantProfile";
const DEFAULT_MERCHANT_NAME = "商户";
const DEFAULT_MERCHANT_CLEAR_STORAGE_KEYS = Object.freeze([
  "access_token",
  "merchantId",
  "merchantName",
  "merchantCurrentShopId",
]);

export const MERCHANT_AUTH_SESSION_OPTIONS = Object.freeze({
  role: DEFAULT_MERCHANT_ROLE,
  profileStorageKey: DEFAULT_MERCHANT_PROFILE_STORAGE_KEY,
  tokenStorageKeys: ["token", "access_token"],
  allowLegacyAuthModeFallback: true,
  idSources: ["profile:id", "profile:role_id", "profile:userId", "profile:user_id"],
});

export const MERCHANT_STORED_AUTH_RESOLVER_OPTIONS = Object.freeze({
  allowedAuthModes: [DEFAULT_MERCHANT_ROLE],
  tokenKeys: [...MERCHANT_AUTH_SESSION_OPTIONS.tokenStorageKeys],
  profileKey: DEFAULT_MERCHANT_PROFILE_STORAGE_KEY,
  idSources: [...MERCHANT_AUTH_SESSION_OPTIONS.idSources],
  role: DEFAULT_MERCHANT_ROLE,
  userType: DEFAULT_MERCHANT_ROLE,
});

function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function getUniApp(uniApp) {
  return uniApp || globalThis.uni;
}

function readStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function pickFirstText(values, fallback = "") {
  for (const value of values) {
    const normalized = trimValue(value);
    if (normalized) {
      return normalized;
    }
  }
  return trimValue(fallback);
}

function uniqueKeys(keys) {
  const deduped = [];
  const seen = new Set();
  for (const key of keys) {
    const normalizedKey = trimValue(key);
    if (!normalizedKey || seen.has(normalizedKey)) {
      continue;
    }
    seen.add(normalizedKey);
    deduped.push(normalizedKey);
  }
  return deduped;
}

export function readMerchantAuthSession(options = {}) {
  return readRoleAuthSessionSnapshot({
    uniApp: getUniApp(options.uniApp),
    ...MERCHANT_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function ensureMerchantAuthSession(options = {}) {
  return ensureRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    ...MERCHANT_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function persistMerchantAuthSession(options = {}) {
  return persistRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    ...MERCHANT_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function clearMerchantAuthSession(options = {}) {
  return clearRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    profileStorageKey: DEFAULT_MERCHANT_PROFILE_STORAGE_KEY,
    ...options,
    extraStorageKeys: uniqueKeys([
      ...DEFAULT_MERCHANT_CLEAR_STORAGE_KEYS,
      ...(Array.isArray(options.extraStorageKeys) ? options.extraStorageKeys : []),
    ]),
  });
}

export function readMerchantAuthIdentity(options = {}) {
  const uniApp = getUniApp(options.uniApp);
  const session = readMerchantAuthSession({
    uniApp,
    ...options,
  });
  const profile =
    session.profile && typeof session.profile === "object" && !Array.isArray(session.profile)
      ? session.profile
      : {};
  const merchantPhone = pickFirstText([
    profile.phone,
    readStorage(uniApp, "merchantPhone"),
  ]);
  const merchantId = pickFirstText([
    session.accountId,
    profile.id,
    profile.role_id,
    profile.userId,
    profile.user_id,
    readStorage(uniApp, "merchantId"),
  ]);
  const merchantName = pickFirstText([
    profile.name,
    profile.nickname,
    profile.shopName,
    readStorage(uniApp, "merchantName"),
  ], DEFAULT_MERCHANT_NAME);

  return {
    ...session,
    merchantId,
    merchantPhone,
    merchantName,
    userId: merchantId || merchantPhone,
  };
}
