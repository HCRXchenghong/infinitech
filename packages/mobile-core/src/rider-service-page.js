import { resolveUploadAssetUrl } from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
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

export const DEFAULT_RIDER_SUPPORT_CHAT_ID = "rider_default";
export const DEFAULT_RIDER_SUPPORT_TITLE = "平台客服";
export const DEFAULT_RIDER_SERVICE_AVATAR = "/static/images/logo.png";
export const DEFAULT_RIDER_SERVICE_SEND_TIMEOUT_MS = 5000;

function resolveRiderServiceUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderServiceApp(getAppFn) {
  if (typeof getAppFn === "function") {
    return getAppFn();
  }

  if (typeof globalThis.getApp === "function") {
    return globalThis.getApp();
  }

  return null;
}

function scheduleRiderServiceTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    return setTimeoutFn(callback, delay);
  }

  if (typeof globalThis.setTimeout === "function") {
    return globalThis.setTimeout(callback, delay);
  }

  callback();
  return null;
}

function resolveRiderServiceText(value) {
  return String(value ?? "").trim();
}

function showRiderServiceToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderServiceLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideRiderServiceLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function setRiderServiceNavigationBarTitle(uniApp, title) {
  if (uniApp && typeof uniApp.setNavigationBarTitle === "function") {
    uniApp.setNavigationBarTitle({ title });
  }
}

function normalizeRiderServiceCollection(value) {
  return Array.isArray(value) ? value : [];
}

function decodeRiderServiceValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return safeDecodeRoleChatValue(value);
}

function normalizeRiderServiceOrderRecord(item, fallbackStatus = "") {
  const normalized = normalizeRoleChatOrder(item);
  if (!normalized || !normalized.id) {
    return null;
  }

  if (!fallbackStatus) {
    return normalized;
  }

  return {
    ...normalized,
    status: normalized.status || fallbackStatus,
  };
}

function matchesAcceptedRiderOrder(item, options = {}) {
  const riderId = resolveRiderServiceText(options.riderId);
  const riderPhone = resolveRiderServiceText(options.riderPhone);
  const itemRiderId = resolveRiderServiceText(item?.rider_id || item?.riderId);
  const itemRiderPhone = resolveRiderServiceText(item?.rider_phone || item?.riderPhone);

  return itemRiderId === riderId
    || (riderPhone && itemRiderPhone === riderPhone)
    || itemRiderPhone === riderId;
}

function createRiderServiceOutgoingMessage({
  tempId,
  type,
  content = "",
  order = null,
  timestamp = Date.now(),
}) {
  return {
    id: tempId,
    content,
    type,
    isSelf: true,
    order,
    timestamp,
    time: formatRoleChatClockTime(timestamp),
    status: "sending",
  };
}

export function inferRiderServiceRoleByChatId(chatId) {
  const value = resolveRiderServiceText(chatId);
  if (value.startsWith("rider_")) return "user";
  if (value.startsWith("rs_")) return "merchant";
  return "admin";
}

export function inferRiderServiceTitleByRole(role, supportTitle = DEFAULT_RIDER_SUPPORT_TITLE) {
  if (role === "user") return "顾客会话";
  if (role === "merchant") return "商家会话";
  return resolveRiderServiceText(supportTitle) || DEFAULT_RIDER_SUPPORT_TITLE;
}

export function extractRiderServiceOrderList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  return [];
}

export function normalizeRiderServiceIncomingMessage(payload, options = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const chatId = resolveRiderServiceText(options.chatId) || "chat";
  const riderId = resolveRiderServiceText(options.riderId);
  const timestamp = resolveRoleChatMessageTimestamp(
    source.timestamp || source.createdAt,
    Date.now(),
  );
  const senderId = resolveRiderServiceText(source.senderId);
  const senderRole = resolveRiderServiceText(source.senderRole);
  const type = resolveRiderServiceText(source.messageType || source.type) || "text";
  const isSelf =
    typeof options.isSelf === "boolean"
      ? options.isSelf
      : senderRole === "rider" && senderId === riderId;

  return {
    id: resolveRoleChatMessageId(source, `incoming_${chatId}_${timestamp}`),
    content: source.content || "",
    type,
    isSelf,
    sender: source.sender || "",
    senderId,
    senderRole,
    avatar: source.avatar || "",
    timestamp,
    time: source.time || formatRoleChatClockTime(timestamp),
    coupon: source.coupon || null,
    order: type === "order" ? normalizeRoleChatOrder(source.order || source.content) : null,
    officialIntervention: !!source.officialIntervention,
    interventionLabel: source.interventionLabel || "官方介入",
    status: isSelf ? source.status || "sent" : source.status,
  };
}

