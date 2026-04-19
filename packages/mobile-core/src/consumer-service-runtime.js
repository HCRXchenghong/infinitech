import {
  DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  createConsumerAuthRuntimeStore,
} from "./consumer-auth-runtime.js";
import { createConsumerApi } from "./consumer-api.js";
import { createMobileSyncServiceGetter } from "./sync-service.js";

export { DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS };

export function createConsumerServiceRuntime(options = {}) {
  const createSyncServiceGetter =
    options.createMobileSyncServiceGetterImpl || createMobileSyncServiceGetter;
  const createApi = options.createConsumerApiImpl || createConsumerApi;
  const createAuthRuntimeStore =
    options.createConsumerAuthRuntimeStoreImpl ||
    createConsumerAuthRuntimeStore;

  const getSyncService =
    options.getSyncService ||
    createSyncServiceGetter({
      getLocalDB: options.getLocalDB,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      productShopMode: options.productShopMode,
      supportsShopCategory: options.supportsShopCategory,
      isDev: options.isDev,
      logger: options.logger,
    });

  const api =
    options.api ||
    createApi({
      config: options.config,
      getSyncService,
      logger: options.logger,
      uniApp: options.uniApp || globalThis.uni,
    });

  const authRuntimeStore =
    options.authRuntimeStore ||
    createAuthRuntimeStore({
      fetchRuntimeSettings:
        options.fetchRuntimeSettings || api.fetchPublicRuntimeSettings,
    });

  return {
    getSyncService,
    api,
    authRuntimeStore,
    ...api,
    ...authRuntimeStore,
  };
}
