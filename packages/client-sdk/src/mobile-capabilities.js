import { extractEnvelopeData } from "../../contracts/src/http.js";

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const RIDER_PREFERENCE_DISTANCE_RANGE = {
  min: 1,
  max: 20,
  step: 0.5,
};

export const DEFAULT_RIDER_PREFERENCE_SETTINGS = {
  maxDistanceKm: 3,
  autoAcceptEnabled: false,
  preferRoute: true,
  preferHighPrice: true,
  preferNearby: false,
};

export function createMobilePushApi({ post }) {
  return {
    registerPushDevice(payload = {}) {
      return post("/api/mobile/push/devices/register", payload);
    },
    unregisterPushDevice(payload = {}) {
      return post("/api/mobile/push/devices/unregister", payload);
    },
    ackPushMessage(payload = {}) {
      return post("/api/mobile/push/ack", payload);
    },
  };
}

export function createRiderPreferenceApi({ get, post }) {
  return {
    fetchRiderPreferences() {
      return get("/api/riders/preferences");
    },
    saveRiderPreferences(payload = {}) {
      return post("/api/riders/preferences", payload);
    },
  };
}

export function clampRiderPreferenceDistance(
  value,
  {
    fallback = DEFAULT_RIDER_PREFERENCE_SETTINGS.maxDistanceKm,
    min = RIDER_PREFERENCE_DISTANCE_RANGE.min,
    max = RIDER_PREFERENCE_DISTANCE_RANGE.max,
  } = {},
) {
  const parsed = normalizePositiveNumber(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

export function extractRiderPreferenceSettings(payload = {}) {
  const data = extractEnvelopeData(payload) || {};
  const maxDistanceKm = clampRiderPreferenceDistance(
    data.max_distance_km ?? data.maxDistanceKm,
  );

  return {
    maxDistanceKm,
    autoAcceptEnabled: Boolean(
      data.auto_accept_enabled
      ?? data.autoAcceptEnabled
      ?? DEFAULT_RIDER_PREFERENCE_SETTINGS.autoAcceptEnabled,
    ),
    preferRoute:
      data.prefer_route === undefined && data.preferRoute === undefined
        ? DEFAULT_RIDER_PREFERENCE_SETTINGS.preferRoute
        : Boolean(data.prefer_route ?? data.preferRoute),
    preferHighPrice:
      data.prefer_high_price === undefined && data.preferHighPrice === undefined
        ? DEFAULT_RIDER_PREFERENCE_SETTINGS.preferHighPrice
        : Boolean(data.prefer_high_price ?? data.preferHighPrice),
    preferNearby: Boolean(
      data.prefer_nearby
      ?? data.preferNearby
      ?? DEFAULT_RIDER_PREFERENCE_SETTINGS.preferNearby,
    ),
  };
}

export function buildRiderPreferencePayload(settings = {}) {
  const normalized = extractRiderPreferenceSettings(settings);
  return {
    max_distance_km: normalized.maxDistanceKm,
    auto_accept_enabled: normalized.autoAcceptEnabled,
    prefer_route: normalized.preferRoute,
    prefer_high_price: normalized.preferHighPrice,
    prefer_nearby: normalized.preferNearby,
  };
}
