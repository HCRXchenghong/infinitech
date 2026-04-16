import test from "node:test";
import assert from "node:assert/strict";

import {
  createIncomingDisplayMessage,
  createOutgoingTempMessage,
  createSeenMessageTracker,
  formatMessageTime,
  getMessagePreview,
  isAdminSender,
  mapLoadedChats,
  mapLoadedMessages,
  normalizeChatId,
  resolveConversationTimestamp,
  resolveMessageId,
  resolveMessageTimestamp,
  sortChats,
} from "./chat-console-resources.js";

test("chat console resources keep id and tracker semantics stable", () => {
  assert.equal(normalizeChatId(42), "42");
  assert.equal(
    resolveMessageId({ chatId: "room-1", senderRole: "user", messageType: "text" }, 1000),
    "incoming_room-1_user_1000_text",
  );
  assert.equal(getMessagePreview({ messageType: "image" }), "[Image]");
  assert.equal(isAdminSender({ senderRole: "admin" }), true);
  assert.equal(isAdminSender({ senderId: "admin-7" }), true);
  assert.equal(isAdminSender({ senderRole: "user", senderId: "u-7" }), false);

  const tracker = createSeenMessageTracker(2);
  assert.equal(tracker.hasSeenMessage("room-1", "msg-1"), false);
  assert.equal(tracker.hasSeenMessage("room-1", "msg-1"), true);
  assert.equal(tracker.hasSeenMessage("room-1", "msg-2"), false);
  assert.equal(tracker.hasSeenMessage("room-1", "msg-3"), false);
  assert.equal(tracker.hasSeenMessage("room-1", "msg-1"), false);
});

test("chat console resources map chats and messages consistently", () => {
  const conversationTimestamp = resolveConversationTimestamp("2026-04-16 12:00:00", 0);
  assert.ok(conversationTimestamp > 0);
  const messageTimestamp = resolveMessageTimestamp("2026-04-16 12:01:00", 0);
  assert.ok(messageTimestamp > 0);
  assert.match(formatMessageTime(messageTimestamp), /^\d{2}:\d{2}$/);

  const chats = sortChats(
    mapLoadedChats([
      {
        id: "chat-2",
        name: " Bob ",
        unread: "2",
        updated_at: "2026-04-16 12:00:00",
      },
      {
        id: "chat-1",
        msg: " last ",
        timestamp: 10,
      },
    ]),
  );
  assert.deepEqual(
    chats.map((item) => ({ id: item.id, unread: item.unread, lastMessage: item.lastMessage })),
    [
      { id: "chat-2", unread: 2, lastMessage: "[No messages yet]" },
      { id: "chat-1", unread: 0, lastMessage: "last" },
    ],
  );

  const messages = mapLoadedMessages([
    {
      id: "m-1",
      sender: "客服",
      senderId: "admin-1",
      senderRole: "admin",
      content: "你好",
      createdAt: "2026-04-16 12:02:00",
      messageType: "text",
    },
  ]);
  assert.equal(messages[0].id, "m-1");
  assert.equal(messages[0].isSelf, true);
  assert.equal(messages[0].status, "sent");

  const outgoing = createOutgoingTempMessage({
    id: "temp-1",
    content: "已发送",
    type: "text",
    status: "sending",
  });
  assert.equal(outgoing.id, "temp-1");
  assert.equal(outgoing.isSelf, true);
  assert.equal(outgoing.status, "sending");

  const incoming = createIncomingDisplayMessage({
    chatId: "chat-9",
    sender: "用户A",
    senderId: "u-9",
    senderRole: "user",
    content: "收到",
    createdAt: "2026-04-16 12:03:00",
    messageType: "coupon",
  });
  assert.equal(incoming.isSelf, false);
  assert.equal(incoming.type, "coupon");
  assert.match(incoming.id, /^incoming_chat-9_user_/);
});
