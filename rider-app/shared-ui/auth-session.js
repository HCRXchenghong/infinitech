import {
  clearRoleAuthSession,
  ensureRoleAuthSession,
  persistRoleAuthSession,
  readRoleAuthSessionSnapshot,
} from "../../packages/client-sdk/src/role-auth-session.js";

const DEFAULT_RIDER_ROLE = "rider";
const DEFAULT_RIDER_PROFILE_STORAGE_KEY = "riderProfile";
const DEFAULT_RIDER_NAME = "骑手";
const DEFAULT_RIDER_CLEAR_STORAGE_KEYS = Object.freeze([
  "access_token",
  "riderId",
  "riderName",
  "riderPhone",
]);

export const RIDER_AUTH_SESSION_OPTIONS = Object.freeze({
  role: DEFAULT_RIDER_ROLE,
  profileStorageKey: DEFAULT_RIDER_PROFILE_STORAGE_KEY,
  tokenStorageKeys: ["token", "access_token"],
  allowLegacyAuthModeFallback: true,
  idSources: [
    "storage:riderId",
    "profile:id",
    "profile:userId",
    "profile:user_id",
    "profile:riderId",
  ],
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

export function readRiderAuthSession(options = {}) {
  return readRoleAuthSessionSnapshot({
    uniApp: getUniApp(options.uniApp),
    ...RIDER_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function ensureRiderAuthSession(options = {}) {
  return ensureRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    ...RIDER_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function persistRiderAuthSession(options = {}) {
  return persistRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    ...RIDER_AUTH_SESSION_OPTIONS,
    ...options,
  });
}

export function clearRiderAuthSession(options = {}) {
  return clearRoleAuthSession({
    uniApp: getUniApp(options.uniApp),
    profileStorageKey: DEFAULT_RIDER_PROFILE_STORAGE_KEY,
    ...options,
    extraStorageKeys: uniqueKeys([
      ...DEFAULT_RIDER_CLEAR_STORAGE_KEYS,
      ...(Array.isArray(options.extraStorageKeys) ? options.extraStorageKeys : []),
    ]),
  });
}

export function readRiderAuthIdentity(options = {}) {
  const uniApp = getUniApp(options.uniApp);
  const session = readRiderAuthSession({
    uniApp,
    ...options,
  });
  const profile =
    session.profile && typeof session.profile === "object" && !Array.isArray(session.profile)
      ? session.profile
      : {};
  const riderId = pickFirstText([
    session.accountId,
    profile.id,
    profile.userId,
    profile.user_id,
    profile.riderId,
    readStorage(uniApp, "riderId"),
  ]);
  const riderName = pickFirstText([
    profile.name,
    profile.realName,
    profile.nickname,
    readStorage(uniApp, "riderName"),
  ], DEFAULT_RIDER_NAME);
  const riderPhone = pickFirstText([
    profile.phone,
    readStorage(uniApp, "riderPhone"),
  ]);

  return {
    ...session,
    riderId,
    userId: riderId,
    riderName,
    riderPhone,
  };
}
