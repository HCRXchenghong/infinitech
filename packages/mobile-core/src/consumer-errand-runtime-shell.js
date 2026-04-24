import { createConsumerErrandRuntimeBindings } from "./consumer-errand-runtime.js";

export function createDefaultConsumerErrandRuntimeBindings(options = {}) {
  const {
    uniApp = globalThis.uni,
    clientScope = "user-vue",
    ...rest
  } = options;

  return createConsumerErrandRuntimeBindings({
    uniApp,
    clientScope,
    ...rest,
  });
}

export function createConsumerUserErrandRuntimeBindings(options = {}) {
  return createDefaultConsumerErrandRuntimeBindings({
    clientScope: "user-vue",
    ...options,
  });
}

export function createConsumerAppErrandRuntimeBindings(options = {}) {
  return createDefaultConsumerErrandRuntimeBindings({
    clientScope: "app-mobile",
    ...options,
  });
}
