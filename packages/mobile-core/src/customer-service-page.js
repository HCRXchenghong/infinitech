import {
  formatOrderAmount as formatOrderAmountValue,
  formatOrderNo as formatOrderNoValue,
  getOrderStatusText as getOrderStatusTextValue,
  normalizeIncomingMessage as normalizeIncomingMessagePayload,
  normalizeOrder as normalizeOrderPayload,
  resolveMessageTimestamp as resolveIncomingMessageTimestamp,
} from "./customer-service-chat-utils.js";
import { resolveUploadAssetUrl } from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import {
  clearCachedSocketToken as clearCachedSocketTokenCache,
  resolveSocketToken,
} from "../../client-sdk/src/realtime-token.js";
import {
  readConsumerStoredProfile,
  resolveConsumerStoredProfileUserId,
} from "./consumer-profile-storage.js";

const SOCKET_TOKEN_KEY = "socket_token";
const SOCKET_TOKEN_ACCOUNT_KEY = "socket_token_account_key";

export function createCustomerServicePage({
  createSocket,
  config,
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  request,
  uploadCommonImage,
  upsertConversation,
  playMessageNotificationSound,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  OrderDetailPopup,
} = {}) {
  return {
    components: {
      OrderDetailPopup,
    },
    data() {
      const supportRuntime = getCachedSupportRuntimeSettings();
      return {
        statusBarHeight: 44,
        inputText: "",
        messages: [],
        scrollToView: "",
        userId: "",
        userName: "用户",
        avatarUrl: "",
        chatId: "user_default",
        showOrderPicker: false,
        showMenu: false,
        recentOrders: [],
        showOrderDetailPopup: false,
        currentOrderDetail: null,
        socket: null,
        isConnected: false,
        socketToken: "",
        socketInitializing: false,
        reconnectTimer: null,
        localMessageSeed: 0,
        supportTitle: supportRuntime.title,
      };
    },
    onLoad() {
      const systemInfo = uni.getSystemInfoSync();
      this.statusBarHeight = systemInfo.statusBarHeight || 44;

      const userId = uni.getStorageSync("userId");
      if (userId) {
        this.userId = String(userId);
        this.chatId = this.userId;
      }

      const profile = readConsumerStoredProfile({ uniApp: uni });
      if (Object.keys(profile).length > 0) {
        if (!this.userId) {
          this.userId = resolveConsumerStoredProfileUserId({
            profile,
            identityKeys: ["id", "userId", "phone"],
          });
          this.chatId = this.userId;
        }
        if (profile.nickname) this.userName = profile.nickname;
        if (profile.name) this.userName = profile.name;
        if (profile.avatarUrl) this.avatarUrl = profile.avatarUrl;
      }
      if (!this.chatId) {
        this.chatId = this.userId || "user_default";
      }

      this.loadRecentOrders();

      this.loadSupportRuntimeConfig().finally(() => {
        this.initializeConversation();
      });
    },
    onUnload() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.disconnectSocket();
    },
    methods: {
      clearCachedSocketToken() {
        clearCachedSocketTokenCache({
          uniApp: uni,
          tokenStorageKey: SOCKET_TOKEN_KEY,
          tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
        });
      },
      async loadSupportRuntimeConfig() {
        const supportRuntime = await loadSupportRuntimeSettings();
        this.supportTitle = supportRuntime.title;
        if (typeof uni.setNavigationBarTitle === "function") {
          uni.setNavigationBarTitle({ title: this.supportTitle });
        }
      },

      async initializeConversation() {
        await this.ensureConversationExists();
        await this.loadServerHistory();
        await this.initSocket();
      },

      async ensureConversationExists() {
        try {
          await upsertConversation({
            chatId: this.chatId,
            targetType: "admin",
            targetId: "support",
            targetPhone: "",
            targetName: this.supportTitle,
            targetAvatar: "",
          });
        } catch (error) {
          console.error("初始化客服会话失败:", error);
        }
      },

      async syncReadState() {
        try {
          await markConversationRead(this.chatId);
        } catch (error) {
          console.error("同步客服会话已读失败:", error);
        }
      },

      async initSocket() {
        if (this.socketInitializing) {
          return;
        }
        if (!this.userId) {
          const profile = readConsumerStoredProfile({ uniApp: uni });
          const fallbackUserId =
            resolveConsumerStoredProfileUserId({
              profile,
              identityKeys: ["id", "userId", "phone"],
            }) || uni.getStorageSync("phone");
          if (fallbackUserId) {
            this.userId = String(fallbackUserId);
            this.chatId = this.userId;
          }
        }
        if (!this.userId) {
          return;
        }

        this.socketInitializing = true;

        let socketToken = "";
        try {
          socketToken = await resolveSocketToken({
            uniApp: uni,
            userId: this.userId,
            role: "user",
            socketUrl: config.SOCKET_URL,
            readAuthorizationHeader,
            tokenStorageKey: SOCKET_TOKEN_KEY,
            tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
            missingTokenMessage: "获取 socket token 失败",
          });
        } catch (error) {
          console.error("获取 socket token 失败:", error);
          uni.showToast({ title: "连接失败", icon: "none" });
          this.socketInitializing = false;
          return;
        }

        this.socketToken = socketToken;
        this.connectSocket();
        this.socketInitializing = false;
      },

      connectSocket() {
        if (this.socket) {
          this.socket.disconnect();
        }

        const sock = createSocket(
          config.SOCKET_URL,
          "/support",
          this.socketToken,
        ).connect();

        sock.on("connect", () => {
          this.isConnected = true;

          sock.emit("join_chat", {
            chatId: this.chatId,
            userId: this.userId,
            role: "user",
          });
        });

        sock.on("new_message", (payload) => {
          if (
            payload &&
            payload.chatId &&
            String(payload.chatId) !== String(this.chatId)
          ) {
            return;
          }
          const senderId =
            payload && payload.senderId != null ? String(payload.senderId) : "";
          const isFromSelf =
            senderId === String(this.userId) && payload.senderRole === "user";
          const normalizedMessage = this.normalizeIncomingMessage(
            payload,
            false,
          );
          if (
            this.messages.some(
              (item) => String(item.id) === String(normalizedMessage.id),
            )
          ) {
            return;
          }

          if (!isFromSelf) {
            playMessageNotificationSound();
            this.messages.push(normalizedMessage);
            this.$nextTick(() => {
              this.scrollToBottom();
            });
            this.syncReadState();
          }
        });

        sock.on("message_sent", (data) => {
          if (
            data &&
            data.chatId &&
            String(data.chatId) !== String(this.chatId)
          ) {
            return;
          }
          const msg = this.messages.find((m) => m.id === data.tempId);
          if (msg) {
            msg.id = data.messageId;
            if (data.time) {
              msg.time = data.time;
            }
            if (data.createdAt) {
              msg.createdAt = data.createdAt;
            }
            msg.timestamp = resolveIncomingMessageTimestamp(
              data.timestamp || data.createdAt,
              msg.timestamp || Date.now(),
            );
            if (msg.status !== "read") {
              msg.status = "sent";
            }
          }
        });

        sock.on("message_read", (data) => {
          if (
            data &&
            data.chatId &&
            String(data.chatId) !== String(this.chatId)
          ) {
            return;
          }
          const messageId = data && data.messageId;
          const msg = this.messages.find((item) => item.id === messageId);
          if (msg) {
            msg.status = "read";
          }
        });

        sock.on("all_messages_read", (data) => {
          if (
            data &&
            data.chatId &&
            String(data.chatId) !== String(this.chatId)
          ) {
            return;
          }
          this.messages.forEach((item) => {
            if (
              item.isSelf &&
              item.status !== "failed" &&
              item.status !== "read"
            ) {
              item.status = "read";
            }
          });
        });

        sock.on("disconnect", () => {
          this.isConnected = false;
        });

        sock.on("connect_error", (error) => {
          console.error("Socket.IO 连接错误:", error);
          this.isConnected = false;
          uni.showToast({ title: "连接异常", icon: "none" });
          if (/认证失败|auth/i.test(String((error && error.message) || ""))) {
            this.clearCachedSocketToken();
          }
          this.scheduleReconnect();
        });

        sock.on("auth_error", (error) => {
          console.error("Socket.IO 认证错误:", error);
          this.isConnected = false;
          uni.showToast({ title: "认证失败", icon: "none" });

          this.clearCachedSocketToken();
          this.scheduleReconnect();
        });

        this.socket = sock;
      },

      scheduleReconnect() {
        if (this.reconnectTimer) {
          return;
        }
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.initSocket();
        }, 3000);
      },

      disconnectSocket() {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
          this.isConnected = false;
        }
        this.socketInitializing = false;
      },
      createLocalMessageId(prefix = "local", timestamp = Date.now()) {
        this.localMessageSeed = Number(this.localMessageSeed || 0) + 1;
        return `${prefix}_${this.chatId || "chat"}_${timestamp}_${this.localMessageSeed}`;
      },
      normalizeIncomingMessage(payload, isSelf) {
        return normalizeIncomingMessagePayload(payload, isSelf);
      },

      async loadServerHistory() {
        try {
          const response = await fetchHistory(this.chatId);
          const list = Array.isArray(response) ? response : [];
          this.messages = list.map((item) =>
            this.normalizeIncomingMessage(
              item,
              String(item.senderId || "") === String(this.userId) &&
                item.senderRole === "user",
            ),
          );
          await this.syncReadState();
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } catch (error) {
          console.error("加载客服消息历史失败:", error);
        }
      },

      normalizeOrder(order) {
        return normalizeOrderPayload(order);
      },
      formatOrderNo(order) {
        return formatOrderNoValue(order);
      },
      formatOrderAmount(order) {
        return formatOrderAmountValue(order);
      },
      getOrderStatusText(order) {
        return getOrderStatusTextValue(order);
      },

      sendMessage() {
        if (!this.inputText.trim()) return;

        if (!this.isConnected) {
          uni.showToast({ title: "未连接到服务器", icon: "none" });
          return;
        }

        const tempId = this.createLocalMessageId("send");
        const timestamp = Date.now();
        const newMsg = {
          id: tempId,
          content: this.inputText,
          type: "text",
          isSelf: true,
          status: "sending",
          timestamp,
          createdAt: timestamp,
          time: new Date(timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        this.messages.push(newMsg);

        this.socket.emit("send_message", {
          chatId: this.chatId,
          senderId: this.userId,
          senderRole: "user",
          type: "support",
          messageType: "text",
          content: this.inputText,
          sender: this.userName,
          avatar: this.avatarUrl,
          tempId,
        });

        setTimeout(() => {
          const msg = this.messages.find(
            (m) => m.id === tempId && m.status === "sending",
          );
          if (msg) msg.status = "failed";
        }, 5000);

        this.inputText = "";
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },

      resendMessage(msg) {
        msg.status = "sending";
        const tempId = this.createLocalMessageId("resend");
        const timestamp = Date.now();
        msg.id = tempId;
        msg.timestamp = timestamp;
        msg.createdAt = timestamp;
        msg.time = new Date(timestamp).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        this.socket.emit("send_message", {
          chatId: this.chatId,
          senderId: this.userId,
          senderRole: "user",
          type: "support",
          messageType: msg.type,
          content:
            msg.type === "order"
              ? JSON.stringify(
                  msg.order || this.normalizeOrder(msg.content) || {},
                )
              : msg.content,
          sender: this.userName,
          avatar: this.avatarUrl,
          tempId,
        });

        setTimeout(() => {
          if (msg.status === "sending") msg.status = "failed";
        }, 5000);
      },

      chooseImage() {
        uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            uni.showLoading({ title: "上传中..." });

            uploadCommonImage(tempFilePath, {
              uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
            })
              .then((data) => {
                uni.hideLoading();
                const imageUrl = resolveUploadAssetUrl(data);
                if (!imageUrl) {
                  uni.showToast({ title: "上传失败", icon: "none" });
                  return;
                }

                const tempId = this.createLocalMessageId("image");
                const timestamp = Date.now();
                const newMsg = {
                  id: tempId,
                  content: imageUrl,
                  type: "image",
                  isSelf: true,
                  status: "sending",
                  timestamp,
                  createdAt: timestamp,
                  time: new Date(timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                };
                this.messages.push(newMsg);

                this.socket.emit("send_message", {
                  chatId: this.chatId,
                  senderId: this.userId,
                  senderRole: "user",
                  type: "support",
                  messageType: "image",
                  content: imageUrl,
                  sender: this.userName,
                  avatar: this.avatarUrl,
                  tempId,
                });

                this.$nextTick(() => {
                  this.scrollToBottom();
                });
              })
              .catch((error) => {
                uni.hideLoading();
                console.error("客服图片上传失败:", error);
                uni.showToast({ title: "上传失败", icon: "none" });
              });
          },
        });
      },

      sendOrder(order) {
        if (!this.isConnected) {
          uni.showToast({ title: "未连接到服务器", icon: "none" });
          return;
        }
        const normalizedOrder = this.normalizeOrder(order);
        if (!normalizedOrder || !normalizedOrder.id) {
          uni.showToast({ title: "订单信息异常", icon: "none" });
          return;
        }
        const tempId = this.createLocalMessageId("order");
        const timestamp = Date.now();
        const newMsg = {
          id: tempId,
          content: "",
          type: "order",
          isSelf: true,
          order: normalizedOrder,
          status: "sending",
          timestamp,
          createdAt: timestamp,
          time: new Date(timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        this.messages.push(newMsg);

        this.socket.emit("send_message", {
          chatId: this.chatId,
          senderId: this.userId,
          senderRole: "user",
          type: "support",
          messageType: "order",
          content: JSON.stringify(normalizedOrder),
          sender: this.userName,
          avatar: this.avatarUrl,
          tempId,
        });

        setTimeout(() => {
          const msg = this.messages.find(
            (m) => m.id === tempId && m.status === "sending",
          );
          if (msg) msg.status = "failed";
        }, 5000);

        this.showOrderPicker = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },

      async loadRecentOrders() {
        if (!this.userId) {
          this.recentOrders = [];
          return;
        }

        try {
          const data = await request({
            url: `/api/orders/user/${encodeURIComponent(this.userId)}`,
            method: "GET",
          });
          const list = Array.isArray(data) ? data : [];
          this.recentOrders = list
            .map((item) => this.normalizeOrder(item))
            .filter((item) => item && item.id)
            .slice(0, 10);
        } catch (error) {
          const cachedOrders = uni.getStorageSync("recentOrders") || [];
          this.recentOrders = cachedOrders
            .map((item) => this.normalizeOrder(item))
            .filter(
              (item) =>
                item &&
                item.id &&
                String(item.userId || item.user_id || this.userId) ===
                  String(this.userId),
            )
            .slice(0, 10);
        }
      },

      openOrderDetail(order) {
        const normalized = this.normalizeOrder(order);
        if (!normalized || !normalized.id) {
          uni.showToast({ title: "订单信息不完整", icon: "none" });
          return;
        }
        this.currentOrderDetail = normalized;
        this.showOrderDetailPopup = true;
      },

      previewImage(url) {
        uni.previewImage({
          urls: [url],
          current: url,
        });
      },

      scrollToBottom() {
        if (this.messages.length > 0) {
          this.scrollToView = `msg-${this.messages[this.messages.length - 1].id}`;
        }
      },

      goBack() {
        uni.navigateBack();
      },

      clearMessages() {
        this.showMenu = false;
        uni.showToast({ title: "聊天记录按平台规则留存", icon: "none" });
      },
    },
  };
}
