export const DEFAULT_CONSUMER_PROFILE_STORAGE_KEY = "userProfile";
export const DEFAULT_CONSUMER_AUTH_MODE_STORAGE_KEY = "authMode";

function normalizeConsumerProfileStorageObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function trimConsumerProfileStorageText(value) {
  return String(value || "").trim();
}

export function readConsumerStoredProfile(options = {}) {
  const {
    uniApp = {},
    storageKey = DEFAULT_CONSUMER_PROFILE_STORAGE_KEY,
  } = options;
  return normalizeConsumerProfileStorageObject(
    uniApp.getStorageSync?.(storageKey),
  );
}

export function replaceConsumerStoredProfile(options = {}) {
  const {
    profile = {},
    uniApp = {},
    storageKey = DEFAULT_CONSUMER_PROFILE_STORAGE_KEY,
  } = options;
  const nextProfile = normalizeConsumerProfileStorageObject(profile);
  uniApp.setStorageSync?.(storageKey, nextProfile);
  return nextProfile;
}

export function readConsumerStoredAuthMode(options = {}) {
  const {
    uniApp = {},
    storageKey = DEFAULT_CONSUMER_AUTH_MODE_STORAGE_KEY,
  } = options;
  return trimConsumerProfileStorageText(uniApp.getStorageSync?.(storageKey));
}

export function hasConsumerStoredAuthMode(options = {}) {
  const expectedAuthMode = trimConsumerProfileStorageText(
    options.expectedAuthMode || "user",
  );
  if (!expectedAuthMode) {
    return false;
  }
  return readConsumerStoredAuthMode(options) === expectedAuthMode;
}

export function resolveConsumerStoredProfileUserId(options = {}) {
  const profile =
    Object.prototype.hasOwnProperty.call(options, "profile")
      ? normalizeConsumerProfileStorageObject(options.profile)
      : readConsumerStoredProfile(options);
  const identityKeys = Array.isArray(options.identityKeys)
    ? options.identityKeys
    : ["id", "userId", "phone"];

  for (const key of identityKeys) {
    const resolved = trimConsumerProfileStorageText(profile[key]);
    if (resolved) {
      return resolved;
    }
  }

  return "";
}

export function mergeConsumerStoredProfilePatch(options = {}) {
  const {
    patch = {},
    uniApp = {},
    storageKey = DEFAULT_CONSUMER_PROFILE_STORAGE_KEY,
  } = options;
  const nextProfile = {
    ...readConsumerStoredProfile({ uniApp, storageKey }),
    ...normalizeConsumerProfileStorageObject(patch),
  };
  uniApp.setStorageSync?.(storageKey, nextProfile);
  return nextProfile;
}
