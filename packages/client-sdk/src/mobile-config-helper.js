import config, { getConfig, updateConfig } from "./mobile-config.js";

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveLogger(logger) {
  if (logger && typeof logger.log === "function") {
    return logger;
  }
  return console;
}

function generateIPCandidates() {
  const candidates = [];
  const commonSegments = [
    "192.168.0",
    "192.168.1",
    "192.168.2",
    "10.0.0",
    "172.16.0",
  ];

  for (const segment of commonSegments) {
    for (let index = 100; index <= 150; index += 1) {
      candidates.push(`http://${segment}.${index}:25500`);
    }
  }

  return candidates;
}

export function createMobileConfigHelper(options = {}) {
  const uniApp = resolveUniRuntime(options.uniApp);
  const logger = resolveLogger(options.logger);
  const configRef = options.config || config;
  const readConfig = typeof options.getConfig === "function" ? options.getConfig : getConfig;
  const writeConfig = typeof options.updateConfig === "function" ? options.updateConfig : updateConfig;

  async function checkServerConnection(url) {
    const testUrl = url || `${configRef.API_BASE_URL}/health`;
    return new Promise((resolve) => {
      uniApp.request({
        url: testUrl,
        method: "GET",
        timeout: 5000,
        success(response) {
          resolve(response.statusCode >= 200 && response.statusCode < 300);
        },
        fail() {
          resolve(false);
        },
      });
    });
  }

  async function autoDetectServer() {
    const candidates = [
      configRef.API_BASE_URL,
      ...generateIPCandidates(),
    ];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      if (await checkServerConnection(`${candidate}/health`)) {
        return candidate;
      }
    }

    return null;
  }

  async function updateConfigAndVerify(newConfig) {
    const previousConfig = readConfig();
    writeConfig(newConfig);

    const available = await checkServerConnection();
    if (available) {
      return true;
    }

    writeConfig(previousConfig);
    return false;
  }

  async function configWizard() {
    if (await checkServerConnection()) {
      return;
    }

    const detectedUrl = await autoDetectServer();
    if (detectedUrl) {
      const updated = await updateConfigAndVerify({
        API_BASE_URL: detectedUrl.replace("/health", ""),
        SOCKET_URL: detectedUrl.replace("/health", ""),
      });
      if (updated) {
        return;
      }
    }

    logger.log("❌ 自动检测失败，请手动配置服务器地址");
    logger.log("   使用方法：");
    logger.log('   import { updateConfig } from "./config"');
    logger.log('   updateConfig({ API_BASE_URL: "http://你的IP:25500" })');
  }

  function getConfigInfo() {
    try {
      const storageConfig = uniApp.getStorageSync("app_config");
      return {
        current: readConfig(),
        storage: storageConfig ? JSON.parse(storageConfig) : null,
        environment: configRef.isDev ? "development" : "production",
      };
    } catch (_error) {
      return {
        current: readConfig(),
        storage: null,
        environment: configRef.isDev ? "development" : "production",
      };
    }
  }

  return {
    checkServerConnection,
    autoDetectServer,
    updateConfigAndVerify,
    configWizard,
    getConfigInfo,
  };
}
