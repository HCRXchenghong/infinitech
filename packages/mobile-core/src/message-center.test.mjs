import test from "node:test";
import assert from "node:assert/strict";

import {
  appendConsumerNotificationRecords,
  buildConsumerMessageChatPageUrl,
  buildConsumerMessageNotificationSummary,
  buildConsumerNotificationPageResult,
  CONSUMER_NOTIFICATION_READ_EVENT,
  CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
  createDefaultConsumerMessageTabs,
  DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
  filterConsumerMessageSessions,
  formatConsumerMessageClock,
  markConsumerNotificationRecordRead,
  normalizeConsumerMessageRole,
  normalizeConsumerMessageSession,
  normalizeConsumerMessageSessions,
  parseConsumerMessageTimestamp,
  resolveConsumerMessageSessionId,
} from "./message-center.js";

test("message center helpers expose stable tabs, events and time formatting", () => {
  const tabs = createDefaultConsumerMessageTabs();
  assert.equal(Array.isArray(tabs), true);
  assert.notEqual(tabs[0], createDefaultConsumerMessageTabs()[0]);
  assert.equal(CONSUMER_NOTIFICATION_READ_EVENT, "official-notification-read");
  assert.equal(
    CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
    "realtime:refresh:notifications",
  );
  assert.equal(normalizeConsumerMessageRole("merchant"), "shop");
  assert.equal(parseConsumerMessageTimestamp("2026-04-16T08:30:00Z") > 0, true);
  assert.equal(formatConsumerMessageClock("2026-04-16 09:45"), "09:45");
});

test("message center helpers normalize sessions and filters", () => {
  const now = Date.now();
  const session = normalizeConsumerMessageSession(
    {
      chatId: "room-1",
      role: "merchant",
      name: "",
      avatar: "",
      unread: "3",
      latest_at: "2026-04-16T10:30:00Z",
    },
    {
      supportTitle: "专属客服",
      ui: DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
    },
  );
  assert.equal(session.id, "room-1");
  assert.equal(session.role, "shop");
  assert.equal(session.name, "商家");
  assert.equal(session.tagClass, "tag-shop");
  assert.equal(resolveConsumerMessageSessionId({ targetId: "88" }, "cs", ""), "session_cs_88");
  assert.equal(
    filterConsumerMessageSessions([session], "shop").length,
    1,
  );
  assert.equal(
    normalizeConsumerMessageSessions(
      [
        { id: "1", roomId: "room-a", role: "cs", updatedAt: now - 1000 },
        { id: "2", roomId: "room-b", role: "rider", updatedAt: now },
      ],
      { supportTitle: "客服" },
    )[0].id,
    "2",
  );
});

test("message center helpers build notification summaries and chat urls", () => {
  assert.deepEqual(
    buildConsumerMessageNotificationSummary({
      success: true,
      unread_count: 6,
      latest_at: "2026-04-16 12:20",
    }),
    {
      unread: 6,
      time: "12:20",
    },
  );
  assert.equal(
    buildConsumerMessageChatPageUrl({
      roomId: "room-2",
      role: "cs",
      name: "在线客服",
      avatarUrl: "https://example.com/a.png",
      targetId: "7",
      orderId: "9",
    }),
    "/pages/message/chat/index?chatType=support&roomId=room-2&name=%E5%9C%A8%E7%BA%BF%E5%AE%A2%E6%9C%8D&role=cs&avatar=https%3A%2F%2Fexample.com%2Fa.png&targetId=7&orderId=9",
  );
});

test("message center helpers normalize notification pages and read state", () => {
  const page = buildConsumerNotificationPageResult(
    {
      success: true,
      data: [
        {
          id: 1,
          title: "系统升级",
          summary: "今晚维护",
          created_at: "2026-04-16",
          is_read: false,
        },
      ],
    },
    20,
  );
  assert.equal(page.items.length, 1);
  assert.equal(page.hasMore, false);
  assert.equal(
    appendConsumerNotificationRecords(page.items, [
      { id: 1, title: "系统升级", created_at: "2026-04-16" },
      { id: 2, title: "活动通知", created_at: "2026-04-17" },
    ]).length,
    2,
  );
  assert.equal(
    markConsumerNotificationRecordRead(page.items, "1")[0].is_read,
    true,
  );
});
