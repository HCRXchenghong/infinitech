import { extractAuthSessionResult } from "../../contracts/src/http.js";
import { buildConsumerAuthUserProfile } from "./auth-portal.js";
import { replaceConsumerStoredProfile } from "./consumer-profile-storage.js";

function normalizePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function persistConsumerAuthSessionResult(options = {}) {
  const {
    result = {},
    fallbackPhone = "",
    profile = undefined,
    saveTokenInfo = () => {},
    uniApp = {},
    persistAuthMode = true,
    persistWelcomeFlag = true,
  } = options;

  const session = extractAuthSessionResult(result);
  if (!session.authenticated) {
    return {
      persisted: false,
      session,
      profile: normalizePlainObject(profile),
    };
  }

  const explicitProfile = normalizePlainObject(profile);
  const nextProfile =
    Object.keys(explicitProfile).length > 0
      ? explicitProfile
      : buildConsumerAuthUserProfile(session.user, fallbackPhone);

  saveTokenInfo(session.token, session.refreshToken, session.expiresIn || 7200);
  replaceConsumerStoredProfile({
    profile: nextProfile,
    uniApp,
  });
  if (persistAuthMode) {
    uniApp.setStorageSync?.("authMode", "user");
  }
  if (persistWelcomeFlag) {
    uniApp.setStorageSync?.("hasSeenWelcome", true);
  }

  return {
    persisted: true,
    session,
    profile: nextProfile,
  };
}
