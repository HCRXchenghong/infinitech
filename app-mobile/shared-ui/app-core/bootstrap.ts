import getSyncService from "../sync";
import { configWizard } from "../config-helper";
import config from "../config";
import { setupRequestInterceptor } from "../request-interceptor";
import { checkAndClearCacheIfNeeded } from "../cache-cleaner";
import { startPushEventBridge } from "../push-events";
import { createConsumerAppBootstrap } from "../../../packages/mobile-core/src/consumer-app-bootstrap.js";
import { syncUserBridges, teardownUserBridges } from "./bridges";
import { verifyUserSession } from "./session";

const appBootstrap = createConsumerAppBootstrap({
  checkAndClearCacheIfNeeded,
  setupRequestInterceptor,
  startPushEventBridge,
  configWizard,
  shouldRunConfigWizard:
    config.isDev && typeof (globalThis as any).plus !== "undefined",
  getSyncService,
  verifySession: verifyUserSession,
  syncBridges: syncUserBridges,
  teardownBridges: teardownUserBridges,
  loggerTag: "App",
});

export const {
  bootstrapConsumerApp: bootstrapUserApp,
  handleConsumerAppShow: handleUserAppShow,
} = appBootstrap;
