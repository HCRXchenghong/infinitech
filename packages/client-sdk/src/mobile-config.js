const STORAGE_KEY = "app_config";
const LAST_DEV_IP_KEY = "dev_local_ip";
const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:25500";
const DEFAULT_DEV_SOCKET_URL = "http://127.0.0.1:9898";
const DEFAULT_PROD_API_BASE_URL = "https://api.yuexiang.com";
const DEFAULT_PROD_SOCKET_URL = "https://api.yuexiang.com";
const PRIVATE_IP_PATTERN = /^(?:127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)$/;

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolvePlusRuntime(plusRuntime) {
  return plusRuntime || globalThis.plus || null;
}

function resolveProcessEnv(processEnv) {
  if (processEnv && typeof processEnv === "object") {
    return processEnv;
  }
  if (typeof process !== "undefined" && process?.env) {
    return process.env;
  }
  return {};
}

function normalizeWarn(warn) {
  if (typeof warn === "function") {
    return warn;
  }
  return (...args) => console.warn(...args);
}

function normalizeUrl(input) {
  try {
    return new URL(String(input || "").trim());
  } catch (_error) {
    return null;
  }
}

function isPrivateDevHost(hostname) {
  return PRIVATE_IP_PATTERN.test(hostname) || hostname === "localhost";
}

function isProductionUrl(rawUrl) {
  const parsed = normalizeUrl(rawUrl);
  return Boolean(parsed && parsed.protocol === "https:" && !isPrivateDevHost(parsed.hostname));
}

function isDevelopmentUrl(rawUrl) {
  const parsed = normalizeUrl(rawUrl);
  return Boolean(parsed && isPrivateDevHost(parsed.hostname));
}

function readStorageJson(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return null;
  }
  try {
    const raw = uniApp.getStorageSync(key);
    if (!raw) {
      return null;
    }
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_error) {
    return null;
  }
}

function writeStorageJson(uniApp, key, value) {
  if (!uniApp || typeof uniApp.setStorageSync !== "function") {
    return;
  }
  try {
    uniApp.setStorageSync(key, JSON.stringify(value));
  } catch (_error) {
    // Ignore storage write failures in constrained runtimes.
  }
}

