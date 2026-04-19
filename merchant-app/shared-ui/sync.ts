/**
 * Data sync service.
 * Server data stays authoritative. Local storage is only a fast fallback cache.
 */

import config from "./config";
import getLocalDB from "./db";
import { createDefaultRoleSyncServiceGetter } from "../../packages/mobile-core/src/role-sync-shell.js";

const getSyncService = createDefaultRoleSyncServiceGetter({
  config,
  getLocalDB,
  logger: console,
});

export default getSyncService;
