import test from "node:test";
import assert from "node:assert/strict";

import {
  createSupportSocketService,
  createUniSupportSocketBridge,
} from "./support-socket.js";

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

test("support socket service queues messages and flushes after connect", () => {
  const fake = createFakeSocketFactory();
  const received = [];
  const service = createSupportSocketService({
    createSocket: fake.factory,
    socketUrl: "https://socket.example.com",
    emitMessage: (payload) => received.push(payload),
  });

  service.joinRoom("room_1");
  service.send("room_1", "hello");

  assert.deepEqual(fake.calls, [
    {
      url: "https://socket.example.com",
      namespace: "/support",
      token: "",
    },
  ]);
  assert.equal(service.getState().queueLength, 2);

  fake.instances[0].handlers.connect();
  assert.deepEqual(fake.instances[0].emitted, [
    { event: "join", payload: "room_1" },
    { event: "msg", payload: { room: "room_1", text: "hello" } },
  ]);

  fake.instances[0].handlers.msg({ id: 1 });
  assert.deepEqual(received, [{ id: 1 }]);
});

test("support socket service clears token on auth error and closes cleanly", () => {
  const fake = createFakeSocketFactory();
  const service = createSupportSocketService({
    createSocket: fake.factory,
    socketUrl: "https://socket.example.com",
  });

  service.connect("token_1");
  fake.instances[0].handlers.auth_error();
  service.connect();

  assert.equal(fake.calls[0].token, "token_1");
  assert.equal(fake.calls[1].token, "");

  service.close();
  assert.equal(fake.instances[1].disconnected, true);
  assert.equal(service.getState().queueLength, 0);
});

test("uni support socket bridge emits chat events through uni app", () => {
  const fake = createFakeSocketFactory();
  const events = [];
  const service = createUniSupportSocketBridge({
    createSocket: fake.factory,
    socketUrl: "https://socket.example.com",
    uniApp: {
      $emit(event, payload) {
        events.push({ event, payload });
      },
    },
  });

  service.connect();
  fake.instances[0].handlers.msg({ room: "room_2", text: "pong" });

  assert.deepEqual(events, [
    {
      event: "chat-message",
      payload: { room: "room_2", text: "pong" },
    },
  ]);
});
