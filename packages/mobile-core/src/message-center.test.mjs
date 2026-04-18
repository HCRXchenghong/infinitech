import test from "node:test";
import assert from "node:assert/strict";

import {
  appendConsumerNotificationRecords,
  buildConsumerMessageChatPageUrl,
  buildConsumerMessageNotificationSummary,
  buildConsumerNotificationPageResult,
  CONSUMER_NOTIFICATION_READ_EVENT,
  CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
  createMessageCenterPage,
  createNotificationListPage,
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

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  Object.entries(page.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });

  return instance;
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

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

test("message center page loads sessions, unread summary and navigation flows", async () => {
  const events = [];
  const navigateToUrls = [];
  const toasts = [];
  const markConversationReads = [];
  let clearConversationCount = 0;
  let clearNotificationCount = 0;
  const originalUni = globalThis.uni;

  globalThis.uni = {
    $on(eventName) {
      events.push(`on:${eventName}`);
    },
    $off(eventName) {
      events.push(`off:${eventName}`);
    },
    navigateTo({ url }) {
      navigateToUrls.push(url);
    },
    showToast(payload) {
      toasts.push(payload);
    },
  };

  try {
    const page = createMessageCenterPage({
      fetchConversations: async () => [
        {
          chatId: "room-1",
          role: "merchant",
          name: "店长",
          unread: 2,
          latest_at: "2026-04-16T10:30:00Z",
        },
        {
          chatId: "room-2",
          role: "cs",
          latest_at: "2026-04-16T08:00:00Z",
        },
      ],
      fetchNotificationList: async () => ({
        unread_count: 5,
        latest_at: "2026-04-16 10:20",
      }),
      markAllConversationsRead: async () => {
        clearConversationCount += 1;
      },
      markAllNotificationsRead: async () => {
        clearNotificationCount += 1;
      },
      markConversationRead: async (roomId) => {
        markConversationReads.push(roomId);
      },
      getCachedSupportRuntimeSettings: () => ({ title: "客服助手" }),
      loadSupportRuntimeSettings: async () => ({ title: "专属客服" }),
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance);
    page.onShow.call(instance);
    await flushPromises();

    assert.equal(instance.supportTitle, "专属客服");
    assert.equal(instance.sessions.length, 2);
    assert.equal(instance.notificationUnread, 5);
    assert.equal(instance.notificationTime, "10:20");

    instance.switchTab("shop");
    assert.equal(instance.filteredSessions.length, 1);

    await instance.openChat(instance.sessions[0]);
    assert.deepEqual(markConversationReads, ["room-1"]);
    assert.equal(navigateToUrls[0]?.includes("/pages/message/chat/index"), true);

    await instance.clearUnread();
    instance.goSettings();
    instance.goNotifications();
    page.onUnload.call(instance);

    assert.equal(clearConversationCount, 1);
    assert.equal(clearNotificationCount, 1);
    assert.equal(toasts.at(-1)?.title, "已清除未读");
    assert.equal(events.includes(`on:${CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT}`), true);
    assert.equal(events.includes(`off:${CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT}`), true);
    assert.deepEqual(navigateToUrls.slice(1), [
      "/pages/profile/settings/detail/index",
      "/pages/message/notification-list/index",
    ]);
  } finally {
    globalThis.uni = originalUni;
  }
});

test("notification list page refreshes, marks read and opens detail routes", async () => {
  const events = [];
  const navigateToUrls = [];
  let navigateBackCount = 0;
  const originalUni = globalThis.uni;

  globalThis.uni = {
    $on(eventName) {
      events.push(`on:${eventName}`);
    },
    $off(eventName) {
      events.push(`off:${eventName}`);
    },
    navigateTo({ url }) {
      navigateToUrls.push(url);
    },
    navigateBack() {
      navigateBackCount += 1;
    },
    showToast() {},
  };

  try {
    const page = createNotificationListPage({
      fetchNotificationList: async ({ page }) => ({
        data: page === 1
          ? [
              {
                id: "notice-1",
                title: "系统升级",
                summary: "今晚维护",
                created_at: "2026-04-16",
                is_read: false,
              },
            ]
          : [],
      }),
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance);
    await flushPromises();

    assert.equal(instance.notifications.length, 1);
    assert.equal(instance.page, 2);
    instance.handleNotificationRead({ id: "notice-1" });
    assert.equal(instance.notifications[0].is_read, true);
    instance.goDetail("notice-1");
    instance.back();
    page.onUnload.call(instance);

    assert.deepEqual(navigateToUrls, [
      "/pages/message/notification-detail/index?id=notice-1",
    ]);
    assert.equal(navigateBackCount, 1);
    assert.equal(events.includes(`on:${CONSUMER_NOTIFICATION_READ_EVENT}`), true);
  } finally {
    globalThis.uni = originalUni;
  }
});
