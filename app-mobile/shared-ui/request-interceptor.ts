import config from "./config";
import { clearSQLiteCache } from "./cache-cleaner";
import { createConsumerAppRequestInterceptorBindings } from "../../packages/mobile-core/src/consumer-request-interceptor-shell.js";

const consumerRequestInterceptor = createConsumerAppRequestInterceptorBindings({
  config,
  clearLocalCache: clearSQLiteCache,
});

export const {
  setupRequestInterceptor,
  manualRefreshToken,
  forceLogout,
  saveTokenInfo,
} = consumerRequestInterceptor;
