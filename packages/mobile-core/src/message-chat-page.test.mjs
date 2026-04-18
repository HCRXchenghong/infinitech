import test from "node:test";
import assert from "node:assert/strict";

import { createMessageChatPage } from "./message-chat-page.js";

function createPageInstance(page) {
  return {
    ...page.data(),
    ...page.methods,
    $nextTick(callback) {
      if (typeof callback === "function") {
        callback();
      }
    },
  };
}

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

test("message chat page normalizes rich message history and emits shared chat payloads", () => {
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;
  const storage = new Map();
  const socketEmits = [];

  globalThis.setTimeout = () => 0;
  globalThis.uni = {
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    showToast() {},
  };

  try {
    const page = createMessageChatPage({
      config: { SOCKET_URL: "https://socket.example.com" },
      fetchHistory: async () => [],
      markConversationRead: async () => {},
      readAuthorizationHeader: () => ({ Authorization: "Bearer token" }),
      reverseGeocode: async () => ({ address: "人民广场" }),
      uploadCommonAsset: async () => ({}),
      upsertConversation: async () => {},
      pickFirstDefined,
      playMessageNotificationSound: () => {},
      getCachedSupportRuntimeSettings: () => ({ title: "在线客服" }),
      loadSupportRuntimeSettings: async () => ({ title: "在线客服" }),
    });

    const instance = createPageInstance(page);
    instance.userId = "user-1";
    instance.userName = "测试用户";
    instance.userAvatar = "https://example.com/me.png";
    instance.roomId = "room-1";
    instance.targetId = "support";
    instance.role = "cs";
    instance.title = "在线客服";
    instance.isConnected = true;
    instance.socket = {
      emit(event, payload) {
        socketEmits.push({ event, payload });
      },
    };

    const history = instance.normalizeHistoryMessages([
      {
        id: "loc-1",
        senderId: "support-1",
        senderRole: "admin",
        messageType: "location",
        content: JSON.stringify({
          address: "人民广场",
          latitude: 31.2304,
          longitude: 121.4737,
        }),
        createdAt: "2026-04-18T10:00:00Z",
      },
      {
        id: "audio-1",
        senderId: "user-1",
        senderRole: "user",
        messageType: "audio",
        content: JSON.stringify({
          url: "https://example.com/audio.aac",
          durationSeconds: 9,
        }),
        createdAt: "2026-04-18T10:01:00Z",
      },
    ]);

    assert.equal(history[0].type, "location");
    assert.equal(history[0].meta.address, "人民广场");
    assert.equal(history[1].from, "me");
    assert.equal(history[1].type, "audio");
    assert.equal(history[1].meta.durationLabel, '9"');

    assert.equal(instance.emitChatMessage("text", "你好"), true);
    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "send_message");
    assert.equal(socketEmits[0].payload.chatId, "room-1");
    assert.equal(socketEmits[0].payload.targetType, "admin");
    assert.equal(socketEmits[0].payload.targetId, "support");
    assert.equal(instance.messages.length, 1);
    assert.equal(instance.messages[0].text, "你好");
    assert.equal(
      typeof storage.get("user_chat_messages_user-1_room-1"),
      "string",
    );
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
