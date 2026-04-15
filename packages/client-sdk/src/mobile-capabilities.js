import { extractEnvelopeData } from "../../contracts/src/http.js";

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

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

export function extractRiderPreferenceSettings(payload = {}) {
  const data = extractEnvelopeData(payload) || {};
  const maxDistanceKm = normalizePositiveNumber(
    data.max_distance_km ?? data.maxDistanceKm,
    3,
  );

  return {
    maxDistanceKm,
    autoAcceptEnabled: Boolean(data.auto_accept_enabled ?? data.autoAcceptEnabled),
    preferRoute:
      data.prefer_route === undefined && data.preferRoute === undefined
        ? true
        : Boolean(data.prefer_route ?? data.preferRoute),
    preferHighPrice:
      data.prefer_high_price === undefined && data.preferHighPrice === undefined
        ? true
        : Boolean(data.prefer_high_price ?? data.preferHighPrice),
    preferNearby: Boolean(data.prefer_nearby ?? data.preferNearby),
  };
}
