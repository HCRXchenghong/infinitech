import {
  DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  createConsumerServiceRuntime,
} from "./consumer-service-runtime.js";

export { DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS };

export function createDefaultConsumerServiceRuntime(options = {}) {
  const {
    config = {},
    logger = console,
    uniApp = globalThis.uni,
    baseUrl = config.API_BASE_URL,
    timeout = config.TIMEOUT,
    productShopMode = "products-query",
    supportsShopCategory = true,
    isDev = Boolean(config.isDev),
    ...rest
  } = options;

  return createConsumerServiceRuntime({
    config,
    logger,
    uniApp,
    baseUrl,
    timeout,
    productShopMode,
    supportsShopCategory,
    isDev,
    ...rest,
  });
}
