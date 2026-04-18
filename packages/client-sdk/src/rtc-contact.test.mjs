import test from "node:test";
import assert from "node:assert/strict";

import {
  canUseRTCContact,
  createRTCContactHelper,
  createUniRTCContactBridge,
} from "./rtc-contact.js";

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

function createMockUniApp(initialStorage = {}, systemInfo = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const navigations = [];
  return {
    navigations,
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    getSystemInfoSync() {
      return { ...systemInfo };
    },
    navigateTo(payload) {
      navigations.push(payload);
    },
  };
}

test("canUseRTCContact blocks unsupported mini-program platforms", () => {
  assert.equal(canUseRTCContact({ platform: "h5" }), true);
  assert.equal(canUseRTCContact({ platform: "mp-weixin" }), false);
});

test("rtc contact helper starts a call and emits rtc_start_call through the connected session", async () => {
  const fake = createFakeSocketFactory();
  const createCallPayloads = [];
  const helper = createRTCContactHelper({
    platform: "h5",
    clientKind: "uni-user",
    createRTCCall(payload) {
      createCallPayloads.push(payload);
      return { call_id: "call_1" };
    },
    createSocket: fake.factory,
    socketUrl: "https://socket.example.com",
    getSocketToken: async () => "socket-token-1",
  });

  const result = await helper.startCall({
    calleeRole: "merchant",
    calleeId: "merchant_1",
  });

  assert.equal(createCallPayloads[0].clientKind, "uni-user");
  assert.deepEqual(fake.calls[0], {
    url: "https://socket.example.com",
    namespace: "/rtc",
    token: "socket-token-1",
  });
  assert.deepEqual(fake.instances[0].emitted[0], {
    event: "rtc_start_call",
    payload: {
      callId: "call_1",
      calleeRole: "merchant",
      calleeId: "merchant_1",
      calleePhone: "",
      conversationId: "",
      orderId: "",
      entryPoint: "",
      scene: "",
      clientPlatform: "h5",
      clientKind: "uni-user",
      metadata: undefined,
    },
  });
  assert.equal(result.callId, "call_1");
});

test("uni rtc contact bridge caches socket tokens and navigates incoming invites", async () => {
  const fake = createFakeSocketFactory();
  const uniApp = createMockUniApp(
    {
      token: "auth-token",
      authMode: "user",
    },
    {
      uniPlatform: "h5",
    },
  );
  let tokenRequests = 0;

  const bridge = createUniRTCContactBridge({
    uniApp,
    role: "user",
    authMode: "user",
    clientKind: "uni-user",
    resolveCurrentUserId: () => "user_1",
    requestSocketToken() {
      tokenRequests += 1;
      return {
        data: {
          token: "socket-token-9",
          userId: "user_1",
          role: "user",
        },
      };
    },
    getCachedRTCRuntimeSettings: () => ({ enabled: true }),
    loadRTCRuntimeSettings: async () => ({ enabled: true }),
    getRTCCall: async (callId) => ({ id: callId }),
    listRTCCallHistory: async () => [],
    createRTCCall: async () => ({ call_id: "call_9" }),
    updateRTCCallStatus: async () => ({ ok: true }),
    createSocket: fake.factory,
    getSocketUrl: () => "https://socket.example.com",
    readAuthorizationHeader: () => ({ Authorization: "Bearer auth-token" }),
    getCurrentPagesFn: () => [{ route: "pages/index/index", options: {} }],
  });

  assert.equal(bridge.canUseCurrentRTCContact(), true);
  assert.equal(await bridge.ensureSocketToken(), "socket-token-9");
  assert.equal(await bridge.ensureSocketToken(), "socket-token-9");
  assert.equal(tokenRequests, 1);
  assert.equal(uniApp.getStorageSync("socket_token"), "socket-token-9");
  assert.equal(uniApp.getStorageSync("socket_token_account_key"), "user:user_1");

  await bridge.ensureRTCInviteBridge();
  fake.instances[0].handlers.rtc_invite({
    call: {
      call_id: "call_9",
      callerRole: "merchant",
      callerId: "merchant_2",
      order_id: "order_7",
      conversation_id: "conv_3",
    },
  });

  assert.deepEqual(fake.calls[0], {
    url: "https://socket.example.com",
    namespace: "/rtc",
    token: "socket-token-9",
  });
  assert.equal(
    uniApp.navigations[0].url,
    "/pages/rtc/call/index?mode=incoming&callId=call_9&orderId=order_7&conversationId=conv_3&targetRole=merchant&targetId=merchant_2&targetName=Merchant",
  );

  fake.instances[0].handlers.auth_error({ message: "expired" });
  assert.equal(uniApp.getStorageSync("socket_token"), undefined);
  assert.equal(uniApp.getStorageSync("socket_token_account_key"), undefined);
});
