import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";
import { createMobilePushApi } from "../../client-sdk/src/mobile-capabilities.js";
import {
  buildUniNetworkErrorMessage,
  createUniRequestClient,
  isRetryableUniNetworkError,
} from "../../client-sdk/src/uni-request.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import { readStoredBearerToken, uploadAuthenticatedAsset } from "./upload.js";

const DEFAULT_BFF_PORT = "25500";
const DEFAULT_HEALTH_PATHS = Object.freeze(["/health", "/api/health"]);
const DEFAULT_TOKEN_STORAGE_KEYS = Object.freeze(["token", "access_token"]);

function trimValue(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeBaseUrl(url) {
  return trimValue(url).replace(/\/+$/, "");
}

function uniqueList(list = []) {
  const result = [];
  const seen = new Set();
  for (const item of list) {
    const normalized = normalizeBaseUrl(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function parseBaseUrl(url) {
  const normalized = normalizeBaseUrl(url);
  const match = normalized.match(/^(https?:\/\/)([^/:]+)(?::(\d+))?$/i);
  if (!match) {
    return null;
  }
  return {
    protocol: match[1],
    host: match[2],
    port: match[3] || "",
  };
}

function readStorageValue(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function createDefaultHttpError(payload, statusCode) {
  return {
    data: payload,
    error: payload?.error || `请求失败: ${statusCode}`,
    statusCode,
  };
}

function createDefaultNetworkError(error, { baseUrl }) {
  const message = buildUniNetworkErrorMessage(
    error,
    { baseUrl },
    {
      defaultMessage: "网络请求失败，请检查网络连接",
      timeoutMessage: "请求超时，请检查后端服务是否运行（端口25500）",
      unreachableMessage: () =>
        `无法连接到服务器，请确认后端服务已启动（${baseUrl}）`,
    },
  );

  return {
    error: message,
    message,
  };
}

function resolveUploadDomain(role, explicitUploadDomain) {
  const normalizedExplicitUploadDomain = trimValue(explicitUploadDomain);
  if (normalizedExplicitUploadDomain) {
    return normalizedExplicitUploadDomain;
  }

  return trimValue(role) === "merchant"
    ? UPLOAD_DOMAINS.SHOP_MEDIA
    : UPLOAD_DOMAINS.PROFILE_IMAGE;
}

export function buildRoleApiBaseUrlCandidates(currentBaseUrl, options = {}) {
  const baseUrl = normalizeBaseUrl(currentBaseUrl);
  const fallbackPort = trimValue(options.fallbackPort || DEFAULT_BFF_PORT);
  const uniApp = options.uniApp || globalThis.uni;
  const savedIpStorageKey = trimValue(options.savedIpStorageKey || "dev_local_ip");
  const defaultFallbackIp = trimValue(
    options.defaultFallbackIp || process.env.DEFAULT_BFF_IP || "127.0.0.1",
  );
  const result = [];
  const parsed = parseBaseUrl(baseUrl);

  if (parsed) {
    result.push(
      `${parsed.protocol}${parsed.host}${parsed.port ? `:${parsed.port}` : ""}`,
    );
    if (fallbackPort) {
      result.push(`${parsed.protocol}${parsed.host}:${fallbackPort}`);
    }
  } else if (baseUrl) {
    result.push(baseUrl);
  }

  const savedIp = trimValue(readStorageValue(uniApp, savedIpStorageKey));
  if (savedIp && /^\d+\.\d+\.\d+\.\d+$/.test(savedIp) && fallbackPort) {
    result.push(`http://${savedIp}:${fallbackPort}`);
  }

  if (defaultFallbackIp && fallbackPort) {
    result.push(`http://${defaultFallbackIp}:${fallbackPort}`);
  }

  return uniqueList(result);
}

export function probeRoleApiBaseUrl(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const healthPaths = Array.isArray(options.healthPaths)
    ? [...options.healthPaths]
    : [...DEFAULT_HEALTH_PATHS];
  const timeout = Number(options.timeout || 1200);

  return new Promise((resolve) => {
    const tryNext = () => {
      const path = healthPaths.shift();
      if (!path) {
        resolve(false);
        return;
      }

      uniApp.request({
        url: `${baseUrl}${path}`,
        method: "GET",
        timeout,
        success(response) {
          const statusCode = Number(response?.statusCode || 0);
          if (statusCode >= 200 && statusCode < 500) {
            resolve(true);
            return;
          }
          tryNext();
        },
        fail() {
          tryNext();
        },
      });
    };

    tryNext();
  });
}

export function createRoleApiRuntimeBindings(options = {}) {
  const role = trimValue(options.role);
  const uniApp = options.uniApp || globalThis.uni;
  const config =
    options.config && typeof options.config === "object" ? options.config : {};
  const getBaseUrl =
    typeof options.getBaseUrl === "function"
      ? options.getBaseUrl
      : () => config.API_BASE_URL;
  const getTimeout =
    typeof options.getTimeout === "function"
      ? options.getTimeout
      : () => config.TIMEOUT;
  const tokenStorageKeys = Array.isArray(options.tokenStorageKeys)
    ? [...options.tokenStorageKeys]
    : [...DEFAULT_TOKEN_STORAGE_KEYS];
  const buildAuthorizationHeadersImpl =
    options.buildAuthorizationHeadersImpl || buildAuthorizationHeaders;
  const createMobilePushApiImpl =
    options.createMobilePushApiImpl || createMobilePushApi;
  const createUniRequestClientImpl =
    options.createUniRequestClientImpl || createUniRequestClient;
  const readStoredBearerTokenImpl =
    options.readStoredBearerTokenImpl || readStoredBearerToken;
  const uploadAuthenticatedAssetImpl =
    options.uploadAuthenticatedAssetImpl || uploadAuthenticatedAsset;
  const buildUploadValidationError =
    typeof options.buildUploadValidationError === "function"
      ? options.buildUploadValidationError
      : (message) => new Error(message);
  const createHttpError =
    typeof options.createHttpError === "function"
      ? options.createHttpError
      : createDefaultHttpError;
  const createNetworkError =
    typeof options.createNetworkError === "function"
      ? options.createNetworkError
      : createDefaultNetworkError;
  const shouldLogNetworkError =
    typeof options.shouldLogNetworkError === "function"
      ? options.shouldLogNetworkError
      : (error) => !isRetryableUniNetworkError(error) || Boolean(config.isDev);
  const shouldRetryNetworkError =
    typeof options.shouldRetryNetworkError === "function"
      ? options.shouldRetryNetworkError
      : isRetryableUniNetworkError;
  const onUnauthorized =
    typeof options.onUnauthorized === "function" ? options.onUnauthorized : null;
  const updateRuntimeConfig =
    typeof options.updateRuntimeConfig === "function"
      ? options.updateRuntimeConfig
      : null;
  const enableBaseUrlFallback = options.enableBaseUrlFallback === true;
  const resolveProbeTimeout = () => Number(options.probeTimeout || 1200);
  const fallbackHealthPaths = Array.isArray(options.fallbackHealthPaths)
    ? [...options.fallbackHealthPaths]
    : [...DEFAULT_HEALTH_PATHS];
  const defaultUploadDomain = resolveUploadDomain(
    role,
    options.defaultUploadDomain,
  );
  let resolvingBaseUrlPromise = null;

  function readAuthToken() {
    return readStoredBearerTokenImpl(uniApp, tokenStorageKeys);
  }

  function buildAuthorizationHeader(token) {
    return buildAuthorizationHeadersImpl(token);
  }

  function readAuthorizationHeader() {
    return buildAuthorizationHeader(readAuthToken());
  }

  async function resolveReachableBaseUrl(currentBaseUrl) {
    if (!enableBaseUrlFallback) {
      return null;
    }
    if (typeof options.resolveReachableBaseUrl === "function") {
      return options.resolveReachableBaseUrl(currentBaseUrl, {
        uniApp,
        buildRoleApiBaseUrlCandidates,
        probeRoleApiBaseUrl,
      });
    }
    if (resolvingBaseUrlPromise) {
      return resolvingBaseUrlPromise;
    }

    resolvingBaseUrlPromise = (async () => {
      const candidates = buildRoleApiBaseUrlCandidates(currentBaseUrl, {
        uniApp,
        fallbackPort: options.fallbackPort,
        savedIpStorageKey: options.savedIpStorageKey,
        defaultFallbackIp: options.defaultFallbackIp,
      });
      for (const candidate of candidates) {
        const ok = await probeRoleApiBaseUrl({
          uniApp,
          baseUrl: candidate,
          healthPaths: fallbackHealthPaths,
          timeout: resolveProbeTimeout(),
        });
        if (ok) {
          return candidate;
        }
      }
      return null;
    })();

    try {
      return await resolvingBaseUrlPromise;
    } finally {
      resolvingBaseUrlPromise = null;
    }
  }

  async function applyResolvedBaseUrl(baseUrl) {
    if (!baseUrl || !updateRuntimeConfig) {
      return;
    }
    updateRuntimeConfig({
      API_BASE_URL: baseUrl,
      SOCKET_URL: baseUrl,
    });
  }

  async function uploadByBaseUrl(filePath, baseUrl, uploadDomain) {
    const token = readAuthToken();
    return uploadAuthenticatedAssetImpl({
      uniApp,
      baseUrl,
      filePath,
      token,
      uploadDomain,
      onUnauthorized: token && onUnauthorized ? () => onUnauthorized() : undefined,
    });
  }

  const requestClient = createUniRequestClientImpl({
    uniApp,
    getBaseUrl,
    getTimeout,
    getAuthToken: readAuthToken,
    onUnauthorized,
    createHttpError,
    createNetworkError,
    shouldLogNetworkError,
    logger: options.logger || console,
    retryOnNetworkError: enableBaseUrlFallback
      ? async ({ baseUrl, error, retryRequest }) => {
          if (!shouldRetryNetworkError(error)) {
            return null;
          }
          const resolved = await resolveReachableBaseUrl(baseUrl);
          if (!resolved || resolved === normalizeBaseUrl(baseUrl)) {
            return null;
          }
          await applyResolvedBaseUrl(resolved);
          return {
            retried: true,
            value: await retryRequest({
              _skipFallback: true,
            }),
          };
        }
      : null,
  });

  function request(requestOptions) {
    return requestClient(requestOptions);
  }

  async function uploadImage(filePath, uploadOptions = {}) {
    const normalizedPath = trimValue(filePath);
    if (!normalizedPath) {
      throw buildUploadValidationError("缺少上传文件路径");
    }

    const uploadDomain = resolveUploadDomain(
      role,
      uploadOptions.uploadDomain || defaultUploadDomain,
    );
    const baseUrl = normalizeBaseUrl(getBaseUrl());

    try {
      return await uploadByBaseUrl(normalizedPath, baseUrl, uploadDomain);
    } catch (error) {
      if (!enableBaseUrlFallback || !shouldRetryNetworkError(error)) {
        throw error;
      }

      const resolved = await resolveReachableBaseUrl(baseUrl);
      if (!resolved || resolved === baseUrl) {
        throw error;
      }

      await applyResolvedBaseUrl(resolved);
      return uploadByBaseUrl(normalizedPath, resolved, uploadDomain);
    }
  }

  const mobilePushApi = createMobilePushApiImpl({
    post(url, data) {
      return request({
        url,
        method: "POST",
        data,
      });
    },
  });

  return {
    getBaseUrl,
    request,
    uploadImage,
    buildAuthorizationHeader,
    readAuthorizationHeader,
    readAuthToken,
    registerPushDevice: mobilePushApi.registerPushDevice,
    unregisterPushDevice: mobilePushApi.unregisterPushDevice,
    ackPushMessage: mobilePushApi.ackPushMessage,
  };
}
