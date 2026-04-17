import test from "node:test";
import assert from "node:assert/strict";

import createSocket from "./socket-io.js";

function createFakeUniSocket() {
  const handlers = {};
  const sent = [];
  return {
    handlers,
    sent,
    client: {
      onOpen(callback) {
        handlers.open = callback;
      },
      onMessage(callback) {
        handlers.message = callback;
      },
      onError(callback) {
        handlers.error = callback;
      },
      onClose(callback) {
        handlers.close = callback;
      },
      send(payload) {
        sent.push(payload);
      },
      close() {
        handlers.closed = true;
      },
    },
  };
}

test("socket io client builds ws url, authenticates and emits events", () => {
  const previousUni = globalThis.uni;
  const fakeSocket = createFakeUniSocket();
  const calls = [];

  globalThis.uni = {
    connectSocket(options) {
      calls.push(options);
      return fakeSocket.client;
    },
  };

  try {
    const socket = createSocket("https://example.com", "/support", "token-1").connect();
    let connected = 0;
    socket.on("connect", () => {
      connected += 1;
    });

    fakeSocket.handlers.open();
    assert.equal(calls[0].url, "wss://example.com/socket.io/?EIO=4&transport=websocket");
    assert.deepEqual(fakeSocket.sent[0], {
      data: '40/support,{"token":"token-1"}',
    });

    fakeSocket.handlers.message({ data: '40/support,{"sid":"ok"}' });
    assert.equal(connected, 1);

    socket.emit("join", { room: "room_1" });
    assert.deepEqual(fakeSocket.sent[1], {
      data: '42/support,["join",{"room":"room_1"}]',
    });
  } finally {
    globalThis.uni = previousUni;
  }
});

test("socket io client responds to ping, parses events and clears auth tokens on auth error", () => {
  const previousUni = globalThis.uni;
  const fakeSocket = createFakeUniSocket();
  const removedKeys = [];
  const payloads = [];

  globalThis.uni = {
    connectSocket() {
      return fakeSocket.client;
    },
    removeStorageSync(key) {
      removedKeys.push(key);
    },
  };

  try {
    const socket = createSocket("http://example.com", "notify").connect();
    socket.on("message", (payload) => {
      payloads.push(payload);
    });
    let authErrors = 0;
    socket.on("auth_error", () => {
      authErrors += 1;
    });

    fakeSocket.handlers.open();
    fakeSocket.handlers.message({ data: "2" });
    assert.deepEqual(fakeSocket.sent.at(-1), { data: "3" });

    fakeSocket.handlers.message({ data: '42/notify,["message",{"id":1}]' });
    assert.deepEqual(payloads, [{ id: 1 }]);

    fakeSocket.handlers.message({ data: "44/notify,{\"message\":\"denied\"}" });
    assert.equal(authErrors, 1);
    assert.deepEqual(removedKeys, ["socket_token", "socket_token_account_key"]);
  } finally {
    globalThis.uni = previousUni;
  }
});
