function trimRiderAppRuntimeValue(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRiderAppRuntimeUni(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderAppRuntimeLogger(logger) {
  return logger && typeof logger === "object" ? logger : console;
}

function resolveRiderAppRuntimeDelay(value, fallback) {
  const normalizedValue = Number(value);
  if (Number.isFinite(normalizedValue) && normalizedValue >= 0) {
    return normalizedValue;
  }
  return fallback;
}

function isRiderAppRuntimeSocketConnected(socket) {
  return !!(socket && socket.connected);
}

function emitRiderAppRuntimeUniEvent(uniApp, eventName, payload) {
  if (uniApp && typeof uniApp.$emit === "function") {
    uniApp.$emit(eventName, payload);
  }
}

function buildRiderAppRuntimeLogPrefix(loggerTag) {
  const normalizedLoggerTag = trimRiderAppRuntimeValue(loggerTag) || "RiderApp";
  return `[${normalizedLoggerTag}]`;
}

function createSafeRiderMessageManager(messageManager) {
  if (messageManager && typeof messageManager.handleNewMessage === "function") {
    return messageManager;
  }

  return {
    handleNewMessage() {},
  };
}

function buildSupportIncomingMessage(payload, riderId) {
  const timestamp = resolveRiderMessageTimestamp(
    payload?.timestamp || payload?.createdAt,
    Date.now(),
  );
  const chatId = trimRiderAppRuntimeValue(payload?.chatId || riderId) || "rider_default";
  const senderId = trimRiderAppRuntimeValue(payload?.senderId);
  const fallbackId = `incoming_support_${chatId}_${senderId || "unknown"}_${timestamp}_${payload?.messageType || "text"}`;

  return {
    id: payload?.id || payload?.uid || payload?.tsid || fallbackId,
    chatId,
    sender: payload?.sender || "客服",
    senderId,
    senderRole: payload?.senderRole || "admin",
    content: payload?.content || "",
    messageType: payload?.messageType || "text",
    avatar: payload?.avatar || null,
    timestamp,
  };
}

function shouldClearSocketToken(error) {
  return /认证失败|auth/i.test(String(error?.message || ""));
}

export function resolveRiderMessageTimestamp(rawValue, fallback = Date.now()) {
  const directValue = Number(rawValue);
  if (Number.isFinite(directValue) && directValue > 0) {
    return directValue;
  }

  const text = trimRiderAppRuntimeValue(rawValue);
  if (!text) {
    return fallback;
  }

  const parsedValue = Date.parse(text);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function normalizeRiderIncomingMessage(payload, senderRole, fallbackName) {
  const timestamp = resolveRiderMessageTimestamp(
    payload?.timestamp || payload?.createdAt,
    Date.now(),
  );
  const chatId = String(
    payload?.chatId || `${senderRole}_${payload?.senderId || payload?.targetId || ""}`,
  );
  const senderId = String(payload?.senderId || payload?.merchantId || payload?.userId || "");
  const fallbackId = `incoming_${chatId || senderRole}_${senderId || "unknown"}_${timestamp}_${payload?.messageType || "text"}`;

  return {
    id: payload?.id || payload?.uid || payload?.tsid || fallbackId,
    chatId,
    sender: payload?.sender || payload?.merchantName || payload?.userName || fallbackName,
    senderId,
    senderRole,
    content: payload?.content || "",
    messageType: payload?.messageType || "text",
    avatar: payload?.avatar || null,
    timestamp,
  };
}

export function extractRiderOrderList(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.orders)) {
    return data.orders;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.data?.orders)) {
    return data.data.orders;
  }
  return [];
}

export function normalizeRiderOrderId(raw) {
  const value =
    raw && typeof raw === "object"
      ? raw.id || raw.orderId || raw.order_id || raw.daily_order_id
      : raw;

  return value === undefined || value === null ? "" : String(value).trim();
}

