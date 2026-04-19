import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerNotificationSoundBridge,
  DEFAULT_CONSUMER_NOTIFICATION_SOUND_STORAGE_KEY,
} from "./consumer-notification-sound.js";

test("consumer notification sound bridge binds once and delegates play helpers", async () => {
  const events = [];
  let loadCalls = 0;
  const bridge = createConsumerNotificationSoundBridge({
    loadSupportRuntimeSettings: async () => {
      loadCalls += 1;
      return {
        messageSoundUrl: "/runtime/message.mp3",
      };
    },
    createNotificationAudioManagerImpl(options) {
      assert.equal(options.resolveRelativeUrl("/runtime.mp3"), "/runtime.mp3");
      return {
        bindBridge(payload) {
          events.push(["bindBridge", payload.resolveKind({})]);
        },
        playMessage(extra) {
          events.push(["playMessage", extra]);
          return true;
        },
        playOrder(extra) {
          events.push(["playOrder", extra]);
          return true;
        },
      };
    },
  });

  await bridge.warmupNotificationSoundRuntime();
  bridge.bindNotificationSoundBridge();
  bridge.bindNotificationSoundBridge();
  assert.equal(bridge.playMessageNotificationSound({ force: true }), true);
  assert.equal(bridge.playOrderNotificationSound({ vibrate: true }), true);

  assert.equal(loadCalls, 1);
  assert.deepEqual(events, [
    ["bindBridge", "message"],
    ["playMessage", { force: true }],
    ["playOrder", { vibrate: true }],
  ]);
});

test("consumer notification sound bridge resolves settings and relative asset urls from config", () => {
  const storage = new Map([
    [DEFAULT_CONSUMER_NOTIFICATION_SOUND_STORAGE_KEY, { notification: true, sound: true }],
  ]);
  let capturedResolveSettings = null;
  let capturedResolveRuntimeSettings = null;
  let capturedResolveRelativeUrl = null;

  createConsumerNotificationSoundBridge({
    config: {
      API_BASE_URL: "https://api.example.com/",
    },
    uniApp: {
      getStorageSync(key) {
        return storage.get(key);
      },
    },
    getCachedSupportRuntimeSettings: () => ({
      orderSoundUrl: "/runtime/order.mp3",
    }),
    createNotificationAudioManagerImpl(options) {
      capturedResolveSettings = options.resolveSettings;
      capturedResolveRuntimeSettings = options.resolveRuntimeSettings;
      capturedResolveRelativeUrl = options.resolveRelativeUrl;
      return {
        bindBridge() {},
        playMessage() {
          return true;
        },
        playOrder() {
          return true;
        },
      };
    },
  });

  assert.deepEqual(capturedResolveSettings(), { notification: true, sound: true });
  assert.deepEqual(capturedResolveRuntimeSettings(), { orderSoundUrl: "/runtime/order.mp3" });
  assert.equal(
    capturedResolveRelativeUrl("/runtime/order.mp3"),
    "https://api.example.com/runtime/order.mp3",
  );
});
