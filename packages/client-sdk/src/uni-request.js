import { buildAuthorizationHeaders } from "./auth.js";

function normalizeLogger(logger) {
  const fallbackLogger = {
    error: (...args) => console.error(...args),
  };

  if (logger && typeof logger === "object") {
    return {
      error: typeof logger.error === "function" ? (...args) => logger.error(...args) : fallbackLogger.error,
    };
  }

  return fallbackLogger;
}

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function readTransportMessage(error) {
  if (typeof error === "string") {
    return error.trim();
  }

  return String(
    error?.errMsg ||
      error?.message ||
      error?.error ||
      "",
  ).trim();
}

export function isRetryableUniNetworkError(error) {
  const message = readTransportMessage(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("connect") ||
    message.includes("refused") ||
    message.includes("network request failed") ||
    message.includes("request:fail") ||
    message.includes("network") ||
    message.includes("offline")
  );
}

export function buildUniNetworkErrorMessage(error, context = {}, options = {}) {
  const message = readTransportMessage(error);
  const lowerCaseMessage = message.toLowerCase();
  const defaultMessage = String(options.defaultMessage || "网络请求失败").trim() || "网络请求失败";
  const timeoutMessage = options.timeoutMessage;
  const unreachableMessage = options.unreachableMessage;

  if (lowerCaseMessage.includes("timeout")) {
    if (typeof timeoutMessage === "function") {
      return String(timeoutMessage(context, error) || defaultMessage).trim() || defaultMessage;
    }
    if (timeoutMessage) {
      return String(timeoutMessage).trim() || defaultMessage;
    }
  }

  if (isRetryableUniNetworkError(message)) {
    if (typeof unreachableMessage === "function") {
      return String(unreachableMessage(context, error) || defaultMessage).trim() || defaultMessage;
    }
    if (unreachableMessage) {
      return String(unreachableMessage).trim() || defaultMessage;
    }
  }

  return message || defaultMessage;
}

function shouldAttachAuthorization(requestOptions, getAuthToken) {
  return typeof getAuthToken === "function" && requestOptions?.auth !== false;
}

export function createUniRequestClient(options = {}) {
  const logger = normalizeLogger(options.logger);
  const uniApp = options.uniApp || globalThis.uni;
  const getBaseUrl = typeof options.getBaseUrl === "function"
    ? options.getBaseUrl
    : () => options.baseUrl;
  const getTimeout = typeof options.getTimeout === "function"
    ? options.getTimeout
    : () => options.timeout;
  const getAuthToken = typeof options.getAuthToken === "function"
    ? options.getAuthToken
    : null;
  const createHttpError = typeof options.createHttpError === "function"
    ? options.createHttpError
    : (payload, statusCode) => ({
        data: payload,
        error: payload?.error || payload?.message || `请求失败: ${statusCode}`,
        statusCode,
      });
  const createNetworkError = typeof options.createNetworkError === "function"
    ? options.createNetworkError
    : (error, context) => {
        const message = buildUniNetworkErrorMessage(error, context);
        return {
          data: error,
          error: message,
          message,
        };
      };
  const shouldLogNetworkError = typeof options.shouldLogNetworkError === "function"
    ? options.shouldLogNetworkError
    : () => false;
  const retryOnNetworkError = typeof options.retryOnNetworkError === "function"
    ? options.retryOnNetworkError
    : null;
  const onUnauthorized = typeof options.onUnauthorized === "function"
    ? options.onUnauthorized
    : null;
  const defaultHeader = {
    "Content-Type": "application/json",
    ...(options.defaultHeader && typeof options.defaultHeader === "object" ? options.defaultHeader : {}),
  };

  const request = (requestOptions = {}) => {
    const baseUrl = normalizeBaseUrl(getBaseUrl());
    const headers = {
      ...defaultHeader,
      ...(requestOptions.header && typeof requestOptions.header === "object" ? requestOptions.header : {}),
    };

    if (shouldAttachAuthorization(requestOptions, getAuthToken)) {
      const token = getAuthToken();
      if (token && !headers.Authorization && !headers.authorization) {
        Object.assign(headers, buildAuthorizationHeaders(token));
      }
    }

    return new Promise((resolve, reject) => {
      uniApp.request({
        url: `${baseUrl}${String(requestOptions.url || "")}`,
        method: requestOptions.method || "GET",
        data: requestOptions.data || {},
        header: headers,
        timeout: Number(getTimeout() || 8000),
        success(res) {
          const statusCode = Number(res?.statusCode || 0);
          if (statusCode >= 200 && statusCode < 300) {
            resolve(res.data);
            return;
          }

          if (statusCode === 401 && shouldAttachAuthorization(requestOptions, getAuthToken) && onUnauthorized) {
            onUnauthorized({
              baseUrl,
              requestOptions,
              response: res,
            });
          }

          reject(createHttpError(res?.data, statusCode, {
            baseUrl,
            requestOptions,
            response: res,
          }));
        },
        async fail(error) {
          const context = {
            baseUrl,
            requestOptions,
            error,
          };

          if (shouldLogNetworkError(error, context)) {
            logger.error("请求失败:", error);
          }

          const skipRetry = requestOptions?._skipRetry === true || requestOptions?._skipFallback === true;
          if (!skipRetry && retryOnNetworkError) {
            try {
              const retryResult = await retryOnNetworkError({
                ...context,
                retryRequest(overrideOptions = {}) {
                  return request({
                    ...requestOptions,
                    ...overrideOptions,
                    _skipRetry: true,
                    _skipFallback: true,
                  });
                },
              });

              if (retryResult?.retried) {
                resolve(retryResult.value);
                return;
              }
            } catch (_retryError) {
              // Ignore retry hook failures and fall back to the original request error.
            }
          }

          reject(createNetworkError(error, context));
        },
      });
    });
  };

  return request;
}
