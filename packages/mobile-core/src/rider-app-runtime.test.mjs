import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderAppRuntime,
  extractRiderOrderList,
  normalizeRiderIncomingMessage,
  normalizeRiderOrderId,
  resolveRiderMessageTimestamp,
} from "./rider-app-runtime.js";

function instantiateRiderAppRuntime(component) {
  const instance = component.data ? component.data() : {};

  if (component.computed) {
    for (const [name, getter] of Object.entries(component.computed)) {
      Object.defineProperty(instance, name, {
        configurable: true,
        enumerable: true,
        get: getter.bind(instance),
      });
    }
  }

  if (component.methods) {
    for (const [name, handler] of Object.entries(component.methods)) {
      instance[name] = handler.bind(instance);
    }
  }

  if (typeof component.onLaunch === "function") {
    instance.onLaunch = component.onLaunch.bind(instance);
  }

  if (typeof component.onShow === "function") {
    instance.onShow = component.onShow.bind(instance);
  }

  if (typeof component.onHide === "function") {
    instance.onHide = component.onHide.bind(instance);
  }

  instance.watch = component.watch || {};
  return instance;
}

function createSocketFactory() {
  const sockets = [];

  function createSocket(url, namespace, token) {
    const handlers = {};
    const socket = {
      url,
      namespace,
      token,
      connected: false,
      emitted: [],
      disconnectCount: 0,
      connect() {
        return this;
      },
      on(event, callback) {
        handlers[event] = callback;
        return this;
      },
      emit(event, payload) {
        this.emitted.push({ event, payload });
        return this;
      },
      disconnect() {
        this.disconnectCount += 1;
        this.connected = false;
        if (handlers.disconnect) {
          handlers.disconnect();
        }
      },
      trigger(event, payload) {
        if (event === "connect") {
          this.connected = true;
        }
        if (event === "disconnect") {
          this.connected = false;
        }
        if (handlers[event]) {
          handlers[event](payload);
        }
      },
    };

    sockets.push(socket);
    return socket;
  }

  return {
    sockets,
    createSocket,
  };
}

test("rider app runtime normalizes incoming payload helpers and order helpers", () => {
  const timestamp = resolveRiderMessageTimestamp("2026-04-25T12:00:00Z");
  assert.equal(timestamp, Date.parse("2026-04-25T12:00:00Z"));

  const normalizedMessage = normalizeRiderIncomingMessage(
    {
      merchantId: 9,
      merchantName: "商家A",
      content: "订单已出餐",
      createdAt: "2026-04-25T12:00:00Z",
    },
    "merchant",
    "商家",
  );
  assert.equal(normalizedMessage.sender, "商家A");
  assert.equal(normalizedMessage.senderId, "9");
  assert.equal(normalizedMessage.chatId, "merchant_");
  assert.equal(normalizedMessage.timestamp, Date.parse("2026-04-25T12:00:00Z"));

  assert.deepEqual(
    extractRiderOrderList({
      data: {
        orders: [{ id: "o-1" }],
      },
    }),
    [{ id: "o-1" }],
  );
  assert.equal(normalizeRiderOrderId({ order_id: "daily-1" }), "daily-1");
  assert.equal(normalizeRiderOrderId(null), "");
});

test("rider app runtime clears push state when session is unauthenticated", async () => {
  let clearPushRegistrationStateCalls = 0;
  let resolveSocketAccessTokenCalls = 0;

  const runtime = createRiderAppRuntime({
    readSession() {
      return { isAuthenticated: false };
    },
    clearPushRegistrationState() {
      clearPushRegistrationStateCalls += 1;
    },
    resolveSocketAccessToken() {
      resolveSocketAccessTokenCalls += 1;
      return "unexpected";
    },
    createSocket() {
      throw new Error("should not create socket");
    },
  });
  const app = instantiateRiderAppRuntime(runtime);

  await app.tryConnectSocket();

  assert.equal(clearPushRegistrationStateCalls, 1);
  assert.equal(resolveSocketAccessTokenCalls, 0);
});

