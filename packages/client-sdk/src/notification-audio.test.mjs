import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyNotificationEnvelopeKind,
  createUniNotificationAudioManager,
} from "./notification-audio.js";

test("notification audio classifies order and message envelopes consistently", () => {
  assert.equal(
    classifyNotificationEnvelopeKind({
      refreshTargets: ["orders"],
    }),
    "order",
  );
  assert.equal(
    classifyNotificationEnvelopeKind({
      payload: {
        eventType: "support_message",
      },
      title: "客服消息",
    }),
    "message",
  );
  assert.equal(
    classifyNotificationEnvelopeKind({
      route: "/pages/orders/detail?id=1",
    }),
    "order",
  );
});

test("notification audio manager plays configured runtime audio through inner audio context", () => {
  const previousUni = globalThis.uni;
  const innerAudioCalls = [];

  globalThis.uni = {
    createInnerAudioContext() {
      return {
        stop() {
          innerAudioCalls.push("stop");
        },
        play() {
          innerAudioCalls.push("play");
        },
      };
    },
  };

  try {
    const manager = createUniNotificationAudioManager({
      cooldownMs: 0,
      defaultMessageSrc: "/static/audio/chat.mp3",
      resolveRuntimeSettings: () => ({
        messageSoundUrl: "/runtime/message.mp3",
      }),
    });

    const played = manager.playMessage();
    assert.equal(played, true);
    assert.deepEqual(innerAudioCalls, ["stop", "play"]);
  } finally {
    globalThis.uni = previousUni;
  }
});

test("notification audio manager binds bridge and resolves order sound events", () => {
  const previousUni = globalThis.uni;
  const events = [];
  const handlers = {};

  globalThis.uni = {
    createInnerAudioContext() {
      return {
        stop() {},
        play() {},
      };
    },
    $off(event) {
      events.push({ type: "off", event });
    },
    $on(event, handler) {
      handlers[event] = handler;
      events.push({ type: "on", event });
    },
  };

  try {
    const manager = createUniNotificationAudioManager({
      cooldownMs: 0,
      defaultMessageSrc: "/static/audio/chat.mp3",
      defaultOrderSrc: "/static/audio/order.mp3",
    });

    manager.bindBridge();
    handlers["realtime:notification"]({
      refreshTargets: ["orders"],
    });

    assert.deepEqual(events, [
      { type: "off", event: "realtime:notification" },
      { type: "off", event: "push:received" },
      { type: "on", event: "realtime:notification" },
      { type: "on", event: "push:received" },
    ]);
  } finally {
    globalThis.uni = previousUni;
  }
});
