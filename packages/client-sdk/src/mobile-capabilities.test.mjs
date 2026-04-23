import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderPreferencePayload,
  clampRiderPreferenceDistance,
  createMobilePushApi,
  createRiderPreferenceApi,
  DEFAULT_RIDER_PREFERENCE_SETTINGS,
  extractRiderPreferenceSettings,
  RIDER_PREFERENCE_DISTANCE_RANGE,
} from "./mobile-capabilities.js";

test("createMobilePushApi binds standard push endpoints", async () => {
  const calls = [];
  const api = createMobilePushApi({
    post(url, payload) {
      calls.push({ url, payload });
      return Promise.resolve({ ok: true });
    },
  });

  await api.registerPushDevice({ deviceToken: "abc" });
  await api.unregisterPushDevice({ deviceToken: "abc" });
  await api.ackPushMessage({ messageId: "msg-1" });

  assert.deepEqual(calls, [
    { url: "/api/mobile/push/devices/register", payload: { deviceToken: "abc" } },
    { url: "/api/mobile/push/devices/unregister", payload: { deviceToken: "abc" } },
    { url: "/api/mobile/push/ack", payload: { messageId: "msg-1" } },
  ]);
});

test("createRiderPreferenceApi binds rider preference endpoints", async () => {
  const calls = [];
  const api = createRiderPreferenceApi({
    get(url) {
      calls.push({ method: "GET", url });
      return Promise.resolve({});
    },
    post(url, payload) {
      calls.push({ method: "POST", url, payload });
      return Promise.resolve({});
    },
  });

  await api.fetchRiderPreferences();
  await api.saveRiderPreferences({ auto_accept_enabled: true });

  assert.deepEqual(calls, [
    { method: "GET", url: "/api/riders/preferences" },
    {
      method: "POST",
      url: "/api/riders/preferences",
      payload: { auto_accept_enabled: true },
    },
  ]);
});

test("extractRiderPreferenceSettings supports enveloped and legacy payloads", () => {
  assert.deepEqual(
    extractRiderPreferenceSettings({
      data: {
        max_distance_km: 5,
        auto_accept_enabled: true,
        prefer_route: false,
        prefer_high_price: true,
        prefer_nearby: true,
      },
    }),
    {
      maxDistanceKm: 5,
      autoAcceptEnabled: true,
      preferRoute: false,
      preferHighPrice: true,
      preferNearby: true,
    },
  );

  assert.deepEqual(
    extractRiderPreferenceSettings({
      maxDistanceKm: 2.5,
      autoAcceptEnabled: false,
    }),
    {
      maxDistanceKm: 2.5,
      autoAcceptEnabled: false,
      preferRoute: true,
      preferHighPrice: true,
      preferNearby: false,
    },
  );

  assert.deepEqual(DEFAULT_RIDER_PREFERENCE_SETTINGS, {
    maxDistanceKm: 3,
    autoAcceptEnabled: false,
    preferRoute: true,
    preferHighPrice: true,
    preferNearby: false,
  });
  assert.deepEqual(RIDER_PREFERENCE_DISTANCE_RANGE, {
    min: 1,
    max: 20,
    step: 0.5,
  });
  assert.equal(clampRiderPreferenceDistance(0), 3);
  assert.equal(clampRiderPreferenceDistance(30), 20);
  assert.deepEqual(
    buildRiderPreferencePayload({
      maxDistanceKm: 8,
      autoAcceptEnabled: true,
      preferRoute: false,
      preferHighPrice: false,
      preferNearby: true,
    }),
    {
      max_distance_km: 8,
      auto_accept_enabled: true,
      prefer_route: false,
      prefer_high_price: false,
      prefer_nearby: true,
    },
  );
});
