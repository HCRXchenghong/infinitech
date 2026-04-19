import { createConsumerAppRuntime } from "./consumer-app-runtime.js";

export function createDefaultConsumerUserAppRuntime(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    plusRuntime = globalThis.plus,
    logger = console,
    loggerTag = "App",
    requiredAuthMode = "user",
    ...rest
  } = options;

  return createConsumerAppRuntime({
    uniApp,
    baseUrl: rest.baseUrl || config.API_BASE_URL,
    requiredAuthMode,
    logger,
    loggerTag,
    shouldRunConfigWizard:
      rest.shouldRunConfigWizard !== undefined
        ? rest.shouldRunConfigWizard
        : Boolean(config.isDev) && typeof plusRuntime !== "undefined",
    ...rest,
  });
}
