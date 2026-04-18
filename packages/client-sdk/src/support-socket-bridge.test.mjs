import test from "node:test";
import assert from "node:assert/strict";

import { createConfiguredSupportSocketBridge } from "./support-socket-bridge.js";

function createFakeSocketFactory() {
  const calls = [];
  const instances = [];

  function factory(url, namespace, token) {
    const handlers = {};
    const emitted = [];
    const instance = {
      url,
      namespace,
      token,
      handlers,
      emitted,
      connect() {
        return instance;
      },
      on(event, callback) {
        handlers[event] = callback;
      },
      emit(event, payload) {
        emitted.push({ event, payload });
      },
      disconnect() {
        instance.disconnected = true;
      },
    };
    calls.push({ url, namespace, token });
    instances.push(instance);
    return instance;
  }

  return { factory, calls, instances };
}

test("configured support socket bridge uses config socket url and default namespace", () => {
  const fake = createFakeSocketFactory();
  const events = [];
  const bridge = createConfiguredSupportSocketBridge({
    createSocket: fake.factory,
    config: {
      SOCKET_URL: "https://socket.example.com",
    },
    uniApp: {
      $emit(event, payload) {
        events.push({ event, payload });
      },
    },
  });

  bridge.connect("token_1");

  assert.deepEqual(fake.calls, [
    {
      url: "https://socket.example.com",
      namespace: "/support",
      token: "token_1",
    },
  ]);

  fake.instances[0].handlers.msg({ room: "room_1", text: "hello" });

  assert.deepEqual(events, [
    {
      event: "chat-message",
      payload: { room: "room_1", text: "hello" },
    },
  ]);
});

test("configured support socket bridge lets explicit socket options override config", () => {
  const fake = createFakeSocketFactory();
  const bridge = createConfiguredSupportSocketBridge({
    createSocket: fake.factory,
    config: {
      SOCKET_URL: "https://socket.example.com",
    },
    socketUrl: "https://override.example.com",
    namespace: "/ops",
    messageEventName: "ops-message",
    uniApp: {
      $emit() {},
    },
  });

  bridge.joinRoom("ops_room");

  assert.deepEqual(fake.calls, [
    {
      url: "https://override.example.com",
      namespace: "/ops",
      token: "",
    },
  ]);
});
