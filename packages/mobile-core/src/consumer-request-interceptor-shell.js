import { createConsumerRequestInterceptor } from "./consumer-request-interceptor.js";

function normalizeConsumerPushRegistrationStorageKey(clientScope = "user-vue") {
  const normalizedClientScope = String(clientScope || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return `${normalizedClientScope || "user_vue"}_push_registration`;
}

export function createDefaultConsumerRequestInterceptorBindings(options = {}) {
  const {
    config = {},
    uniApp = globalThis.uni,
    baseUrl = config.API_BASE_URL,
    ...rest
  } = options;

  return createConsumerRequestInterceptor({
    uniApp,
    baseUrl,
    ...rest,
  });
}

export function createScopedConsumerRequestInterceptorBindings(options = {}) {
  const {
    clientScope = "user-vue",
    pushRegistrationStorageKey = normalizeConsumerPushRegistrationStorageKey(
      clientScope,
    ),
    ...rest
  } = options;

  return createDefaultConsumerRequestInterceptorBindings({
    pushRegistrationStorageKey,
    ...rest,
  });
}

export function createConsumerUserRequestInterceptorBindings(options = {}) {
  return createScopedConsumerRequestInterceptorBindings({
    clientScope: "user-vue",
    ...options,
  });
}

export function createConsumerAppRequestInterceptorBindings(options = {}) {
  return createScopedConsumerRequestInterceptorBindings({
    clientScope: "app-mobile",
    ...options,
  });
}
