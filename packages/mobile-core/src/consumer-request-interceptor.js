import { extractAuthSessionResult } from "../../contracts/src/http.js";

function resolveLogger(logger) {
  if (logger && typeof logger === "object") {
    return {
      error:
        typeof logger.error === "function"
          ? (...args) => logger.error(...args)
          : (...args) => console.error(...args),
    };
  }

  return {
    error: (...args) => console.error(...args),
  };
}

function requestWithPromise(requestFn, options) {
  return new Promise((resolve, reject) => {
    requestFn({
      ...options,
      success: (response) => resolve(response),
      fail: (error) => reject(error),
    });
  });
}

export function createConsumerRequestInterceptor(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const logger = resolveLogger(options.logger);
  const rawRequest = uniApp.request.bind(uniApp);
  const accessTokenStorageKey = options.accessTokenStorageKey || "token";
  const refreshTokenStorageKey =
    options.refreshTokenStorageKey || "refreshToken";
  const tokenExpiresAtStorageKey =
    options.tokenExpiresAtStorageKey || "tokenExpiresAt";
  const profileStorageKey = options.profileStorageKey || "userProfile";
  const authModeStorageKey = options.authModeStorageKey || "authMode";
  const pushRegistrationStorageKey = options.pushRegistrationStorageKey || "";
  const logoutRedirectUrl =
    options.logoutRedirectUrl || "/pages/welcome/welcome/index";
  const baseUrl = String(options.baseUrl || "").trim();
  const clearLocalCache =
    typeof options.clearLocalCache === "function"
      ? options.clearLocalCache
      : () => {};

  let isRefreshing = false;
  let refreshSubscribers = [];

  function getTokenInfo() {
    const accessToken = uniApp.getStorageSync(accessTokenStorageKey);
    const refreshToken = uniApp.getStorageSync(refreshTokenStorageKey);
    const expiresAt = uniApp.getStorageSync(tokenExpiresAtStorageKey);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt || 0,
    };
  }

  function saveTokenInfo(token, refreshToken, expiresIn) {
    const expiresAt = Date.now() + Number(expiresIn || 0) * 1000;
    uniApp.setStorageSync(accessTokenStorageKey, token);
    uniApp.setStorageSync(refreshTokenStorageKey, refreshToken);
    uniApp.setStorageSync(tokenExpiresAtStorageKey, expiresAt);
  }

  function isTokenExpiringSoon(expiresAt) {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return Number(expiresAt || 0) - now < fiveMinutes;
  }

  async function refreshAccessToken() {
    const tokenInfo = getTokenInfo();
    if (!tokenInfo || !tokenInfo.refreshToken) {
      return null;
    }

    try {
      const response = await requestWithPromise(rawRequest, {
        url: `${baseUrl}/api/auth/refresh`,
        method: "POST",
        data: {
          refreshToken: tokenInfo.refreshToken,
        },
      });

      const result = extractAuthSessionResult(response.data || {});
      if (response.statusCode === 200 && result.authenticated) {
        saveTokenInfo(
          result.token,
          result.refreshToken || tokenInfo.refreshToken,
          result.expiresIn || 7200,
        );
        return result.token;
      }

      logger.error("❌ Token 刷新失败:", result.error || result.message);
      return null;
    } catch (error) {
      logger.error("❌ Token 刷新请求失败:", error);
      return null;
    }
  }

  function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback);
  }

  function onTokenRefreshed(token) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
  }

  function forceLogout() {
    uniApp.removeStorageSync(accessTokenStorageKey);
    uniApp.removeStorageSync(refreshTokenStorageKey);
    uniApp.removeStorageSync(tokenExpiresAtStorageKey);
    uniApp.removeStorageSync(profileStorageKey);
    uniApp.removeStorageSync(authModeStorageKey);
    if (pushRegistrationStorageKey) {
      uniApp.removeStorageSync(pushRegistrationStorageKey);
    }

    try {
      clearLocalCache();
    } catch (error) {
      logger.error("清除数据库失败:", error);
    }

    uniApp.reLaunch({
      url: logoutRedirectUrl,
    });
  }

  function setupRequestInterceptor() {
    const originalRequest = uniApp.request.bind(uniApp);

    const waitForTokenRefresh = () =>
      new Promise((resolve) => {
        subscribeTokenRefresh(resolve);
      });

    const withAuthHeader = (requestOptions, token) => ({
      ...requestOptions,
      header: {
        ...(requestOptions.header || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const requestOnce = (requestOptions) =>
      requestWithPromise(originalRequest, requestOptions);

    const normalizeCompleteResult = (response, fallbackMsg) => {
      if (response && typeof response === "object") {
        const record = response;
        const errMsg =
          typeof record.errMsg === "string" ? record.errMsg : fallbackMsg;
        return { errMsg, ...record };
      }
      return { errMsg: fallbackMsg };
    };

    const normalizeFailResult = (error) => {
      if (error && typeof error === "object") {
        const record = error;
        const errMsg =
          typeof record.errMsg === "string"
            ? record.errMsg
            : typeof record.message === "string"
              ? record.message
              : "request:fail";
        return { errMsg, ...record };
      }
      if (typeof error === "string") {
        return { errMsg: error };
      }
      return { errMsg: "request:fail" };
    };

    const handle401 = async (requestOptions) => {
      if (isRefreshing) {
        const newToken = await waitForTokenRefresh();
        return requestOnce(withAuthHeader(requestOptions, newToken));
      }

      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        return requestOnce(withAuthHeader(requestOptions, newToken));
      }

      forceLogout();
      throw new Error("Token refresh failed");
    };

    uniApp.request = async function request(requestOptions) {
      const normalizedOptions = requestOptions || {};
      const {
        success: originSuccess,
        fail: originFail,
        complete: originComplete,
        ...restOptions
      } = normalizedOptions;
      const tokenInfo = getTokenInfo();
      const headers = { ...(restOptions.header || {}) };

      try {
        if (tokenInfo?.accessToken) {
          headers.Authorization = `Bearer ${tokenInfo.accessToken}`;

          if (isTokenExpiringSoon(tokenInfo.expiresAt)) {
            if (isRefreshing) {
              const newToken = await waitForTokenRefresh();
              headers.Authorization = `Bearer ${newToken}`;
            } else {
              isRefreshing = true;
              const newToken = await refreshAccessToken();
              isRefreshing = false;

              if (newToken) {
                headers.Authorization = `Bearer ${newToken}`;
                onTokenRefreshed(newToken);
              } else {
                forceLogout();
                throw new Error("Token refresh failed");
              }
            }
          }
        }

        const finalOptions = { ...restOptions, header: headers };
        const response = await requestOnce(finalOptions);

        if (response.statusCode === 401) {
          const retryResponse = await handle401(finalOptions);
          if (typeof originSuccess === "function") originSuccess(retryResponse);
          if (typeof originComplete === "function") {
            originComplete(
              normalizeCompleteResult(retryResponse, "request:ok"),
            );
          }
          return retryResponse;
        }

        if (typeof originSuccess === "function") originSuccess(response);
        if (typeof originComplete === "function") {
          originComplete(normalizeCompleteResult(response, "request:ok"));
        }
        return response;
      } catch (error) {
        const failResult = normalizeFailResult(error);
        if (typeof originFail === "function") originFail(failResult);
        if (typeof originComplete === "function") originComplete(failResult);
        throw error;
      }
    };
  }

  async function manualRefreshToken() {
    const tokenInfo = getTokenInfo();
    if (!tokenInfo) {
      return false;
    }

    if (!isTokenExpiringSoon(tokenInfo.expiresAt)) {
      return true;
    }

    const newToken = await refreshAccessToken();
    return newToken !== null;
  }

  return {
    setupRequestInterceptor,
    manualRefreshToken,
    forceLogout,
    saveTokenInfo,
  };
}