test("rider app runtime connects support and rider sockets, joins rooms, and forwards messages", async () => {
  const emittedEvents = [];
  const handledMessages = [];
  let realtimeConnectCalls = 0;
  const socketFactory = createSocketFactory();

  const runtime = createRiderAppRuntime({
    riderOrderStore: { isOnline: true },
    uniApp: {
      $emit(eventName, payload) {
        emittedEvents.push({ eventName, payload });
      },
    },
    readSession() {
      return { isAuthenticated: true, token: "auth-token" };
    },
    readAuthIdentity() {
      return { riderId: "rider-1" };
    },
    resolveSocketAccessToken() {
      return "socket-access-token";
    },
    connectCurrentRealtimeChannel() {
      realtimeConnectCalls += 1;
    },
    fetchRiderOrders() {
      return [{ id: "order-1" }, { orderId: "order-2" }];
    },
    messageManager: {
      handleNewMessage(payload) {
        handledMessages.push(payload);
      },
    },
    createSocket: socketFactory.createSocket,
    socketUrl: "https://socket.example.com",
    heartbeatRiderStatus() {
      return null;
    },
  });
  const app = instantiateRiderAppRuntime(runtime);

  await app.tryConnectSocket();
  assert.equal(realtimeConnectCalls, 1);
  assert.equal(socketFactory.sockets.length, 2);
  assert.equal(socketFactory.sockets[0].namespace, "/support");
  assert.equal(socketFactory.sockets[1].namespace, "/rider");

  socketFactory.sockets[0].trigger("connect");
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(app.isConnected, true);
  assert.deepEqual(
    socketFactory.sockets[0].emitted.map((entry) => entry.event),
    ["join_chat", "join_chat", "join_chat", "join_chat", "join_chat"],
  );
  assert.deepEqual(socketFactory.sockets[0].emitted[0], {
    event: "join_chat",
    payload: {
      chatId: "rider-1",
      userId: "rider-1",
      role: "rider",
    },
  });
  assert.deepEqual(
    socketFactory.sockets[0].emitted.slice(1).map((entry) => entry.payload.chatId),
    ["rider_order-1", "rs_order-1", "rider_order-2", "rs_order-2"],
  );

  socketFactory.sockets[0].trigger("new_message", {
    senderId: "admin-1",
    senderRole: "admin",
    chatId: "rider-1",
    content: "请尽快联系用户",
  });
  assert.equal(handledMessages.length, 1);
  assert.equal(handledMessages[0].senderRole, "admin");
  assert.equal(handledMessages[0].chatId, "rider-1");

  socketFactory.sockets[1].trigger("connect");
  assert.equal(app.isRiderSocketConnected, true);
  assert.deepEqual(socketFactory.sockets[1].emitted[0], {
    event: "join_rider",
    payload: { riderId: "rider-1" },
  });

  socketFactory.sockets[1].trigger("merchant_message", {
    merchantId: "merchant-9",
    merchantName: "商家B",
    content: "订单已打包",
  });
  assert.equal(handledMessages.length, 2);
  assert.equal(handledMessages[1].senderRole, "merchant");
  assert.equal(handledMessages[1].sender, "商家B");

  assert.equal(
    emittedEvents.some(
      (entry) => entry.eventName === "socket:connected" && entry.payload?.namespace === "support",
    ),
    true,
  );
  assert.equal(
    emittedEvents.some((entry) => entry.eventName === "socket:new_message"),
    true,
  );
});

test("rider app runtime reconnects only the missing rider socket when support channel is already connected", async () => {
  const socketFactory = createSocketFactory();

  const runtime = createRiderAppRuntime({
    readSession() {
      return { isAuthenticated: true, token: "auth-token" };
    },
    readAuthIdentity() {
      return { riderId: "rider-2" };
    },
    resolveSocketAccessToken() {
      return "socket-access-token";
    },
    createSocket: socketFactory.createSocket,
    socketUrl: "https://socket.example.com",
  });
  const app = instantiateRiderAppRuntime(runtime);

  await app.tryConnectSocket();
  assert.equal(socketFactory.sockets.length, 2);

  socketFactory.sockets[0].trigger("connect");
  app.riderSocket.connected = false;

  await app.tryConnectSocket();

  assert.equal(socketFactory.sockets.length, 3);
  assert.equal(socketFactory.sockets[2].namespace, "/rider");
  assert.equal(socketFactory.sockets[0].disconnectCount, 0);
});
