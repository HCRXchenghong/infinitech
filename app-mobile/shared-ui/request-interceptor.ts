import config from "./config";
import { clearSQLiteCache } from "./cache-cleaner";
import { createConsumerRequestInterceptor } from "../../packages/mobile-core/src/consumer-request-interceptor.js";

const consumerRequestInterceptor = createConsumerRequestInterceptor({
  uniApp: uni,
  baseUrl: config.API_BASE_URL,
  clearLocalCache: clearSQLiteCache,
  pushRegistrationStorageKey: "app_mobile_push_registration",
});

export const {
  setupRequestInterceptor,
  manualRefreshToken,
  forceLogout,
  saveTokenInfo,
} = consumerRequestInterceptor;
