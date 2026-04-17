import test from "node:test";
import assert from "node:assert/strict";

import { createRealtimeNotifyBridge } from "./realtime-notify.js";

function createMockUniApp(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const emitted = [];
  const toasts = [];

  return {
    emitted,
    toasts,
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    $emit(event, payload) {
      emitted.push({ event, payload });
    },
    showToast(payload) {
      toasts.push(payload);
    },
  };
}

function createFakeSocketFactory() {
  const calls = [];
  const instances = [];

  function factory(url, namespace, token) {
    const handlers = {};
    const instance = {
      url,
      namespace,
      token,
      handlers,
      connect() {
        return instance;
      },
      on(event, callback) {
        handlers[event] = callback;
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

test("realtime notify bridge fetches token, connects, emits normalized envelopes, and dedupes repeats", async () => {
  const fake = createFakeSocketFactory();
  const uniApp = createMockUniApp();

  const bridge = createRealtimeNotifyBridge({
    uniApp,
    nowFn: () => 1000,
    resolveAuthIdentity: () => ({
      userId: "user_1",
      role: "user",
      authToken: "auth-token-1",
    }),
    requestSocketToken: async () => ({
      data: {
        code: "OK",
        data: {
          token: "socket-token-1",
          userId: "user_1",
          role: "user",
        },
      },
    }),
    getSocketURL: () => "https://socket.example.com",
    createSocket: fake.factory,
  });

  await bridge.connectCurrentRealtimeChannel();
  assert.deepEqual(fake.calls, [
    {
      url: "https://socket.example.com",
      namespace: "/notify",
      token: "socket-token-1",
    },
  ]);

  fake.instances[0].handlers.connect();
  fake.instances[0].handlers.business_notification({
    eventType: "order_updated",
    title: "订单状态有更新",
    content: "订单状态有更新，点击查看最新详情",
    route: "pages/order/detail?id=1",
    messageId: "msg_1",
    refreshTargets: ["Orders", "ORDERS"],
  });
  fake.instances[0].handlers.business_notification({
    eventType: "order_updated",
    title: "订单状态有更新",
    content: "订单状态有更新，点击查看最新详情",
    route: "pages/order/detail?id=1",
    messageId: "msg_1",
    refreshTargets: ["Orders", "ORDERS"],
  });

  assert.deepEqual(
    uniApp.emitted.map((item) => item.event),
    [
      "realtime:connected",
      "realtime:notification",
      "realtime:event:order_updated",
      "realtime:refresh:orders",
      "realtime:refresh:orders",
    ],
  );
  assert.equal(uniApp.emitted[1].payload.route, "/pages/order/detail?id=1");
  assert.equal(uniApp.toasts.length, 1);
});

test("realtime notify bridge clears cached token on auth error and reconnects with refresh", async () => {
  const fake = createFakeSocketFactory();
  const uniApp = createMockUniApp();
  const requestedTokens = [];
  const timers = [];

  const bridge = createRealtimeNotifyBridge({
    uniApp,
    resolveAuthIdentity: () => ({
      userId: "merchant_1",
      role: "merchant",
      authToken: "merchant-auth",
    }),
    requestSocketToken: async () => {
      const token = `socket-token-${requestedTokens.length + 1}`;
      requestedTokens.push(token);
      return {
        data: {
          data: {
            token,
            userId: "merchant_1",
            role: "merchant",
          },
        },
      };
    },
    getSocketURL: () => "https://socket.example.com",
    createSocket: fake.factory,
    setTimeoutFn(callback, delay) {
      const timer = {
        delay,
        async run() {
          await callback();
          await Promise.resolve();
        },
      };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn() {},
  });

  await bridge.connectCurrentRealtimeChannel();
  fake.instances[0].handlers.auth_error({ message: "expired" });

  assert.equal(uniApp.getStorageSync("socket_token"), undefined);
  assert.equal(uniApp.getStorageSync("socket_token_account_key"), undefined);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 3000);

  await timers[0].run();

  assert.deepEqual(requestedTokens, ["socket-token-1", "socket-token-2"]);
  assert.equal(fake.calls[1].token, "socket-token-2");
});

test("realtime notify bridge clears stale state when auth identity disappears", async () => {
  const uniApp = createMockUniApp({
    socket_token: "stale-token",
    socket_token_account_key: "user:user_9",
    realtime_notify_state: JSON.stringify({
      userId: "user_9",
      role: "user",
      connectedAt: 100,
    }),
  });

  const bridge = createRealtimeNotifyBridge({
    uniApp,
    resolveAuthIdentity: () => null,
    getSocketURL: () => "https://socket.example.com",
    createSocket() {
      throw new Error("should not create socket");
    },
  });

  await bridge.connectCurrentRealtimeChannel();

  assert.equal(uniApp.getStorageSync("socket_token"), undefined);
  assert.equal(uniApp.getStorageSync("socket_token_account_key"), undefined);
  assert.equal(uniApp.getStorageSync("realtime_notify_state"), undefined);
  assert.equal(uniApp.emitted[0].event, "realtime:disconnected");
});
