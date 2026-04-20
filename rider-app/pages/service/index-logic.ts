import Vue from "vue";
import { resolveUploadAssetUrl } from "../../../packages/contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../../packages/contracts/src/upload.js";
import {
  fetchHistory,
  markConversationRead,
  upsertConversation,
  uploadImage,
} from "@/shared-ui/api";
import { readRiderAuthIdentity } from "@/shared-ui/auth-session.js";
import { loadSupportRuntimeSettings } from "@/shared-ui/support-runtime";
import { serviceDataMethods } from "./service-data-methods";
import { db } from "@/utils/database";
import messageManager from "@/utils/message-manager";
import OrderDetailPopup from "../../components/OrderDetailPopup.vue";

const DEFAULT_SUPPORT_CHAT_ID = "rider_default";
const SEND_TIMEOUT_MS = 5000;

function formatClockTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default Vue.extend({
  components: {
    OrderDetailPopup,
  },
  data() {
    return {
      statusBarHeight: 44,
      inputText: "",
      messages: [] as any[],
      scrollToView: "",
      riderId: "",
      riderName: "骑手",
      avatarUrl: "",
      chatId: DEFAULT_SUPPORT_CHAT_ID,
      targetId: "",
      orderId: "",
      chatRole: "admin",
      supportChatTitle: "平台客服",
      chatTitle: "平台客服",
      otherAvatar: "/static/images/logo.png",
      showOrderPicker: false,
      showMenu: false,
      recentOrders: [] as any[],
      showOrderDetailPopup: false,
      currentOrderDetail: null as any,
      localMessageSeed: 0,
      dbReady: false,
    };
  },
  onLoad(options: any = {}) {
    const systemInfo = uni.getSystemInfoSync();
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    const riderAuth = readRiderAuthIdentity({ uniApp: uni });
    if (riderAuth.riderId) {
      this.riderId = riderAuth.riderId;
      this.chatId = this.riderId;
    }

    const queryChatId = options.chatId || options.id;
    if (
      queryChatId !== undefined &&
      queryChatId !== null &&
      queryChatId !== ""
    ) {
      this.chatId = String(queryChatId).trim();
    }

    const queryTargetId = options.targetId || options.peerId;
    if (
      queryTargetId !== undefined &&
      queryTargetId !== null &&
      queryTargetId !== ""
    ) {
      this.targetId = this.safeDecode(queryTargetId);
    }

    const queryOrderId = options.orderId || options.order_id;
    if (
      queryOrderId !== undefined &&
      queryOrderId !== null &&
      queryOrderId !== ""
    ) {
      this.orderId = this.safeDecode(queryOrderId);
    }

    if (!this.chatId) {
      this.chatId = this.riderId || DEFAULT_SUPPORT_CHAT_ID;
    }

    const queryRole = options.role ? String(options.role).toLowerCase() : "";
    this.chatRole = queryRole || this.inferRoleByChatId(this.chatId);

    const queryName = options.name ? this.safeDecode(options.name) : "";
    this.chatTitle = queryName || this.inferTitleByRole(this.chatRole);
    this.otherAvatar = options.avatar
      ? this.safeDecode(options.avatar)
      : this.defaultAvatarByRole(this.chatRole);

    if (riderAuth.riderName) {
      this.riderName = riderAuth.riderName;
    }

    if (riderAuth.profile) {
      if (riderAuth.profile.avatar) this.avatarUrl = riderAuth.profile.avatar;
      if (!riderAuth.riderName && (riderAuth.profile.name || riderAuth.profile.nickname)) {
        this.riderName = riderAuth.profile.name || riderAuth.profile.nickname;
      }
    }

    this.loadRecentOrders();
    this.bindSocketEvents();

    Promise.resolve(this.loadSupportRuntimeConfig(!queryName)).finally(
      async () => {
        await this.initDatabase();
        await this.ensureConversationExists();
        await this.loadServerHistory();
        this.ensureJoinChat();
      },
    );

    messageManager.setCurrentChatId(this.chatId);
  },
  onUnload() {
    messageManager.setCurrentChatId(null);
    this.unbindSocketEvents();
  },
  onShow() {
    this.loadRecentOrders();
  },
  methods: {
    async loadSupportRuntimeConfig(overrideTitle = false) {
      const supportRuntime = await loadSupportRuntimeSettings();
      this.supportChatTitle = supportRuntime.title;
      if (overrideTitle && this.chatRole === "admin") {
        this.chatTitle = supportRuntime.title;
      }
      if (
        typeof uni.setNavigationBarTitle === "function" &&
        this.chatRole === "admin"
      ) {
        uni.setNavigationBarTitle({ title: this.supportChatTitle });
      }
    },

    async initDatabase() {
      try {
        await db.open();
        this.dbReady = true;
      } catch {
        this.dbReady = false;
        // Rider chat can continue without local SQLite support.
      }
    },

    normalizeTargetType() {
      if (this.chatRole === "user") return "user";
      if (this.chatRole === "merchant") return "merchant";
      return "admin";
    },

    buildConversationPayload() {
      return {
        chatId: this.chatId,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.chatRole === "admin" ? "support" : ""),
        targetPhone: "",
        targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
        targetAvatar: this.otherAvatar || "",
        targetOrderId: this.orderId || "",
      };
    },

    normalizeHistoryMessages(list: any[] = []) {
      return list.map((item: any) => {
        const senderId = item?.senderId != null ? String(item.senderId) : "";
        const isSelf =
          item?.senderRole === "rider" && senderId === String(this.riderId);
        return {
          ...this.normalizeIncomingMessage(item, isSelf),
          status: isSelf ? item?.status || "sent" : undefined,
        };
      });
    },

    saveLocalMessage(message: any, options: { skipPrune?: boolean } = {}) {
      if (!this.dbReady) return;
      try {
        db.saveMessage(this.chatId, message, options);
      } catch (err) {
        console.error("[RiderService] 保存本地消息失败:", err);
      }
    },

    updateLocalMessage(
      messageId: string | number,
      updates: Record<string, any>,
      label: string,
    ) {
      if (!this.dbReady) return;
      void db.updateMessage(this.chatId, messageId, updates).catch((err) => {
        console.error(label, err);
      });
    },

    buildCachedMessage(record: any, overrides: Record<string, any> = {}) {
      return {
        id: record.id,
        chatId: this.chatId,
        sender: record.sender,
        senderId: record.senderId,
        senderRole: record.senderRole,
        content: record.content,
        messageType: record.messageType,
        timestamp: record.timestamp,
        isSelf: record.isSelf,
        avatar: record.avatar || "",
        status: record.status || "",
        ...overrides,
      };
    },

    schedulePendingFailure(tempId: string) {
      setTimeout(() => {
        const msg = this.messages.find(
          (item: any) => item.id === tempId && item.status === "sending",
        );
        if (!msg) return;
        msg.status = "failed";
        this.updateLocalMessage(
          tempId,
          { status: "failed" },
          "[RiderService] 更新本地消息失败状态失败:",
        );
      }, SEND_TIMEOUT_MS);
    },

    async ensureConversationExists() {
      try {
        await upsertConversation(this.buildConversationPayload());
      } catch (err) {
        console.error("[RiderService] 初始化服务端会话失败:", err);
      }
    },

    async syncReadState() {
      try {
        await markConversationRead(this.chatId);
      } catch (err) {
        console.error("[RiderService] 同步会话已读失败:", err);
      }
    },

    async loadServerHistory() {
      const hadServerHistory = this.messages.length > 0;
      try {
        const response: any = await fetchHistory(this.chatId);
        const list = Array.isArray(response) ? response : [];
        this.messages = this.normalizeHistoryMessages(list);
        this.$nextTick(() => {
          this.scrollToBottom();
        });
        await this.syncReadState();
      } catch (err) {
        if (hadServerHistory) {
          console.error(
            "[RiderService] 加载服务端消息历史失败，保留当前服务端消息。",
            err,
          );
          return;
        }
        console.error("[RiderService] 加载服务端消息历史失败。", err);
      }
    },

    bindSocketEvents() {
      uni.$on("socket:new_message", this.onNewMessage);
      uni.$on("socket:message_sent", this.onMessageSent);
      uni.$on("socket:message_read", this.onMessageRead);
      uni.$on("socket:all_messages_read", this.onAllMessagesRead);
      uni.$on("socket:connected", this.onSocketConnected);
      uni.$on("socket:disconnected", this.onSocketDisconnected);
    },

    unbindSocketEvents() {
      uni.$off("socket:new_message", this.onNewMessage);
      uni.$off("socket:message_sent", this.onMessageSent);
      uni.$off("socket:message_read", this.onMessageRead);
      uni.$off("socket:all_messages_read", this.onAllMessagesRead);
      uni.$off("socket:connected", this.onSocketConnected);
      uni.$off("socket:disconnected", this.onSocketDisconnected);
    },

    socketEmit(event: string, data: any) {
      const app = getApp();
      const vm = app && app.$vm;
      const socket = vm && vm.socket;
      if (socket && socket.connected) {
        socket.emit(event, data);
        return true;
      }
      if (vm && typeof vm.tryConnectSocket === "function") {
        vm.tryConnectSocket();
      }
      return false;
    },

    ensureJoinChat() {
      return this.socketEmit("join_chat", {
        chatId: this.chatId,
        userId: this.riderId,
        role: "rider",
      });
    },

    safeDecode(value: any) {
      try {
        return decodeURIComponent(String(value || ""));
      } catch {
        return String(value || "");
      }
    },

    async switchChat(nextChatId: string | number, payload: any = {}) {
      const normalizedChatId = String(nextChatId || "").trim();
      if (!normalizedChatId) return;

      this.chatId = normalizedChatId;
      this.chatRole = payload.role
        ? String(payload.role).toLowerCase()
        : this.inferRoleByChatId(this.chatId);
      this.targetId = payload.targetId ? String(payload.targetId).trim() : "";
      this.orderId = payload.orderId ? String(payload.orderId).trim() : "";
      this.chatTitle = payload.name
        ? this.safeDecode(payload.name)
        : this.chatRole === "admin"
          ? this.supportChatTitle
          : this.inferTitleByRole(this.chatRole);
      this.otherAvatar = payload.avatar
        ? this.safeDecode(payload.avatar)
        : this.defaultAvatarByRole(this.chatRole);
      this.messages = [];
      this.showOrderPicker = false;
      this.showMenu = false;
      this.showOrderDetailPopup = false;
      this.currentOrderDetail = null;

      if (typeof uni.setNavigationBarTitle === "function") {
        uni.setNavigationBarTitle({
          title:
            this.chatRole === "admin" ? this.supportChatTitle : this.chatTitle,
        });
      }

      messageManager.setCurrentChatId(this.chatId);
      await this.initDatabase();
      await this.ensureConversationExists();
      await this.loadServerHistory();
      this.ensureJoinChat();
    },

    onSocketConnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== "support")
        return;
      this.ensureJoinChat();
      void this.loadServerHistory();
    },

    onSocketDisconnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== "support")
        return;
    },

    ...serviceDataMethods,

    onNewMessage(payload: any) {
      if (!payload || String(payload.chatId) !== String(this.chatId)) return;
      const senderId =
        payload?.senderId != null ? String(payload.senderId) : "";
      const isSelf =
        payload.senderRole === "rider" && senderId === String(this.riderId);
      if (isSelf) return;

      const normalized = this.normalizeIncomingMessage(payload, false);
      this.messages.push(normalized);
      this.saveLocalMessage(
        this.buildCachedMessage({
          ...payload,
          id: normalized.id,
          timestamp: normalized.timestamp,
          sender: normalized.sender,
          senderId: normalized.senderId,
          senderRole: normalized.senderRole,
          content: normalized.content,
          messageType: normalized.type,
          isSelf: 0,
          avatar: normalized.avatar,
          status: payload.status || "",
        }),
      );
      this.$nextTick(() => {
        this.scrollToBottom();
      });
      void this.syncReadState();
    },

    onMessageSent(data: any) {
      if (data?.chatId && String(data.chatId) !== String(this.chatId)) return;
      const msg = this.messages.find((item: any) => item.id === data.tempId);
      const nextStatus = msg?.status === "read" ? "read" : "sent";
      const nextTimestamp = this.resolveMessageTimestamp(
        data?.timestamp || data?.createdAt,
        msg?.timestamp || Date.now(),
      );
      if (msg) {
        msg.id = data.messageId || data.tempId;
        msg.timestamp = nextTimestamp;
        msg.time = data.time || formatClockTime(nextTimestamp);
        msg.status = nextStatus;
      }
      this.updateLocalMessage(
        data.tempId,
        {
          id: data.messageId || data.tempId,
          timestamp: nextTimestamp,
          status: nextStatus,
        },
        "[RiderService] 更新本地消息发送状态失败:",
      );
    },

    onMessageRead(data: any) {
      if (data?.chatId && String(data.chatId) !== String(this.chatId)) return;
      const msg = this.messages.find((item: any) => item.id === data.messageId);
      if (msg) {
        msg.status = "read";
      }
      this.updateLocalMessage(
        data.messageId,
        { status: "read" },
        "[RiderService] 更新本地消息已读状态失败:",
      );
    },

    onAllMessagesRead(data: any) {
      if (!data || String(data.chatId) !== String(this.chatId)) return;
      if (!this.dbReady) {
        this.messages.forEach((msg: any) => {
          if (msg?.isSelf && msg.status !== "failed") {
            msg.status = "read";
          }
        });
        return;
      }

      const pendingUpdates: Promise<unknown>[] = [];
      this.messages.forEach((msg: any) => {
        if (!msg?.isSelf || msg.status === "failed" || msg.status === "read")
          return;
        msg.status = "read";
        const messageId = String(msg.id || "").trim();
        if (!messageId) return;
        pendingUpdates.push(
          db
            .updateMessage(this.chatId, messageId, { status: "read" })
            .catch((err) => {
              console.error(
                "[RiderService] 批量更新本地消息已读状态失败:",
                err,
              );
            }),
        );
      });

      if (!pendingUpdates.length) return;
      void Promise.all(
        pendingUpdates.map((task) =>
          Promise.resolve(task).catch(() => undefined),
        ),
      );
    },

    buildOutgoingSocketPayload(
      messageType: string,
      content: any,
      tempId: string,
    ) {
      return {
        chatId: this.chatId,
        senderId: this.riderId,
        senderRole: "rider",
        type: "support",
        messageType,
        content,
        sender: this.riderName,
        avatar: this.avatarUrl,
        tempId,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.chatRole === "admin" ? "support" : ""),
        targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
        targetAvatar: this.otherAvatar || "",
      };
    },

    resendMessage(msg: any) {
      const previousId = String(msg.id);
      const resendTimestamp = Date.now();
      const tempId = this.createLocalMessageId("resend", resendTimestamp);
      msg.id = tempId;
      msg.status = "sending";
      msg.timestamp = resendTimestamp;
      msg.time = formatClockTime(resendTimestamp);

      this.updateLocalMessage(
        previousId,
        {
          id: tempId,
          timestamp: resendTimestamp,
          status: "sending",
        },
        "[RiderService] 更新本地重发消息状态失败:",
      );

      const emitted = this.socketEmit(
        "send_message",
        this.buildOutgoingSocketPayload(
          msg.type,
          msg.type === "order"
            ? JSON.stringify(
                msg.order || this.normalizeOrder(msg.content) || {},
              )
            : msg.content,
          tempId,
        ),
      );

      if (!emitted) {
        msg.status = "failed";
        this.updateLocalMessage(
          tempId,
          { status: "failed" },
          "[RiderService] 更新本地消息失败状态失败:",
        );
        uni.showToast({ title: "客服连接中，请稍后重试", icon: "none" });
        return;
      }

      this.schedulePendingFailure(tempId);
    },

    sendMessage() {
      const content = String(this.inputText || "").trim();
      if (!content) return;

      const tempTimestamp = Date.now();
      const tempId = this.createLocalMessageId("send", tempTimestamp);
      const newMsg = {
        id: tempId,
        content,
        type: "text",
        isSelf: true,
        timestamp: tempTimestamp,
        time: formatClockTime(tempTimestamp),
        status: "sending",
      };
      this.messages.push(newMsg);

      const emitted = this.socketEmit(
        "send_message",
        this.buildOutgoingSocketPayload("text", content, tempId),
      );
      if (!emitted) {
        const msg = this.messages.find((item: any) => item.id === tempId);
        if (msg) msg.status = "failed";
        this.updateLocalMessage(
          tempId,
          { status: "failed" },
          "[RiderService] 更新本地消息失败状态失败:",
        );
        uni.showToast({ title: "客服连接中，请稍后重试", icon: "none" });
      } else {
        this.schedulePendingFailure(tempId);
      }

      this.saveLocalMessage(
        this.buildCachedMessage({
          id: tempId,
          sender: this.riderName,
          senderId: this.riderId,
          senderRole: "rider",
          content,
          messageType: "text",
          timestamp: tempTimestamp,
          isSelf: 1,
          avatar: this.avatarUrl || "",
          status: "sending",
        }),
      );

      this.inputText = "";
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },

    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        success: (res: any) => {
          const tempFilePath = res.tempFilePaths?.[0];
          if (!tempFilePath) {
            uni.showToast({ title: "未选择图片", icon: "none" });
            return;
          }

          uni.showLoading({ title: "上传中..." });
          uploadImage(tempFilePath, {
            uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
          })
            .then((data: any) => {
              uni.hideLoading();
              const imageUrl = String(resolveUploadAssetUrl(data) || "").trim();
              if (!imageUrl) {
                uni.showToast({ title: "上传失败", icon: "none" });
                return;
              }

              const messageTimestamp = Date.now();
              const tempId = this.createLocalMessageId(
                "image",
                messageTimestamp,
              );
              const newMsg = {
                id: tempId,
                content: imageUrl,
                type: "image",
                isSelf: true,
                timestamp: messageTimestamp,
                time: formatClockTime(messageTimestamp),
                status: "sending",
              };
              this.messages.push(newMsg);

              const emitted = this.socketEmit(
                "send_message",
                this.buildOutgoingSocketPayload("image", data.url, tempId),
              );
              if (!emitted) {
                const msg = this.messages.find(
                  (item: any) => item.id === tempId,
                );
                if (msg) msg.status = "failed";
                this.updateLocalMessage(
                  tempId,
                  { status: "failed" },
                  "[RiderService] 更新本地图片消息失败状态失败:",
                );
                uni.showToast({
                  title: "客服连接中，请稍后重试",
                  icon: "none",
                });
              } else {
                this.schedulePendingFailure(tempId);
              }

              this.saveLocalMessage(
                this.buildCachedMessage({
                  id: tempId,
                  sender: this.riderName,
                  senderId: this.riderId,
                  senderRole: "rider",
                  content: data.url,
                  messageType: "image",
                  timestamp: messageTimestamp,
                  isSelf: 1,
                  avatar: this.avatarUrl || "",
                  status: "sending",
                }),
              );

              this.$nextTick(() => {
                this.scrollToBottom();
              });
            })
            .catch(() => {
              uni.hideLoading();
              uni.showToast({ title: "上传失败", icon: "none" });
            });
        },
      });
    },

    sendOrder(order: any) {
      const normalizedOrder = this.normalizeOrder(order);
      if (!normalizedOrder || !normalizedOrder.id) {
        uni.showToast({ title: "订单信息异常", icon: "none" });
        return;
      }

      const tempTimestamp = Date.now();
      const tempId = this.createLocalMessageId("order", tempTimestamp);
      const newMsg = {
        id: tempId,
        content: "",
        type: "order",
        isSelf: true,
        order: normalizedOrder,
        timestamp: tempTimestamp,
        time: formatClockTime(tempTimestamp),
        status: "sending",
      };
      this.messages.push(newMsg);

      const emitted = this.socketEmit(
        "send_message",
        this.buildOutgoingSocketPayload(
          "order",
          JSON.stringify(normalizedOrder),
          tempId,
        ),
      );
      if (!emitted) {
        const msg = this.messages.find((item: any) => item.id === tempId);
        if (msg) msg.status = "failed";
        this.updateLocalMessage(
          tempId,
          { status: "failed" },
          "[RiderService] 更新本地订单消息失败状态失败:",
        );
        uni.showToast({ title: "客服连接中，请稍后重试", icon: "none" });
      } else {
        this.schedulePendingFailure(tempId);
      }

      this.saveLocalMessage(
        this.buildCachedMessage({
          id: tempId,
          sender: this.riderName,
          senderId: this.riderId,
          senderRole: "rider",
          content: JSON.stringify(normalizedOrder),
          messageType: "order",
          timestamp: tempTimestamp,
          isSelf: 1,
          avatar: this.avatarUrl || "",
          status: "sending",
        }),
      );

      this.showOrderPicker = false;
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },

    openOrderDetail(order: any) {
      const normalized = this.normalizeOrder(order);
      if (!normalized) {
        uni.showToast({ title: "订单信息不完整", icon: "none" });
        return;
      }
      this.currentOrderDetail = normalized;
      this.showOrderDetailPopup = true;
    },

    previewImage(url: string) {
      uni.previewImage({ urls: [url], current: url });
    },

    scrollToBottom() {
      if (this.messages.length > 0) {
        this.scrollToView = `msg-${this.messages[this.messages.length - 1].id}`;
      }
    },

    goBack() {
      uni.navigateBack();
    },

    reportService() {
      this.showMenu = false;
      uni.showModal({
        title: "举报客服",
        content: "如需反馈客服问题，请联系平台运营或管理人员处理。",
        showCancel: false,
      });
    },

    async clearMessages() {
      this.showMenu = false;
      uni.showModal({
        title: "删除聊天记录",
        content: "确定要删除当前会话的本地聊天记录吗？",
        success: async (res: any) => {
          if (!res.confirm) return;
          try {
            if (this.dbReady) {
              await db.deleteMessagesByChatId(this.chatId);
            }
            this.messages = [];
            uni.showToast({ title: "已清除本地记录", icon: "success" });
          } catch {
            uni.showToast({ title: "删除失败", icon: "none" });
          }
        },
      });
    },
  },
});
