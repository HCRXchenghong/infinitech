export const DEFAULT_CONSUMER_PROFILE_STORAGE_KEY = "userProfile";

function normalizeConsumerProfileStorageObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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
