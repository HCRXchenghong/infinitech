import config from "./config";
import { clearSQLiteCache } from "./cache-cleaner";
import { createConsumerUserRequestInterceptorBindings } from "../../packages/mobile-core/src/consumer-request-interceptor-shell.js";

const consumerRequestInterceptor = createConsumerUserRequestInterceptorBindings({
  config,
  clearLocalCache: clearSQLiteCache,
});

export const {
  setupRequestInterceptor,
  manualRefreshToken,
  forceLogout,
  saveTokenInfo,
} = consumerRequestInterceptor;
