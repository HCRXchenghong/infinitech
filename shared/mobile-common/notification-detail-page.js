import {
  buildConsumerNotificationAckPayload,
  CONSUMER_NOTIFICATION_READ_EVENT,
  createDefaultConsumerNotificationArticle,
  DEFAULT_CONSUMER_NOTIFICATION_DETAIL_TITLE,
  normalizeConsumerNotificationArticle,
  normalizeConsumerNotificationDetailErrorMessage,
} from "../../packages/mobile-core/src/notification-detail.js";

function navigateBackWithDelay(delay = 1500) {
  setTimeout(() => {
    uni.navigateBack();
  }, delay);
}

export function createNotificationDetailPage({
  fetchNotificationDetail = async () => ({}),
  markNotificationRead = async () => undefined,
  ackPushMessage = async () => undefined,
  parseNotificationDisplayBlocks = () => [],
} = {}) {
  return {
    data() {
      return {
        loading: true,
        article: createDefaultConsumerNotificationArticle(),
      };
    },
    onLoad(options = {}) {
      const id = String(options.id || "").trim();
      const messageId = String(options.messageId || "").trim();
      if (messageId) {
        void this.ackPushOpened(messageId);
      }
      if (id) {
        void this.loadNotification(id);
        return;
      }

      uni.showToast({ title: "缺少通知ID", icon: "none" });
      navigateBackWithDelay();
    },
    methods: {
      async ackPushOpened(messageId) {
        try {
          await ackPushMessage(buildConsumerNotificationAckPayload(messageId));
        } catch (error) {
          console.error("推送打开回执失败:", error);
        }
      },
      async loadNotification(id) {
        this.loading = true;
        try {
          const response = await fetchNotificationDetail(id);
          const article = normalizeConsumerNotificationArticle(
            response,
            parseNotificationDisplayBlocks,
          );
          if (article) {
            this.article = article;
            void this.markAsRead(id);
            return;
          }

          uni.showToast({
            title: normalizeConsumerNotificationDetailErrorMessage(
              response,
              "获取通知失败",
            ),
            icon: "none",
          });
          navigateBackWithDelay();
        } catch (error) {
          console.error("加载通知失败:", error);
          uni.showToast({
            title: normalizeConsumerNotificationDetailErrorMessage(error),
            icon: "none",
          });
          navigateBackWithDelay();
        } finally {
          this.loading = false;
        }
      },
      async markAsRead(id) {
        try {
          await markNotificationRead(id);
          uni.$emit(CONSUMER_NOTIFICATION_READ_EVENT, { id: String(id) });
        } catch (error) {
          console.error("标记通知已读失败:", error);
        }
      },
      back() {
        uni.navigateBack();
      },
      preview(url) {
        if (!url) return;
        uni.previewImage({ urls: [url] });
      },
      articleTitle() {
        return this.article.title || DEFAULT_CONSUMER_NOTIFICATION_DETAIL_TITLE;
      },
    },
  };
}
