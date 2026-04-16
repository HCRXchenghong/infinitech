import {
  appendConsumerNotificationRecords,
  buildConsumerMessageChatPageUrl,
  buildConsumerMessageNotificationSummary,
  buildConsumerNotificationPageResult,
  CONSUMER_NOTIFICATION_READ_EVENT,
  CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
  createDefaultConsumerMessageTabs,
  DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
  DEFAULT_CONSUMER_NOTIFICATION_PAGE_SIZE,
  filterConsumerMessageSessions,
  markConsumerNotificationRecordRead,
  normalizeConsumerMessageSessions,
} from "../../packages/mobile-core/src/message-center.js";

function resolveSupportRuntimeTitle(runtime, fallback) {
  const title = String(runtime?.title || "").trim();
  return title || fallback;
}

export function createMessageCenterPage({
  fetchConversations = async () => [],
  fetchNotificationList = async () => ({}),
  markAllConversationsRead = async () => undefined,
  markAllNotificationsRead = async () => undefined,
  markConversationRead = async () => undefined,
  getCachedSupportRuntimeSettings = () => ({}),
  loadSupportRuntimeSettings = async () => ({}),
} = {}) {
  return {
    data() {
      const ui = DEFAULT_CONSUMER_MESSAGE_CENTER_UI;
      const supportRuntime = getCachedSupportRuntimeSettings();
      return {
        ui,
        currentTab: "all",
        tabs: createDefaultConsumerMessageTabs(),
        notificationTime: ui.noNotification,
        notificationUnread: 0,
        sessions: [],
        supportTitle: resolveSupportRuntimeTitle(supportRuntime, ui.roleSupport),
        hasLoadedServerSessions: false,
      };
    },
    computed: {
      filteredSessions() {
        return filterConsumerMessageSessions(this.sessions, this.currentTab);
      },
      showEmptyState() {
        return (
          this.filteredSessions.length === 0 &&
          this.currentTab !== "all" &&
          this.currentTab !== "notification"
        );
      },
      showFooter() {
        return (
          this.filteredSessions.length > 0 ||
          this.currentTab === "all" ||
          this.currentTab === "notification"
        );
      },
    },
    onLoad() {
      uni.$off(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
      uni.$on(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
    },
    onShow() {
      void this.initializePage();
    },
    onUnload() {
      uni.$off(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
    },
    methods: {
      async initializePage() {
        await this.loadSupportRuntimeConfig();
        await Promise.all([this.loadSessions(), this.loadNotificationSummary()]);
      },
      handleRealtimeNotificationRefresh() {
        void this.loadNotificationSummary();
      },
      async loadSupportRuntimeConfig() {
        try {
          const supportRuntime = await loadSupportRuntimeSettings();
          this.supportTitle = resolveSupportRuntimeTitle(
            supportRuntime,
            this.ui.roleSupport,
          );
        } catch (_error) {
          this.supportTitle = resolveSupportRuntimeTitle(
            getCachedSupportRuntimeSettings(),
            this.ui.roleSupport,
          );
        }
      },
      async loadSessions() {
        try {
          const response = await fetchConversations();
          this.sessions = normalizeConsumerMessageSessions(response, {
            supportTitle: this.supportTitle,
            ui: this.ui,
          });
          this.hasLoadedServerSessions = true;
        } catch (error) {
          console.error("Failed to load server conversations:", error);
          if (!this.hasLoadedServerSessions) {
            this.sessions = [];
          }
        }
      },
      async loadNotificationSummary() {
        try {
          const response = await fetchNotificationList({ page: 1, pageSize: 1 });
          const summary = buildConsumerMessageNotificationSummary(
            response,
            this.ui,
          );
          this.notificationUnread = summary.unread;
          this.notificationTime = summary.time;
        } catch (error) {
          console.error("Failed to load notification summary:", error);
        }
      },
      switchTab(tabId) {
        this.currentTab = tabId;
      },
      async openChat(item) {
        let readSynced = false;
        try {
          await markConversationRead(item.roomId || item.id);
          readSynced = true;
        } catch (error) {
          console.error("Failed to sync conversation read state:", error);
        }

        if (readSynced) {
          await this.loadSessions();
        }

        uni.navigateTo({
          url: buildConsumerMessageChatPageUrl(item),
        });
      },
      async clearUnread() {
        const results = await Promise.allSettled([
          markAllConversationsRead(),
          markAllNotificationsRead(),
        ]);

        await Promise.all([this.loadSessions(), this.loadNotificationSummary()]);
        const hasSuccess = results.some((item) => item.status === "fulfilled");
        uni.showToast({
          title: hasSuccess
            ? this.ui.clearUnreadSuccess
            : this.ui.clearUnreadFailure,
          icon: "none",
        });
      },
      goSettings() {
        uni.navigateTo({ url: "/pages/profile/settings/detail/index" });
      },
      goNotifications() {
        uni.navigateTo({ url: "/pages/message/notification-list/index" });
      },
    },
  };
}

export function createNotificationListPage({
  fetchNotificationList = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        notifications: [],
        loading: false,
        page: 1,
        pageSize: DEFAULT_CONSUMER_NOTIFICATION_PAGE_SIZE,
        hasMore: true,
      };
    },
    onLoad() {
      uni.$on(CONSUMER_NOTIFICATION_READ_EVENT, this.handleNotificationRead);
      uni.$off(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
      uni.$on(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
      void this.refreshNotifications();
    },
    onUnload() {
      uni.$off(CONSUMER_NOTIFICATION_READ_EVENT, this.handleNotificationRead);
      uni.$off(
        CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT,
        this.handleRealtimeNotificationRefresh,
      );
    },
    methods: {
      async refreshNotifications() {
        this.notifications = [];
        this.page = 1;
        this.hasMore = true;
        await this.loadNotifications();
      },
      async loadNotifications() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        try {
          const response = await fetchNotificationList({
            page: this.page,
            pageSize: this.pageSize,
          });
          const nextPage = buildConsumerNotificationPageResult(
            response,
            this.pageSize,
          );
          this.notifications = appendConsumerNotificationRecords(
            this.notifications,
            nextPage.items,
          );
          this.hasMore = nextPage.hasMore;
          if (nextPage.items.length > 0) {
            this.page += 1;
          }
        } catch (error) {
          console.error("加载通知失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleNotificationRead(payload = {}) {
        this.notifications = markConsumerNotificationRecordRead(
          this.notifications,
          payload.id,
        );
      },
      handleRealtimeNotificationRefresh() {
        void this.refreshNotifications();
      },
      loadMore() {
        void this.loadNotifications();
      },
      goDetail(id) {
        uni.navigateTo({
          url: `/pages/message/notification-detail/index?id=${id}`,
        });
      },
      back() {
        uni.navigateBack();
      },
    },
  };
}
