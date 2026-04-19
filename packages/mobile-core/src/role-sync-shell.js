import { createMobileSyncServiceGetter } from "./sync-service.js";

export function createDefaultRoleSyncServiceGetter(options = {}) {
  const {
    config = {},
    createMobileSyncServiceGetterImpl = createMobileSyncServiceGetter,
    logger = console,
    baseUrl = config.API_BASE_URL,
    timeout = config.TIMEOUT,
    productShopMode = "shop-menu",
    supportsShopCategory = false,
    isDev = Boolean(config.isDev),
    ...rest
  } = options;

  return createMobileSyncServiceGetterImpl({
    logger,
    baseUrl,
    timeout,
    productShopMode,
    supportsShopCategory,
    isDev,
    ...rest,
  });
}
