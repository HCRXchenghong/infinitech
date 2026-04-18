/**
 * Data sync service.
 * Server data stays authoritative. Local storage is only a fast fallback cache.
 */

import config from "./config";
import getLocalDB from "./db";
import { createMobileSyncServiceGetter } from "../../packages/mobile-core/src/sync-service.js";

const getSyncService = createMobileSyncServiceGetter({
  getLocalDB,
  baseUrl: config.API_BASE_URL,
  timeout: config.TIMEOUT,
  productShopMode: "products-query",
  supportsShopCategory: true,
  isDev: Boolean(config.isDev),
  logger: console,
});

export default getSyncService;