export function createRiderAppRuntime(options = {}) {
  const uniApp = resolveRiderAppRuntimeUni(options.uniApp);
  const logger = resolveRiderAppRuntimeLogger(options.logger);
  const riderOrderStore =
    options.riderOrderStore && typeof options.riderOrderStore === "object"
      ? options.riderOrderStore
      : {};
  const loadRiderData =
    typeof options.loadRiderData === "function" ? options.loadRiderData : async () => ({});
  const heartbeatRiderStatus =
    typeof options.heartbeatRiderStatus === "function"
      ? options.heartbeatRiderStatus
      : async () => null;
  const fetchRiderOrders =
    typeof options.fetchRiderOrders === "function" ? options.fetchRiderOrders : async () => [];
  const clearPushRegistrationState =
    typeof options.clearPushRegistrationState === "function"
      ? options.clearPushRegistrationState
      : () => {};
  const connectCurrentRealtimeChannel =
    typeof options.connectCurrentRealtimeChannel === "function"
      ? options.connectCurrentRealtimeChannel
      : () => {};
  const messageManager = createSafeRiderMessageManager(options.messageManager);
  const createSocket =
    typeof options.createSocket === "function" ? options.createSocket : null;
  const socketUrl = String(options.socketUrl || "");
  const readSession =
    typeof options.readSession === "function" ? options.readSession : () => ({});
  const readAuthIdentity =
    typeof options.readAuthIdentity === "function" ? options.readAuthIdentity : () => ({});
  const resolveSocketAccessToken =
    typeof options.resolveSocketAccessToken === "function"
      ? options.resolveSocketAccessToken
      : async () => "";
  const clearCachedSocketToken =
    typeof options.clearCachedSocketToken === "function"
      ? options.clearCachedSocketToken
      : () => {};
  const initializeNotification =
    typeof options.initializeNotification === "function"
      ? options.initializeNotification
      : async () => {};
  const setTimeoutImpl =
    typeof options.setTimeoutImpl === "function"
      ? options.setTimeoutImpl
      : globalThis.setTimeout?.bind(globalThis);
  const clearTimeoutImpl =
    typeof options.clearTimeoutImpl === "function"
      ? options.clearTimeoutImpl
      : globalThis.clearTimeout?.bind(globalThis);
  const setIntervalImpl =
    typeof options.setIntervalImpl === "function"
      ? options.setIntervalImpl
      : globalThis.setInterval?.bind(globalThis);
  const clearIntervalImpl =
    typeof options.clearIntervalImpl === "function"
      ? options.clearIntervalImpl
      : globalThis.clearInterval?.bind(globalThis);
  const heartbeatInterval = resolveRiderAppRuntimeDelay(
    options.heartbeatInterval,
    20 * 1000,
  );
  const launchConnectDelay = resolveRiderAppRuntimeDelay(
    options.launchConnectDelay,
    1500,
  );
  const showConnectDelay = resolveRiderAppRuntimeDelay(options.showConnectDelay, 500);
  const reconnectDelay = resolveRiderAppRuntimeDelay(options.reconnectDelay, 3000);
  const logPrefix = buildRiderAppRuntimeLogPrefix(options.loggerTag);

  function logError(message, error) {
    if (typeof logger.error === "function") {
      logger.error(`${logPrefix} ${message}:`, error);
    }
  }

  function markSupportSocketDisconnected(vm) {
    vm.isConnected = false;
  }

  function markRiderSocketDisconnected(vm) {
    vm.isRiderSocketConnected = false;
  }

  return {
    data() {
      return {
        socket: null,
        riderSocket: null,
        riderId: "",
        isConnected: false,
        isRiderSocketConnected: false,
        heartbeatTimer: null,
        socketReconnectTimer: null,
      };
    },

    computed: {
      isRiderOnline() {
        return !!riderOrderStore.isOnline;
      },
    },

    watch: {
      isRiderOnline(isOnline) {
        if (isOnline) {
          this.startHeartbeatLoop();
          return;
        }

        this.stopHeartbeatLoop();
      },
    },

    onLaunch() {
      Promise.resolve(initializeNotification({ uniApp, vm: this })).catch((error) => {
        logError("Notification init failed", error);
      });

      loadRiderData({ uniApp, vm: this }).finally(() => {
        if (this.isRiderOnline) {
          this.startHeartbeatLoop();
        }
      });

      this.scheduleSocketReconnect(launchConnectDelay);
    },

    async onShow() {
      await loadRiderData({ uniApp, vm: this });

      if (this.isRiderOnline) {
        this.startHeartbeatLoop();
      } else {
        this.stopHeartbeatLoop();
      }

      if (!this.hasActiveSocketConnections()) {
        this.scheduleSocketReconnect(showConnectDelay);
      }
    },

    onHide() {
      this.clearSocketReconnectTimer();
    },

    methods: {
      hasActiveSocketConnections() {
        return (
          isRiderAppRuntimeSocketConnected(this.socket)
          && isRiderAppRuntimeSocketConnected(this.riderSocket)
        );
      },

      clearSocketReconnectTimer() {
        if (!this.socketReconnectTimer) {
          return;
        }

        if (typeof clearTimeoutImpl === "function") {
          clearTimeoutImpl(this.socketReconnectTimer);
        }

        this.socketReconnectTimer = null;
      },

      scheduleSocketReconnect(delay = reconnectDelay) {
        if (this.hasActiveSocketConnections()) {
          this.clearSocketReconnectTimer();
          return;
        }

        if (this.socketReconnectTimer) {
          return;
        }

        if (typeof setTimeoutImpl !== "function") {
          void this.tryConnectSocket();
          return;
        }

        this.socketReconnectTimer = setTimeoutImpl(() => {
          this.socketReconnectTimer = null;
          void this.tryConnectSocket();
        }, delay);
      },

      startHeartbeatLoop() {
        if (this.heartbeatTimer) {
          return;
        }

        void this.sendHeartbeat();
        if (typeof setIntervalImpl !== "function") {
          return;
        }

        this.heartbeatTimer = setIntervalImpl(() => {
          void this.sendHeartbeat();
        }, heartbeatInterval);
      },

      stopHeartbeatLoop() {
        if (!this.heartbeatTimer) {
          return;
        }

        if (typeof clearIntervalImpl === "function") {
          clearIntervalImpl(this.heartbeatTimer);
        }
        this.heartbeatTimer = null;
      },

      async sendHeartbeat() {
        if (!this.isRiderOnline) {
          return;
        }

        try {
          await heartbeatRiderStatus({ uniApp, vm: this });
        } catch (error) {
          logError("Rider heartbeat failed", error);
        }
      },

      async tryConnectSocket() {
        if (!createSocket) {
          return;
        }

        if (this.hasActiveSocketConnections()) {
          this.clearSocketReconnectTimer();
          return;
        }

        const session = readSession({ uniApp, vm: this }) || {};
        let riderId = trimRiderAppRuntimeValue(
          readAuthIdentity({ uniApp, vm: this })?.riderId,
        );

        if (!session.isAuthenticated) {
          clearPushRegistrationState({ uniApp, vm: this });
          return;
        }

        if (!riderId) {
          try {
            await loadRiderData({ uniApp, vm: this });
            riderId = trimRiderAppRuntimeValue(
              readAuthIdentity({ uniApp, vm: this })?.riderId,
            );
          } catch (_error) {
            // ignore missing rider bootstrap data and retry next time
          }
        }

        if (!riderId) {
          return;
        }

        this.riderId = riderId;

        let socketToken = "";
        try {
          socketToken = trimRiderAppRuntimeValue(
            await resolveSocketAccessToken({
              riderId,
              authToken: trimRiderAppRuntimeValue(session.token),
              session,
              socketUrl,
              uniApp,
              vm: this,
            }),
          );
        } catch (error) {
          logError("Failed to fetch socket token", error);
          return;
        }

        if (!socketToken) {
          if (typeof logger.error === "function") {
            logger.error(`${logPrefix} Socket token is empty, skip socket connection`);
          }
          return;
        }

        Promise.resolve(
          connectCurrentRealtimeChannel({
            riderId,
            session,
            socketUrl,
            uniApp,
            vm: this,
          }),
        ).catch((error) => {
          logError("Realtime channel init failed", error);
        });

        if (!isRiderAppRuntimeSocketConnected(this.socket)) {
          this.connectSupportSocket(socketToken);
        }

        if (!isRiderAppRuntimeSocketConnected(this.riderSocket)) {
          this.connectRiderSocket(socketToken);
        }
      },

      connectSupportSocket(token) {
        if (!createSocket) {
          return null;
        }

        const previousSocket = this.socket;
        this.socket = null;
        if (previousSocket && typeof previousSocket.disconnect === "function") {
          previousSocket.disconnect();
        }

        const sock = createSocket(socketUrl, "/support", token).connect();
        this.socket = sock;
        markSupportSocketDisconnected(this);
        const isCurrentSocket = () => this.socket === sock;

        const scheduleRetry = (reason, error, shouldResetToken = false) => {
          if (!isCurrentSocket()) {
            return;
          }

          markSupportSocketDisconnected(this);
          emitRiderAppRuntimeUniEvent(uniApp, "socket:disconnected", {
            namespace: "support",
            reason,
          });
          if (shouldResetToken) {
            clearCachedSocketToken({
              reason,
              error,
              uniApp,
              vm: this,
            });
          }
          this.scheduleSocketReconnect(reconnectDelay);
        };

        sock.on("connect", () => {
          if (!isCurrentSocket()) {
            return;
          }

          this.isConnected = true;
          this.clearSocketReconnectTimer();
          void this.sendHeartbeat();

          const chatId = trimRiderAppRuntimeValue(this.riderId) || "rider_default";
          sock.emit("join_chat", {
            chatId,
            userId: this.riderId,
            role: "rider",
          });
          void this.joinSupportOrderRooms(sock);
          emitRiderAppRuntimeUniEvent(uniApp, "socket:connected", {
            namespace: "support",
          });
        });

        sock.on("new_message", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }

          const senderId = payload?.senderId != null ? String(payload.senderId) : "";
          const isFromSelf =
            senderId === trimRiderAppRuntimeValue(this.riderId)
            && payload?.senderRole === "rider";

          if (!isFromSelf) {
            messageManager.handleNewMessage(
              buildSupportIncomingMessage(payload, this.riderId),
            );
          }

          emitRiderAppRuntimeUniEvent(uniApp, "socket:new_message", payload);
        });

        sock.on("message_sent", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }
          emitRiderAppRuntimeUniEvent(uniApp, "socket:message_sent", payload);
        });

        sock.on("message_read", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }
          emitRiderAppRuntimeUniEvent(uniApp, "socket:message_read", payload);
        });

        sock.on("all_messages_read", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }
          emitRiderAppRuntimeUniEvent(uniApp, "socket:all_messages_read", payload);
        });

        sock.on("disconnect", () => {
          if (!isCurrentSocket()) {
            return;
          }

          markSupportSocketDisconnected(this);
          emitRiderAppRuntimeUniEvent(uniApp, "socket:disconnected", {
            namespace: "support",
          });
          this.scheduleSocketReconnect(reconnectDelay);
        });

        sock.on("connect_error", (error) => {
          if (!isCurrentSocket()) {
            return;
          }

          logError("Support socket connect error", error);
          scheduleRetry("connect_error", error, shouldClearSocketToken(error));
        });

        sock.on("auth_error", (error) => {
          if (!isCurrentSocket()) {
            return;
          }

          logError("Support socket auth error", error);
          scheduleRetry("auth_error", error, true);
        });

        return sock;
      },

      connectRiderSocket(token) {
        if (!createSocket) {
          return null;
        }

        const previousSocket = this.riderSocket;
        this.riderSocket = null;
        if (previousSocket && typeof previousSocket.disconnect === "function") {
          previousSocket.disconnect();
        }

        const sock = createSocket(socketUrl, "/rider", token).connect();
        this.riderSocket = sock;
        markRiderSocketDisconnected(this);
        const isCurrentSocket = () => this.riderSocket === sock;

        const scheduleRetry = (error, shouldResetToken = false) => {
          if (!isCurrentSocket()) {
            return;
          }

          markRiderSocketDisconnected(this);
          if (shouldResetToken) {
            clearCachedSocketToken({
              error,
              uniApp,
              vm: this,
            });
          }
          this.scheduleSocketReconnect(reconnectDelay);
        };

        const forwardRiderIncoming = (payload, senderRole, fallbackName) => {
          const normalizedPayload = normalizeRiderIncomingMessage(
            payload,
            senderRole,
            fallbackName,
          );
          messageManager.handleNewMessage(normalizedPayload);
          emitRiderAppRuntimeUniEvent(uniApp, "socket:new_message", normalizedPayload);
        };

        sock.on("connect", () => {
          if (!isCurrentSocket()) {
            return;
          }

          this.isRiderSocketConnected = true;
          this.clearSocketReconnectTimer();
          void this.sendHeartbeat();
          sock.emit("join_rider", { riderId: this.riderId });
        });

        sock.on("merchant_message", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }
          forwardRiderIncoming(payload, "merchant", "商家");
        });

        sock.on("user_message", (payload) => {
          if (!isCurrentSocket()) {
            return;
          }
          forwardRiderIncoming(payload, "user", "用户");
        });

        sock.on("disconnect", () => {
          if (!isCurrentSocket()) {
            return;
          }

          markRiderSocketDisconnected(this);
          this.scheduleSocketReconnect(reconnectDelay);
        });

        sock.on("connect_error", (error) => {
          if (!isCurrentSocket()) {
            return;
          }

          logError("Rider socket connect error", error);
          scheduleRetry(error, shouldClearSocketToken(error));
        });

        sock.on("auth_error", (error) => {
          if (!isCurrentSocket()) {
            return;
          }

          logError("Rider socket auth error", error);
          scheduleRetry(error, true);
        });

        return sock;
      },

      getSupportSocket() {
        return this.socket;
      },

      extractOrderList(data) {
        return extractRiderOrderList(data);
      },

      normalizeOrderId(raw) {
        return normalizeRiderOrderId(raw);
      },

      async joinSupportOrderRooms(sock) {
        if (!sock || !this.riderId) {
          return;
        }

        try {
          const riderOrders = extractRiderOrderList(
            await fetchRiderOrders({ uniApp, vm: this }),
          );
          const roomIds = new Set();

          riderOrders.forEach((order) => {
            const orderId = normalizeRiderOrderId(order);
            if (orderId) {
              roomIds.add(`rider_${orderId}`);
              roomIds.add(`rs_${orderId}`);
            }
          });

          roomIds.forEach((chatId) => {
            sock.emit("join_chat", {
              chatId,
              userId: this.riderId,
              role: "rider",
            });
          });
        } catch (_error) {
          // ignore non-fatal room join failures
        }
      },
    },
  };
}
