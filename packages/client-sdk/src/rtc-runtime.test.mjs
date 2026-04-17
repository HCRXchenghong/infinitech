import test from "node:test";
import assert from "node:assert/strict";

import {
  createRTCRuntimeSettingsLoader,
  DEFAULT_RTC_RUNTIME_SETTINGS,
  normalizeRTCRuntimeSettings,
} from "./rtc-runtime.js";

test("rtc runtime settings normalize payloads with safe defaults", () => {
  assert.deepEqual(
    normalizeRTCRuntimeSettings({
      rtc_enabled: false,
      rtc_timeout_seconds: "48",
      rtc_ice_servers: [
        { url: " stun:example.com ", username: " user ", credential: " pass " },
        { urls: "turn:relay.example.com", username: "relay", credential: "secret" },
      ],
    }),
    {
      enabled: false,
      timeoutSeconds: 48,
      iceServers: [
        { url: "stun:example.com", username: "user", credential: "pass" },
        { url: "turn:relay.example.com", username: "relay", credential: "secret" },
      ],
    },
  );
});

test("rtc runtime settings loader caches and force-refreshes values", async () => {
  const payloads = [
    { rtc_timeout_seconds: 42 },
    { rtc_enabled: false, rtc_timeout_seconds: 60 },
  ];
  let calls = 0;
  const loader = createRTCRuntimeSettingsLoader(async () => {
    calls += 1;
    return payloads.shift() || {};
  });

  assert.deepEqual(loader.getCachedRTCRuntimeSettings(), DEFAULT_RTC_RUNTIME_SETTINGS);
  assert.equal((await loader.loadRTCRuntimeSettings()).timeoutSeconds, 42);
  assert.equal((await loader.loadRTCRuntimeSettings()).timeoutSeconds, 42);
  assert.equal(calls, 1);
  assert.equal((await loader.loadRTCRuntimeSettings(true)).enabled, false);
  assert.equal(calls, 2);
});
