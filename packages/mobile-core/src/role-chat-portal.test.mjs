import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleChatConversationPayload,
  buildRoleChatOutgoingPayload,
  createRoleChatLocalMessageId,
  formatRoleChatClockTime,
  formatRoleChatOrderAmount,
  formatRoleChatOrderNo,
  getRoleChatOrderStatusText,
  normalizeRoleChatOrder,
  normalizeRoleChatRole,
  resolveRoleChatMessageId,
  resolveRoleChatMessageTimestamp,
  safeDecodeRoleChatValue,
} from "./role-chat-portal.js";

test("role chat helpers decode values and normalize roles", () => {
  assert.equal(safeDecodeRoleChatValue("%E5%B9%B3%E5%8F%B0%E5%AE%A2%E6%9C%8D"), "平台客服");
  assert.equal(safeDecodeRoleChatValue("%E0%A4%A"), "%E0%A4%A");
  assert.equal(
    normalizeRoleChatRole("support", {
      allowedRoles: ["user", "rider", "admin"],
    }),
    "admin",
  );
  assert.equal(
    normalizeRoleChatRole("merchant", {
      allowedRoles: ["user", "rider", "admin"],
      defaultRole: "user",
    }),
    "user",
  );
});

test("role chat helpers normalize timestamps and deterministic ids", () => {
  const timestamp = resolveRoleChatMessageTimestamp(123456, 0);
  assert.match(formatRoleChatClockTime(timestamp), /^\d{2}:\d{2}$/);
  assert.equal(
    resolveRoleChatMessageId(
      {
        senderRole: "merchant",
        senderId: "m-1",
        messageType: "text",
        content: "  hello world  ",
        timestamp,
      },
      "history_chat-1",
    ),
    "history_chat-1_merchant_m-1_text_123456_hello_world",
  );
  assert.equal(
    resolveRoleChatMessageId({ mid: "message-1" }, "history_chat-1"),
    "message-1",
  );
});

test("role chat helpers create local ids and normalize conversation payloads", () => {
  assert.deepEqual(
    createRoleChatLocalMessageId({
      chatId: "room-1",
      prefix: "send",
      timestamp: 123456,
      seed: 3,
    }),
    {
      id: "send_room-1_123456_4",
      seed: 4,
      timestamp: 123456,
    },
  );

  assert.deepEqual(
    buildRoleChatConversationPayload({
      chatId: "room-1",
      targetType: "admin",
      role: "support",
      targetName: "平台客服",
      targetAvatar: "/static/logo.png",
      targetOrderId: "order-1",
    }),
    {
      chatId: "room-1",
      targetType: "admin",
      targetId: "support",
      targetPhone: "",
      targetName: "平台客服",
      targetAvatar: "/static/logo.png",
      targetOrderId: "order-1",
    },
  );

  assert.deepEqual(
    buildRoleChatOutgoingPayload({
      chatId: "room-1",
      targetType: "user",
      role: "user",
      targetId: "user-1",
      targetName: "顾客会话",
      senderId: "merchant-1",
      senderRole: "merchant",
      sender: "门店A",
      avatar: "https://example.com/a.png",
      messageType: "text",
      content: "hello",
      tempId: "local-1",
      extraFields: {
        type: "support",
      },
    }),
    {
      chatId: "room-1",
      targetType: "user",
      targetId: "user-1",
      targetPhone: "",
      targetName: "顾客会话",
      targetAvatar: "",
      senderId: "merchant-1",
      senderRole: "merchant",
      sender: "门店A",
      avatar: "https://example.com/a.png",
      messageType: "text",
      content: "hello",
      tempId: "local-1",
      type: "support",
    },
  );
});

test("role chat helpers normalize order presentation", () => {
  const order = normalizeRoleChatOrder({
    daily_order_id: "daily-1",
    delivery_fee: "12.3",
    food_shop: "商家A",
    status: "accepted",
  });

  assert.deepEqual(order, {
    daily_order_id: "daily-1",
    delivery_fee: "12.3",
    food_shop: "商家A",
    status: "accepted",
    id: "daily-1",
    orderNo: "daily-1",
    amount: 12.3,
    shopName: "商家A",
    statusText: "",
  });
  assert.equal(formatRoleChatOrderNo(order), "daily-1");
  assert.equal(formatRoleChatOrderAmount(order), "12.30");
  assert.equal(getRoleChatOrderStatusText(order), "已接单");
});
