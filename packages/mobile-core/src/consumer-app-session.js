import { extractAuthVerifyResult } from "../../contracts/src/http.js";

function resolveLogger(options = {}) {
  const logger = options.logger;

  if (logger && typeof logger.error === "function") {
    return logger;
  }

  const loggerTag = String(options.loggerTag || "App").trim();
  return {
    error(...args) {
      console.error(`[${loggerTag}]`, ...args);
    },
  };
}

function requestWithPromise(requestFn, options) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const maybePromise = requestFn({
      ...options,
      success: (response) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
      fail: (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      },
    });

    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(
        (response) => {
          if (settled) return;
          settled = true;
          resolve(response);
        },
        (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    }
  });
}

export function createConsumerAppSessionManager(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const logger = resolveLogger(options);
  const tokenStorageKey = options.tokenStorageKey || "token";
  const refreshTokenStorageKey =
    options.refreshTokenStorageKey || "refreshToken";
  const tokenExpiresAtStorageKey =
    options.tokenExpiresAtStorageKey || "tokenExpiresAt";
  const profileStorageKey = options.profileStorageKey || "userProfile";
  const authModeStorageKey = options.authModeStorageKey || "authMode";
  const requiredAuthMode = options.requiredAuthMode || "user";
  const baseUrl = String(options.baseUrl || "").trim();
  const manualRefreshToken =
    typeof options.manualRefreshToken === "function"
      ? options.manualRefreshToken
      : async () => true;
  const forceLogout =
    typeof options.forceLogout === "function" ? options.forceLogout : () => {};
  const requestFn =
    typeof options.request === "function"
      ? options.request
      : uniApp && typeof uniApp.request === "function"
        ? uniApp.request.bind(uniApp)
        : null;

  function getSessionSnapshot() {
    return {
      token: String(uniApp?.getStorageSync?.(tokenStorageKey) || "").trim(),
      refreshToken: String(
        uniApp?.getStorageSync?.(refreshTokenStorageKey) || "",
      ).trim(),
      authMode: String(
        uniApp?.getStorageSync?.(authModeStorageKey) || "",
      ).trim(),
    };
  }

  function hasActiveSession(snapshot = getSessionSnapshot()) {
    return Boolean(
      snapshot.token &&
      snapshot.refreshToken &&
      snapshot.authMode === requiredAuthMode,
    );
  }

  function clearStoredSession() {
    uniApp?.removeStorageSync?.(tokenStorageKey);
    uniApp?.removeStorageSync?.(refreshTokenStorageKey);
    uniApp?.removeStorageSync?.(tokenExpiresAtStorageKey);
    uniApp?.removeStorageSync?.(profileStorageKey);
    uniApp?.removeStorageSync?.(authModeStorageKey);
  }

  async function verifySession() {
    const snapshot = getSessionSnapshot();
    if (!hasActiveSession(snapshot)) {
      clearStoredSession();
      return false;
    }

    const refreshed = await manualRefreshToken();
    if (!refreshed) {
      forceLogout();
      return false;
    }

    if (!requestFn) {
      return true;
    }

    try {
      const currentToken = String(
        uniApp?.getStorageSync?.(tokenStorageKey) || "",
      ).trim();
      const response = await requestWithPromise(requestFn, {
        url: `${baseUrl}/api/auth/verify`,
        method: "POST",
        header: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const verification = extractAuthVerifyResult(
        response && response.data ? response.data : null,
      );
      if (response.statusCode !== 200 || !verification.valid) {
        forceLogout();
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Token verify request failed:", error);
      return true;
    }
  }

  return {
    getSessionSnapshot,
    hasActiveSession,
    clearStoredSession,
    verifySession,
  };
}
