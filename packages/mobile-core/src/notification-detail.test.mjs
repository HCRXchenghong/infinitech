import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerNotificationAckPayload,
  CONSUMER_NOTIFICATION_READ_EVENT,
  createNotificationDetailPage,
  createDefaultConsumerNotificationArticle,
  DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
  normalizeConsumerNotificationArticle,
  normalizeConsumerNotificationDetailErrorMessage,
} from "./notification-detail.js";

function createPageInstance(page) {
  return {
    ...page.data(),
    ...page.methods,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

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

test("notification detail page loads article, acknowledges push and marks records read", async () => {
  const ackPayloads = [];
  const markReadIds = [];
  const emits = [];
  const previewUrls = [];
  let navigateBackCount = 0;
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    $emit(eventName, payload) {
      emits.push({ eventName, payload });
    },
    showToast() {},
    navigateBack() {
      navigateBackCount += 1;
    },
    previewImage({ urls }) {
      previewUrls.push(...urls);
    },
  };

  try {
    const page = createNotificationDetailPage({
      fetchNotificationDetail: async (id) => ({
        data: {
          id,
          title: "系统公告",
          time: "2026-04-16",
          content: "第一段",
          cover: "https://example.com/cover.png",
        },
      }),
      markNotificationRead: async (id) => {
        markReadIds.push(id);
      },
      ackPushMessage: async (payload) => {
        ackPayloads.push(payload);
      },
      parseNotificationDisplayBlocks: () => [{ type: "paragraph", text: "第一段" }],
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance, {
      id: "notice-1",
      messageId: "push-9",
    });
    await flushPromises();

    assert.equal(instance.loading, false);
    assert.equal(instance.article.title, "系统公告");
    assert.equal(instance.article.blocks.length, 1);
    assert.equal(instance.articleTitle(), "系统公告");

    instance.preview(instance.article.cover);
    instance.back();

    assert.equal(ackPayloads[0]?.messageId, "push-9");
    assert.deepEqual(markReadIds, ["notice-1"]);
    assert.deepEqual(emits, [
      {
        eventName: CONSUMER_NOTIFICATION_READ_EVENT,
        payload: { id: "notice-1" },
      },
    ]);
    assert.deepEqual(previewUrls, ["https://example.com/cover.png"]);
    assert.equal(navigateBackCount, 1);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