export function createMobileConfigRuntime(options = {}) {
  const warn = normalizeWarn(options.warn);
  let manifest = options.manifest || null;

  const getUniApp = () => resolveUniRuntime(options.uniApp);
  const getPlus = () => resolvePlusRuntime(options.plusRuntime);
  const getProcessEnv = () => resolveProcessEnv(options.processEnv);

  function getManifestConfig() {
    return manifest?.["app-plus"]?.config || {};
  }

  function getStorageConfig() {
    return readStorageJson(getUniApp(), STORAGE_KEY) || {};
  }

  function saveStorageConfig(config) {
    writeStorageJson(getUniApp(), STORAGE_KEY, config);
  }

  function getLastLocalIp() {
    const uniApp = getUniApp();
    if (!uniApp || typeof uniApp.getStorageSync !== "function") {
      return null;
    }

    try {
      const raw = String(uniApp.getStorageSync(LAST_DEV_IP_KEY) || "").trim();
      return /^\d+\.\d+\.\d+\.\d+$/.test(raw) ? raw : null;
    } catch (_error) {
      return null;
    }
  }

  function detectEnvironment() {
    const env = getProcessEnv();
    const runtimeEnv = String(env.NODE_ENV || env.UNI_PLATFORM || "").trim().toLowerCase();
    if (runtimeEnv === "production" || runtimeEnv === "prod") {
      return false;
    }

    try {
      const appid = String(getPlus()?.runtime?.appid || "").trim().toLowerCase();
      if (appid.includes("prod") || appid.includes("release")) {
        return false;
      }
      if (appid.includes("dev") || appid.includes("test")) {
        return true;
      }
    } catch (_error) {
      // Ignore non-app runtimes.
    }

    const configuredApiBaseUrl = String(getStorageConfig().API_BASE_URL || "").trim();
    if (configuredApiBaseUrl) {
      if (isProductionUrl(configuredApiBaseUrl)) {
        return false;
      }
      if (isDevelopmentUrl(configuredApiBaseUrl)) {
        return true;
      }
    }

    return true;
  }

  function enforceBffApiBaseUrl(rawUrl, source) {
    const original = String(rawUrl || "").trim();
    const normalized = original
      .replace(/:1029(?=\/|$)/, ":25500")
      .replace(/:1129(?=\/|$)/, ":25500");

    if (normalized && normalized !== original) {
      warn(`[config] ${source} API_BASE_URL pointed at Go directly; switched to BFF endpoint: ${normalized}`);
    }

    return normalized;
  }

  function resolveDevDefaults() {
    const localIp = getLastLocalIp();
    if (!localIp) {
      return {
        API_BASE_URL: DEFAULT_DEV_API_BASE_URL,
        SOCKET_URL: DEFAULT_DEV_SOCKET_URL,
      };
    }

    return {
      API_BASE_URL: `http://${localIp}:25500`,
      SOCKET_URL: `http://${localIp}:9898`,
    };
  }

  function buildConfig() {
    const isDev = detectEnvironment();
    const env = getProcessEnv();
    const manifestConfig = getManifestConfig();
    const storageConfig = getStorageConfig();

    const envApiUrl = String(env.API_BASE_URL || "").trim();
    const envSocketUrl = String(env.SOCKET_URL || "").trim();
    const storageApiUrl = String(storageConfig.API_BASE_URL || "").trim();
    const storageSocketUrl = String(storageConfig.SOCKET_URL || "").trim();
    const manifestApiUrl = String(manifestConfig.API_BASE_URL || "").trim();
    const manifestSocketUrl = String(manifestConfig.SOCKET_URL || "").trim();

    let apiBaseUrl = "";
    let socketUrl = "";

    if (envApiUrl) {
      apiBaseUrl = enforceBffApiBaseUrl(envApiUrl, "environment");
      socketUrl = envSocketUrl || apiBaseUrl;
    } else if (storageApiUrl) {
      apiBaseUrl = enforceBffApiBaseUrl(storageApiUrl, "storage");
      socketUrl = storageSocketUrl || apiBaseUrl;
    } else if (manifestApiUrl) {
      apiBaseUrl = enforceBffApiBaseUrl(manifestApiUrl, "manifest");
      socketUrl = manifestSocketUrl || apiBaseUrl;
    } else if (isDev) {
      const defaults = resolveDevDefaults();
      apiBaseUrl = defaults.API_BASE_URL;
      socketUrl = defaults.SOCKET_URL;
    } else {
      apiBaseUrl = DEFAULT_PROD_API_BASE_URL;
      socketUrl = DEFAULT_PROD_SOCKET_URL;
    }

    return {
      API_BASE_URL: apiBaseUrl,
      SOCKET_URL: socketUrl,
      isDev,
      TIMEOUT: 30000,
    };
  }

  const config = buildConfig();

  function setManifest(nextManifest) {
    manifest = nextManifest || null;
    Object.assign(config, buildConfig());
  }

  function updateConfig(newConfig = {}) {
    const normalizedConfig = { ...newConfig };
    if (normalizedConfig.API_BASE_URL) {
      normalizedConfig.API_BASE_URL = enforceBffApiBaseUrl(normalizedConfig.API_BASE_URL, "runtime update");
    }

    saveStorageConfig({
      ...getStorageConfig(),
      ...normalizedConfig,
    });

    const nextConfig = buildConfig();
    Object.assign(config, nextConfig);
    return nextConfig;
  }

  function getConfig() {
    return { ...config };
  }

  return {
    config,
    setManifest,
    updateConfig,
    getConfig,
  };
}

const defaultMobileConfigRuntime = createMobileConfigRuntime();

export const setManifest = defaultMobileConfigRuntime.setManifest;
export const updateConfig = defaultMobileConfigRuntime.updateConfig;
export const getConfig = defaultMobileConfigRuntime.getConfig;

export default defaultMobileConfigRuntime.config;