export function createRiderServicePageLogic(options = {}) {
  const {
    fetchHistory,
    markConversationRead,
    upsertConversation,
    uploadImage,
    fetchRiderOrders,
    request,
    readRiderAuthIdentity,
    loadSupportRuntimeSettings,
    db,
    messageManager,
    OrderDetailPopup,
    uniApp,
    getAppFn,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderServiceUniRuntime(uniApp);

  return {
    components: {
      OrderDetailPopup,
    },
    data() {
      return {
        statusBarHeight: 44,
        inputText: "",
        messages: [],
        scrollToView: "",
        riderId: "",
        riderName: "骑手",
        avatarUrl: "",
        chatId: DEFAULT_RIDER_SUPPORT_CHAT_ID,
        targetId: "",
        orderId: "",
        chatRole: "admin",
        supportChatTitle: DEFAULT_RIDER_SUPPORT_TITLE,
        chatTitle: DEFAULT_RIDER_SUPPORT_TITLE,
        otherAvatar: DEFAULT_RIDER_SERVICE_AVATAR,
        showOrderPicker: false,
        showMenu: false,
        recentOrders: [],
        showOrderDetailPopup: false,
        currentOrderDetail: null,
        localMessageSeed: 0,
        dbReady: false,
      };
    },
    onLoad(pageOptions = {}) {
      const systemInfo =
        runtimeUni && typeof runtimeUni.getSystemInfoSync === "function"
          ? runtimeUni.getSystemInfoSync()
          : {};
      this.statusBarHeight = Number(systemInfo?.statusBarHeight) || 44;

      const riderAuth =
        typeof readRiderAuthIdentity === "function"
          ? readRiderAuthIdentity({ uniApp: runtimeUni })
          : {};
      if (riderAuth?.riderId) {
        this.riderId = riderAuth.riderId;
        this.chatId = riderAuth.riderId;
      }

      const queryChatId = pageOptions.chatId || pageOptions.id;
      if (queryChatId !== undefined && queryChatId !== null && queryChatId !== "") {
        this.chatId = resolveRiderServiceText(queryChatId);
      }

      const queryTargetId = pageOptions.targetId || pageOptions.peerId;
      if (queryTargetId !== undefined && queryTargetId !== null && queryTargetId !== "") {
        this.targetId = this.safeDecode(queryTargetId);
      }

      const queryOrderId = pageOptions.orderId || pageOptions.order_id;
      if (queryOrderId !== undefined && queryOrderId !== null && queryOrderId !== "") {
        this.orderId = this.safeDecode(queryOrderId);
      }

      if (!this.chatId) {
        this.chatId = this.riderId || DEFAULT_RIDER_SUPPORT_CHAT_ID;
      }

      const queryRole = pageOptions.role
        ? normalizeRoleChatRole(pageOptions.role, {
            allowedRoles: ["user", "merchant", "admin"],
          })
        : "";
      this.chatRole = queryRole || this.inferRoleByChatId(this.chatId);

      const queryName = pageOptions.name ? this.safeDecode(pageOptions.name) : "";
      this.chatTitle = queryName || this.inferTitleByRole(this.chatRole);
      this.otherAvatar = pageOptions.avatar
        ? this.safeDecode(pageOptions.avatar)
        : this.defaultAvatarByRole(this.chatRole);

      if (riderAuth?.riderName) {
        this.riderName = riderAuth.riderName;
      }

      if (riderAuth?.profile) {
        if (riderAuth.profile.avatar) {
          this.avatarUrl = riderAuth.profile.avatar;
        }
        if (!riderAuth.riderName && (riderAuth.profile.name || riderAuth.profile.nickname)) {
          this.riderName = riderAuth.profile.name || riderAuth.profile.nickname;
        }
      }

      void this.loadRecentOrders();
      this.bindSocketEvents();
      Promise.resolve(this.loadSupportRuntimeConfig(!queryName)).finally(async () => {
        await this.bootstrapSupportChat();
      });

      if (messageManager && typeof messageManager.setCurrentChatId === "function") {
        messageManager.setCurrentChatId(this.chatId);
      }
    },
    onUnload() {
      if (messageManager && typeof messageManager.setCurrentChatId === "function") {
        messageManager.setCurrentChatId(null);
      }
      this.unbindSocketEvents();
    },
    onShow() {
      void this.loadRecentOrders();
    },
    methods: {
      async bootstrapSupportChat() {
        await this.initDatabase();
        await this.ensureConversationExists();
        await this.loadServerHistory();
        this.ensureJoinChat();
      },

      async loadSupportRuntimeConfig(overrideTitle = false) {
        const supportRuntime =
          typeof loadSupportRuntimeSettings === "function"
            ? await loadSupportRuntimeSettings()
            : {};
        this.supportChatTitle =
          resolveRiderServiceText(supportRuntime?.title) || DEFAULT_RIDER_SUPPORT_TITLE;
        if (overrideTitle && this.chatRole === "admin") {
          this.chatTitle = this.supportChatTitle;
        }
        if (this.chatRole === "admin") {
          setRiderServiceNavigationBarTitle(runtimeUni, this.supportChatTitle);
        }
      },

      async initDatabase() {
        if (!db || typeof db.open !== "function") {
          this.dbReady = false;
          return;
        }

        try {
          await db.open();
          this.dbReady = true;
        } catch (_error) {
          this.dbReady = false;
        }
      },

      normalizeTargetType() {
        if (this.chatRole === "user") return "user";
        if (this.chatRole === "merchant") return "merchant";
        return "admin";
      },

      buildConversationPayload() {
        return buildRoleChatConversationPayload({
          chatId: this.chatId,
          targetType: this.normalizeTargetType(),
          role: this.chatRole,
          targetId: this.targetId,
          targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
          targetAvatar: this.otherAvatar || "",
          targetOrderId: this.orderId || "",
        });
      },

      normalizeHistoryMessages(list = []) {
        return normalizeRiderServiceCollection(list).map((item) =>
          this.normalizeIncomingMessage(item),
        );
      },

      saveLocalMessage(message, saveOptions = {}) {
        if (!this.dbReady || !db || typeof db.saveMessage !== "function") {
          return;
        }

        try {
          db.saveMessage(this.chatId, message, saveOptions);
        } catch (error) {
          console.error("[RiderService] 保存本地消息失败:", error);
        }
      },

      updateLocalMessage(messageId, updates, label) {
        if (!this.dbReady || !db || typeof db.updateMessage !== "function") {
          return;
        }

        void db.updateMessage(this.chatId, messageId, updates).catch((error) => {
          console.error(label, error);
        });
      },

      buildCachedMessage(record, overrides = {}) {
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

      schedulePendingFailure(tempId) {
        scheduleRiderServiceTimeout(setTimeoutFn, () => {
          const message = this.messages.find(
            (item) => item.id === tempId && item.status === "sending",
          );
          if (!message) {
            return;
          }

          message.status = "failed";
          this.updateLocalMessage(
            tempId,
            { status: "failed" },
            "[RiderService] 更新本地消息失败状态失败:",
          );
        }, DEFAULT_RIDER_SERVICE_SEND_TIMEOUT_MS);
      },

      async ensureConversationExists() {
        if (typeof upsertConversation !== "function") {
          return;
        }

        try {
          await upsertConversation(this.buildConversationPayload());
        } catch (error) {
          console.error("[RiderService] 初始化服务端会话失败:", error);
        }
      },

      async syncReadState() {
        if (typeof markConversationRead !== "function") {
          return;
        }

        try {
          await markConversationRead(this.chatId);
        } catch (error) {
          console.error("[RiderService] 同步会话已读失败:", error);
        }
      },

      async loadServerHistory() {
        if (typeof fetchHistory !== "function") {
          return;
        }

        const hadServerHistory = this.messages.length > 0;
        try {
          const response = await fetchHistory(this.chatId);
          this.messages = this.normalizeHistoryMessages(response);
          this.$nextTick(() => {
            this.scrollToBottom();
          });
          await this.syncReadState();
        } catch (error) {
          if (hadServerHistory) {
            console.error(
              "[RiderService] 加载服务端消息历史失败，保留当前服务端消息。",
              error,
            );
            return;
          }

          console.error("[RiderService] 加载服务端消息历史失败。", error);
        }
      },

      bindSocketEvents() {
        if (!runtimeUni || typeof runtimeUni.$on !== "function") {
          return;
        }

        runtimeUni.$on("socket:new_message", this.onNewMessage);
        runtimeUni.$on("socket:message_sent", this.onMessageSent);
        runtimeUni.$on("socket:message_read", this.onMessageRead);
        runtimeUni.$on("socket:all_messages_read", this.onAllMessagesRead);
        runtimeUni.$on("socket:connected", this.onSocketConnected);
        runtimeUni.$on("socket:disconnected", this.onSocketDisconnected);
      },

      unbindSocketEvents() {
        if (!runtimeUni || typeof runtimeUni.$off !== "function") {
          return;
        }

        runtimeUni.$off("socket:new_message", this.onNewMessage);
        runtimeUni.$off("socket:message_sent", this.onMessageSent);
        runtimeUni.$off("socket:message_read", this.onMessageRead);
        runtimeUni.$off("socket:all_messages_read", this.onAllMessagesRead);
        runtimeUni.$off("socket:connected", this.onSocketConnected);
        runtimeUni.$off("socket:disconnected", this.onSocketDisconnected);
      },

      socketEmit(event, data) {
        const app = resolveRiderServiceApp(getAppFn);
        const vm = app && app.$vm;
        const socket = vm && vm.socket;
        if (socket && socket.connected && typeof socket.emit === "function") {
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

      safeDecode(value) {
        return decodeRiderServiceValue(value);
      },

      async switchChat(nextChatId, payload = {}) {
        const normalizedChatId = resolveRiderServiceText(nextChatId);
        if (!normalizedChatId) {
          return;
        }

        this.chatId = normalizedChatId;
        this.chatRole = payload.role
          ? normalizeRoleChatRole(payload.role, {
              allowedRoles: ["user", "merchant", "admin"],
            })
          : this.inferRoleByChatId(this.chatId);
        this.targetId = resolveRiderServiceText(payload.targetId);
        this.orderId = resolveRiderServiceText(payload.orderId);
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

        setRiderServiceNavigationBarTitle(
          runtimeUni,
          this.chatRole === "admin" ? this.supportChatTitle : this.chatTitle,
        );

        if (messageManager && typeof messageManager.setCurrentChatId === "function") {
          messageManager.setCurrentChatId(this.chatId);
        }
        await this.initDatabase();
        await this.ensureConversationExists();
        await this.loadServerHistory();
        this.ensureJoinChat();
      },

      onSocketConnected(payload) {
        if (payload && payload.namespace && payload.namespace !== "support") {
          return;
        }

        this.ensureJoinChat();
        void this.loadServerHistory();
      },

      onSocketDisconnected(payload) {
        if (payload && payload.namespace && payload.namespace !== "support") {
          return;
        }
      },

      onNewMessage(payload) {
        if (!payload || String(payload.chatId) !== String(this.chatId)) {
          return;
        }

        const normalized = this.normalizeIncomingMessage(payload);
        if (normalized.isSelf) {
          return;
        }

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

      onMessageSent(data) {
        if (data?.chatId && String(data.chatId) !== String(this.chatId)) {
          return;
        }

        const message = this.messages.find((item) => item.id === data.tempId);
        const nextStatus = message?.status === "read" ? "read" : "sent";
        const nextTimestamp = this.resolveMessageTimestamp(
          data?.timestamp || data?.createdAt,
          message?.timestamp || Date.now(),
        );
        if (message) {
          message.id = data.messageId || data.tempId;
          message.timestamp = nextTimestamp;
          message.time = data.time || formatRoleChatClockTime(nextTimestamp);
          message.status = nextStatus;
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

      onMessageRead(data) {
        if (data?.chatId && String(data.chatId) !== String(this.chatId)) {
          return;
        }

        const message = this.messages.find((item) => item.id === data.messageId);
        if (message) {
          message.status = "read";
        }
        this.updateLocalMessage(
          data.messageId,
          { status: "read" },
          "[RiderService] 更新本地消息已读状态失败:",
        );
      },

      onAllMessagesRead(data) {
        if (!data || String(data.chatId) !== String(this.chatId)) {
          return;
        }

        if (!this.dbReady || !db || typeof db.updateMessage !== "function") {
          this.messages.forEach((message) => {
            if (message?.isSelf && message.status !== "failed") {
              message.status = "read";
            }
          });
          return;
        }

        const pendingUpdates = [];
        this.messages.forEach((message) => {
          if (!message?.isSelf || message.status === "failed" || message.status === "read") {
            return;
          }

          message.status = "read";
          const messageId = resolveRiderServiceText(message.id);
          if (!messageId) {
            return;
          }

          pendingUpdates.push(
            db.updateMessage(this.chatId, messageId, { status: "read" }).catch((error) => {
              console.error("[RiderService] 批量更新本地消息已读状态失败:", error);
            }),
          );
        });

        if (!pendingUpdates.length) {
          return;
        }

        void Promise.all(
          pendingUpdates.map((task) => Promise.resolve(task).catch(() => undefined)),
        );
      },

      resolveMessageTimestamp(rawValue, fallback = Date.now()) {
        return resolveRoleChatMessageTimestamp(rawValue, fallback);
      },

      resolveMessageId(payload, fallback) {
        return resolveRoleChatMessageId(payload, fallback);
      },

      createLocalMessageId(prefix = "local", timestamp = Date.now()) {
        const result = createRoleChatLocalMessageId({
          prefix,
          timestamp,
          chatId: this.chatId,
          seed: this.localMessageSeed,
        });
        this.localMessageSeed = result.seed;
        return result.id;
      },

      normalizeIncomingMessage(payload, explicitIsSelf) {
        return normalizeRiderServiceIncomingMessage(payload, {
          chatId: this.chatId,
          riderId: this.riderId,
          isSelf: explicitIsSelf,
        });
      },

      inferRoleByChatId(chatId) {
        return inferRiderServiceRoleByChatId(chatId);
      },

      inferTitleByRole(role) {
        return inferRiderServiceTitleByRole(role, this.supportChatTitle);
      },

      defaultAvatarByRole(_role) {
        return DEFAULT_RIDER_SERVICE_AVATAR;
      },

      normalizeOrder(order) {
        return normalizeRoleChatOrder(order);
      },

      formatOrderNo(order) {
        return formatRoleChatOrderNo(order);
      },

      formatOrderAmount(order) {
        return formatRoleChatOrderAmount(order);
      },

      getOrderStatusText(order) {
        return getRoleChatOrderStatusText(order);
      },

      extractOrderList(data) {
        return extractRiderServiceOrderList(data);
      },

      async loadRecentOrders() {
        if (!this.riderId) {
          this.recentOrders = [];
          return;
        }

        try {
          const availableTask =
            typeof fetchRiderOrders === "function"
              ? fetchRiderOrders("available")
              : [];
          const riderTask =
            typeof fetchRiderOrders === "function"
              ? fetchRiderOrders()
              : [];
          const [availableResponse, riderResponse] = await Promise.all([availableTask, riderTask]);

          let availableOrders = this.extractOrderList(availableResponse)
            .map((item) => normalizeRiderServiceOrderRecord(item, "pending"))
            .filter(Boolean);

          let acceptedOrders = this.extractOrderList(riderResponse)
            .map((item) => normalizeRiderServiceOrderRecord(item))
            .filter((item) => {
              if (!item || !item.id) {
                return false;
              }

              const status = resolveRiderServiceText(item.status).toLowerCase();
              return status === "accepted" || status === "delivering" || status === "picked_up";
            });

          if (availableOrders.length === 0 && acceptedOrders.length === 0 && typeof request === "function") {
            const riderAuth =
              typeof readRiderAuthIdentity === "function"
                ? readRiderAuthIdentity({ uniApp: runtimeUni })
                : {};
            const riderPhone = resolveRiderServiceText(riderAuth?.riderPhone);
            const [pendingResponse, acceptedResponse] = await Promise.all([
              request({
                url: "/api/orders",
                method: "GET",
                data: { status: "pending", page: 1, limit: 200 },
              }),
              request({
                url: "/api/orders",
                method: "GET",
                data: { status: "accepted", page: 1, limit: 200 },
              }),
            ]);

            availableOrders = this.extractOrderList(pendingResponse)
              .map((item) => normalizeRiderServiceOrderRecord(item, "pending"))
              .filter(Boolean);

            acceptedOrders = this.extractOrderList(acceptedResponse)
              .filter((item) =>
                matchesAcceptedRiderOrder(item, {
                  riderId: this.riderId,
                  riderPhone,
                }),
              )
              .map((item) => normalizeRiderServiceOrderRecord(item))
              .filter(Boolean);
          }

          const uniqueMap = {};
          [...availableOrders, ...acceptedOrders].forEach((item) => {
            uniqueMap[String(item.id)] = item;
          });
          this.recentOrders = Object.values(uniqueMap).slice(0, 20);
        } catch (_error) {
          this.recentOrders = [];
        }
      },

      buildOutgoingSocketPayload(messageType, content, tempId) {
        return {
          ...buildRoleChatOutgoingPayload({
            chatId: this.chatId,
            targetType: this.normalizeTargetType(),
            role: this.chatRole,
            targetId: this.targetId,
            targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
            targetAvatar: this.otherAvatar || "",
            senderId: this.riderId,
            senderRole: "rider",
            sender: this.riderName,
            avatar: this.avatarUrl,
            messageType,
            content,
            tempId,
            extraFields: {
              type: "support",
            },
          }),
        };
      },

      resendMessage(message) {
        const previousId = String(message.id);
        const resendTimestamp = Date.now();
        const tempId = this.createLocalMessageId("resend", resendTimestamp);
        message.id = tempId;
        message.status = "sending";
        message.timestamp = resendTimestamp;
        message.time = formatRoleChatClockTime(resendTimestamp);

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
            message.type,
            message.type === "order"
              ? JSON.stringify(message.order || this.normalizeOrder(message.content) || {})
              : message.content,
            tempId,
          ),
        );

        if (!emitted) {
          message.status = "failed";
          this.updateLocalMessage(
            tempId,
            { status: "failed" },
            "[RiderService] 更新本地消息失败状态失败:",
          );
          showRiderServiceToast(runtimeUni, {
            title: "客服连接中，请稍后重试",
            icon: "none",
          });
          return;
        }

        this.schedulePendingFailure(tempId);
      },

      sendMessage() {
        const content = resolveRiderServiceText(this.inputText);
        if (!content) {
          return;
        }

        const timestamp = Date.now();
        const tempId = this.createLocalMessageId("send", timestamp);
        this.messages.push(
          createRiderServiceOutgoingMessage({
            tempId,
            type: "text",
            content,
            timestamp,
          }),
        );

        const emitted = this.socketEmit(
          "send_message",
          this.buildOutgoingSocketPayload("text", content, tempId),
        );
        if (!emitted) {
          const message = this.messages.find((item) => item.id === tempId);
          if (message) {
            message.status = "failed";
          }
          this.updateLocalMessage(
            tempId,
            { status: "failed" },
            "[RiderService] 更新本地消息失败状态失败:",
          );
          showRiderServiceToast(runtimeUni, {
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
            content,
            messageType: "text",
            timestamp,
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
        if (!runtimeUni || typeof runtimeUni.chooseImage !== "function") {
          return;
        }

        runtimeUni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          success: (result) => {
            const tempFilePath = result?.tempFilePaths?.[0];
            if (!tempFilePath) {
              showRiderServiceToast(runtimeUni, {
                title: "未选择图片",
                icon: "none",
              });
              return;
            }

            showRiderServiceLoading(runtimeUni, { title: "上传中..." });
            Promise.resolve(
              typeof uploadImage === "function"
                ? uploadImage(tempFilePath, {
                    uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
                  })
                : null,
            )
              .then((data) => {
                hideRiderServiceLoading(runtimeUni);
                const imageUrl = resolveRiderServiceText(resolveUploadAssetUrl(data));
                if (!imageUrl) {
                  showRiderServiceToast(runtimeUni, {
                    title: "上传失败",
                    icon: "none",
                  });
                  return;
                }

                const timestamp = Date.now();
                const tempId = this.createLocalMessageId("image", timestamp);
                this.messages.push(
                  createRiderServiceOutgoingMessage({
                    tempId,
                    type: "image",
                    content: imageUrl,
                    timestamp,
                  }),
                );

                const emitted = this.socketEmit(
                  "send_message",
                  this.buildOutgoingSocketPayload("image", imageUrl, tempId),
                );
                if (!emitted) {
                  const message = this.messages.find((item) => item.id === tempId);
                  if (message) {
                    message.status = "failed";
                  }
                  this.updateLocalMessage(
                    tempId,
                    { status: "failed" },
                    "[RiderService] 更新本地图片消息失败状态失败:",
                  );
                  showRiderServiceToast(runtimeUni, {
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
                    content: imageUrl,
                    messageType: "image",
                    timestamp,
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
                hideRiderServiceLoading(runtimeUni);
                showRiderServiceToast(runtimeUni, {
                  title: "上传失败",
                  icon: "none",
                });
              });
          },
        });
      },

      sendOrder(order) {
        const normalizedOrder = this.normalizeOrder(order);
        if (!normalizedOrder || !normalizedOrder.id) {
          showRiderServiceToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        const timestamp = Date.now();
        const tempId = this.createLocalMessageId("order", timestamp);
        this.messages.push(
          createRiderServiceOutgoingMessage({
            tempId,
            type: "order",
            order: normalizedOrder,
            timestamp,
          }),
        );

        const emitted = this.socketEmit(
          "send_message",
          this.buildOutgoingSocketPayload(
            "order",
            JSON.stringify(normalizedOrder),
            tempId,
          ),
        );
        if (!emitted) {
          const message = this.messages.find((item) => item.id === tempId);
          if (message) {
            message.status = "failed";
          }
          this.updateLocalMessage(
            tempId,
            { status: "failed" },
            "[RiderService] 更新本地订单消息失败状态失败:",
          );
          showRiderServiceToast(runtimeUni, {
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
            content: JSON.stringify(normalizedOrder),
            messageType: "order",
            timestamp,
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

      openOrderDetail(order) {
        const normalized = this.normalizeOrder(order);
        if (!normalized || !normalized.id) {
          showRiderServiceToast(runtimeUni, {
            title: "订单信息不完整",
            icon: "none",
          });
          return;
        }

        this.currentOrderDetail = normalized;
        this.showOrderDetailPopup = true;
      },

      previewImage(url) {
        if (runtimeUni && typeof runtimeUni.previewImage === "function") {
          runtimeUni.previewImage({ urls: [url], current: url });
        }
      },

      scrollToBottom() {
        if (this.messages.length > 0) {
          this.scrollToView = `msg-${this.messages[this.messages.length - 1].id}`;
        }
      },

      goBack() {
        if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
          runtimeUni.navigateBack();
        }
      },

      reportService() {
        this.showMenu = false;
        if (runtimeUni && typeof runtimeUni.showModal === "function") {
          runtimeUni.showModal({
            title: "举报客服",
            content: "如需反馈客服问题，请联系平台运营或管理人员处理。",
            showCancel: false,
          });
        }
      },

      async clearMessages() {
        this.showMenu = false;
        if (!runtimeUni || typeof runtimeUni.showModal !== "function") {
          return;
        }

        runtimeUni.showModal({
          title: "删除聊天记录",
          content: "确定要删除当前会话的本地聊天记录吗？",
          success: async (result) => {
            if (!result?.confirm) {
              return;
            }

            try {
              if (this.dbReady && db && typeof db.deleteMessagesByChatId === "function") {
                await db.deleteMessagesByChatId(this.chatId);
              }
              this.messages = [];
              showRiderServiceToast(runtimeUni, {
                title: "已清除本地记录",
                icon: "success",
              });
            } catch (_error) {
              showRiderServiceToast(runtimeUni, {
                title: "删除失败",
                icon: "none",
              });
            }
          },
        });
      },
    },
  };
}
