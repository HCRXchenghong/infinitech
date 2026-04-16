import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerNotificationAckPayload,
  CONSUMER_NOTIFICATION_READ_EVENT,
  createDefaultConsumerNotificationArticle,
  DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
  normalizeConsumerNotificationArticle,
  normalizeConsumerNotificationDetailErrorMessage,
} from "./notification-detail.js";

test("notification detail helpers expose stable defaults and events", () => {
  assert.equal(CONSUMER_NOTIFICATION_READ_EVENT, "official-notification-read");
  assert.deepEqual(createDefaultConsumerNotificationArticle(), {
    title: "",
    time: "",
    source: DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
    cover: "",
    blocks: [],
  });
  assert.deepEqual(
    buildConsumerNotificationAckPayload("msg-1", "2026-04-16T08:30:00.000Z"),
    {
      messageId: "msg-1",
      action: "opened",
      timestamp: "2026-04-16T08:30:00.000Z",
    },
  );
});

test("notification detail helpers normalize article payloads and errors", () => {
  assert.deepEqual(
    normalizeConsumerNotificationArticle(
      {
        data: {
          title: " 系统公告 ",
          time: "2026-04-16",
          source: "",
          cover: " https://example.com/cover.png ",
          content: "第一段",
        },
      },
      () => [{ type: "p", text: "第一段" }],
    ),
    {
      title: "系统公告",
      time: "2026-04-16",
      source: DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
      cover: "https://example.com/cover.png",
      blocks: [{ type: "p", text: "第一段" }],
    },
  );
  assert.equal(
    normalizeConsumerNotificationDetailErrorMessage(
      { error: "获取通知失败" },
      "加载失败",
    ),
    "获取通知失败",
  );
  assert.equal(
    normalizeConsumerNotificationDetailErrorMessage(null, "加载失败"),
    "加载失败",
  );
});
