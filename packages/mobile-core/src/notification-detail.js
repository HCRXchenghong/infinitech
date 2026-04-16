import { extractEnvelopeData, extractErrorMessage } from "../../contracts/src/http.js";
import {
  CONSUMER_NOTIFICATION_READ_EVENT,
  DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
} from "./message-center.js";

function trimNotificationDetailText(value) {
  return String(value || "").trim();
}

export const DEFAULT_CONSUMER_NOTIFICATION_DETAIL_TITLE = "通知详情";

export function createDefaultConsumerNotificationArticle() {
  return {
    title: "",
    time: "",
    source: DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
    cover: "",
    blocks: [],
  };
}

export function buildConsumerNotificationAckPayload(messageId, now = new Date()) {
  return {
    messageId: trimNotificationDetailText(messageId),
    action: "opened",
    timestamp: new Date(now).toISOString(),
  };
}

export function normalizeConsumerNotificationArticle(
  payload,
  parseNotificationDisplayBlocks = () => [],
) {
  const data = extractEnvelopeData(payload);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const blocks = parseNotificationDisplayBlocks(data.content);

  return {
    title: trimNotificationDetailText(data.title),
    time: trimNotificationDetailText(data.time),
    source:
      trimNotificationDetailText(data.source) ||
      DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
    cover: trimNotificationDetailText(data.cover),
    blocks: Array.isArray(blocks) ? blocks : [],
  };
}

export function normalizeConsumerNotificationDetailErrorMessage(
  payload,
  fallback = "加载失败，请检查网络",
) {
  return extractErrorMessage(payload, fallback);
}

export {
  CONSUMER_NOTIFICATION_READ_EVENT,
  DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
};
