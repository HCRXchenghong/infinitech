import { resolveUploadAssetUrl } from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import {
  clearCachedSocketToken as clearCachedSocketTokenCache,
  resolveSocketToken,
} from "../../client-sdk/src/realtime-token.js";
import {
  buildRoleChatConversationPayload,
  buildRoleChatOutgoingPayload,
  createRoleChatLocalMessageId,
  formatRoleChatClockTime,
  normalizeRoleChatRole,
  resolveRoleChatMessageId,
  resolveRoleChatMessageTimestamp,
  safeDecodeRoleChatValue,
} from "./role-chat-portal.js";

const DEFAULT_MERCHANT_CHAT_SUPPORT_TITLE = "平台客服";
const DEFAULT_MERCHANT_CHAT_SOCKET_NAMESPACE = "/support";
const DEFAULT_MERCHANT_CHAT_SEND_TIMEOUT_MS = 5000;
const DEFAULT_MERCHANT_CHAT_RECONNECT_MS = 3000;

function createFallbackRef(value) {
  return { value };
}

function createFallbackComputed(getter) {
  return {
    get value() {
      return getter();
    },
  };
}

function resolveMerchantChatUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveMerchantChatTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    return setTimeoutFn(callback, delay);
  }

  if (typeof globalThis.setTimeout === "function") {
    return globalThis.setTimeout(callback, delay);
  }

  callback();
  return null;
}

function clearMerchantChatTimeout(clearTimeoutFn, timer) {
  if (!timer) {
    return;
  }

  if (typeof clearTimeoutFn === "function") {
    clearTimeoutFn(timer);
    return;
  }

  if (typeof globalThis.clearTimeout === "function") {
    globalThis.clearTimeout(timer);
  }
}

function showMerchantChatToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showMerchantChatLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideMerchantChatLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function previewMerchantChatImage(uniApp, url) {
  if (uniApp && typeof uniApp.previewImage === "function") {
    uniApp.previewImage({ urls: [url], current: url });
  }
}

function navigateMerchantChatBack(uniApp) {
  if (uniApp && typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack();
  }
}

function chooseMerchantChatImage(uniApp, payload) {
  if (uniApp && typeof uniApp.chooseImage === "function") {
    uniApp.chooseImage(payload);
  }
}

function normalizeMerchantChatText(value) {
  return String(value ?? "").trim();
}

function normalizeMerchantChatOptions(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeMerchantChatHistoryList(list) {
  return Array.isArray(list) ? list : [];
}

function resolveMerchantChatSupportTitle(settings) {
  return normalizeMerchantChatText(settings?.title) || DEFAULT_MERCHANT_CHAT_SUPPORT_TITLE;
}

function normalizeMerchantChatSocketNamespace(namespace) {
  return normalizeMerchantChatText(namespace) || DEFAULT_MERCHANT_CHAT_SOCKET_NAMESPACE;
}

export function createMerchantChatPage(options = {}) {
  const settings = normalizeMerchantChatOptions(options);
  const refImpl = typeof settings.refImpl === "function" ? settings.refImpl : createFallbackRef;
  const computedImpl =
    typeof settings.computedImpl === "function"
      ? settings.computedImpl
      : createFallbackComputed;
  const onLoadImpl = typeof settings.onLoadImpl === "function" ? settings.onLoadImpl : () => {};
  const onUnloadImpl =
    typeof settings.onUnloadImpl === "function" ? settings.onUnloadImpl : () => {};
  const runtimeUni = resolveMerchantChatUniRuntime(settings.uniApp);
  const createSocketImpl = settings.createSocket;
  const socketNamespace = normalizeMerchantChatSocketNamespace(settings.socketNamespace);
  const resolveSocketTokenImpl =
    typeof settings.resolveSocketTokenImpl === "function"
      ? settings.resolveSocketTokenImpl
      : resolveSocketToken;
  const clearCachedSocketTokenImpl =
    typeof settings.clearCachedSocketTokenImpl === "function"
      ? settings.clearCachedSocketTokenImpl
      : clearCachedSocketTokenCache;

  const chatId = refImpl("");
  const chatRole = refImpl("user");
  const chatTitle = refImpl("聊天");
  const supportTitle = refImpl(
    resolveMerchantChatSupportTitle(
      typeof settings.getCachedSupportRuntimeSettings === "function"
        ? settings.getCachedSupportRuntimeSettings()
        : {},
    ),
  );
  const draft = refImpl("");
  const orderId = refImpl("");
  const targetId = refImpl("");

  const merchantId = refImpl("");
  const merchantName = refImpl("商户");
  const merchantAvatar = refImpl("");

  const socket = refImpl(null);
  const isConnected = refImpl(false);
  const reconnectTimer = refImpl(null);

  const messages = refImpl([]);
  const scrollIntoView = refImpl("");
  const localMessageSeed = refImpl(0);

  const navSubtitle = computedImpl(() => {
    if (chatRole.value === "admin") return `${supportTitle.value}会话`;
    if (chatRole.value === "rider") {
      return orderId.value ? `订单 #${orderId.value}` : "骑手会话";
    }
    return orderId.value ? `订单 #${orderId.value}` : "用户会话";
  });

  function createLocalMessageId(prefix = "local", timestamp = Date.now()) {
    const result = createRoleChatLocalMessageId({
      prefix,
      timestamp,
      chatId: chatId.value,
      seed: localMessageSeed.value,
    });
    localMessageSeed.value = result.seed;
    return result.id;
  }

  function inferTitleByRole(role) {
    if (role === "admin") return supportTitle.value;
    if (role === "rider") return "骑手会话";
    return "用户会话";
  }

  function normalizeTargetType() {
    if (chatRole.value === "rider") return "rider";
    if (chatRole.value === "admin") return "admin";
    return "user";
  }

  function buildConversationPayload() {
    return buildRoleChatConversationPayload({
      chatId: chatId.value,
      targetType: normalizeTargetType(),
      role: chatRole.value,
      targetId: targetId.value,
      targetName: chatTitle.value || inferTitleByRole(chatRole.value),
      targetAvatar: "",
    });
  }

  async function loadSupportRuntimeConfig(updateChatTitle = false) {
    const supportRuntime =
      typeof settings.loadSupportRuntimeSettings === "function"
        ? await settings.loadSupportRuntimeSettings()
        : {};
    supportTitle.value = resolveMerchantChatSupportTitle(supportRuntime);
    if (updateChatTitle && chatRole.value === "admin") {
      chatTitle.value = supportTitle.value;
    }
  }

  function displayText(message) {
    if (message.type === "order") return "[订单消息]";
    if (message.type === "coupon") return "[优惠券]";
    if (message.type === "location") return "[位置消息]";
    if (message.type === "audio") return "[语音消息]";
    return message.text;
  }

  function scrollToBottom() {
    if (!messages.value.length) {
      return;
    }
    scrollIntoView.value = `msg-${messages.value[messages.value.length - 1].mid}`;
  }

  function toViewMessage(raw) {
    const senderId = raw?.senderId != null ? String(raw.senderId) : "";
    const self =
      raw?.senderRole === "merchant" && senderId === String(merchantId.value);
    const timestamp = resolveRoleChatMessageTimestamp(
      raw?.timestamp || raw?.createdAt,
      Date.now(),
    );

    return {
      mid: resolveRoleChatMessageId(raw, `history_${chatId.value || "chat"}_${timestamp}`),
      self,
      text: String(raw?.content || ""),
      type: String(raw?.messageType || "text"),
      timestamp,
      time: String(raw?.time || formatRoleChatClockTime(timestamp)),
      status: self ? "sent" : "read",
      officialIntervention: !!raw?.officialIntervention,
      interventionLabel: String(raw?.interventionLabel || "官方介入"),
    };
  }

  function normalizeHistoryMessages(list) {
    return normalizeMerchantChatHistoryList(list).map((item) => toViewMessage(item));
  }

  async function ensureConversationExists() {
    if (typeof settings.upsertConversation !== "function") {
      return;
    }

    try {
      await settings.upsertConversation(buildConversationPayload());
    } catch (error) {
      console.error("初始化服务端会话失败:", error);
    }
  }

  async function syncReadState() {
    if (typeof settings.markConversationRead !== "function") {
      return;
    }

    try {
      await settings.markConversationRead(chatId.value);
    } catch (error) {
      console.error("同步会话已读失败:", error);
    }
  }

  async function loadServerHistory() {
    if (typeof settings.fetchHistory !== "function") {
      return;
    }

    try {
      const response = await settings.fetchHistory(chatId.value);
      messages.value = normalizeHistoryMessages(response);
      scrollToBottom();
      await syncReadState();
    } catch (error) {
      console.error("加载服务端聊天记录失败:", error);
    }
  }

  function appendLocalMessage(self, content, type, status = "sending") {
    const timestamp = Date.now();
    const mid = createLocalMessageId("local", timestamp);
    messages.value.push({
      mid,
      self,
      text: content,
      type,
      timestamp,
      time: formatRoleChatClockTime(timestamp),
      status,
      officialIntervention: false,
      interventionLabel: "",
    });
    scrollToBottom();
    return mid;
  }

  function updateLocalMessageStatus(messageId, status) {
    const normalizedId = normalizeMerchantChatText(messageId);
    if (!normalizedId) {
      return false;
    }

    const target = messages.value.find((item) => item.mid === normalizedId);
    if (!target || target.status === status) {
      return false;
    }

    target.status = status;
    return true;
  }

  function clearCachedSocketToken() {
    clearCachedSocketTokenImpl({
      uniApp: runtimeUni,
      tokenStorageKey: "socket_token",
      tokenAccountKeyStorageKey: "socket_token_account_key",
    });
  }

  async function fetchSocketToken() {
    const authHeader =
      typeof settings.readAuthorizationHeader === "function"
        ? settings.readAuthorizationHeader()
        : {};
    if (!authHeader.Authorization) {
      clearCachedSocketToken();
      throw new Error("请先登录后再连接聊天");
    }

    return resolveSocketTokenImpl({
      uniApp: runtimeUni,
      userId: merchantId.value,
      role: "merchant",
      socketUrl: settings.config?.SOCKET_URL,
      readAuthorizationHeader: settings.readAuthorizationHeader,
      tokenStorageKey: "socket_token",
      tokenAccountKeyStorageKey: "socket_token_account_key",
      missingAuthorizationMessage: "请先登录后再连接聊天",
      missingSocketUrlMessage: "socket url is required",
      missingTokenMessage: "获取 socket token 失败",
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer.value) {
      return;
    }

    reconnectTimer.value = resolveMerchantChatTimeout(
      settings.setTimeoutFn,
      () => {
        reconnectTimer.value = null;
        void initSocket();
      },
      DEFAULT_MERCHANT_CHAT_RECONNECT_MS,
    );
  }

  function connectSocket(token) {
    if (!createSocketImpl) {
      return;
    }

    if (socket.value && typeof socket.value.disconnect === "function") {
      socket.value.disconnect();
    }

    const sock = createSocketImpl(settings.config?.SOCKET_URL, socketNamespace, token).connect();

    sock.on("connect", () => {
      isConnected.value = true;
      sock.emit("join_chat", {
        chatId: chatId.value,
        userId: merchantId.value,
        role: "merchant",
      });
    });

    sock.on("new_message", (payload) => {
      if (!payload || String(payload.chatId) !== String(chatId.value)) {
        return;
      }

      const normalized = toViewMessage(payload);
      if (normalized.self) {
        return;
      }

      if (typeof settings.playMerchantMessageNotificationSound === "function") {
        settings.playMerchantMessageNotificationSound();
      }
      messages.value.push(normalized);
      scrollToBottom();
      void syncReadState();
    });

    sock.on("message_sent", (payload) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) {
        return;
      }

      const index = messages.value.findIndex(
        (item) => item.mid === String(payload?.tempId || ""),
      );
      if (index < 0) {
        return;
      }

      messages.value[index].mid = String(payload?.messageId || messages.value[index].mid);
      messages.value[index].timestamp = resolveRoleChatMessageTimestamp(
        payload?.timestamp || payload?.createdAt,
        messages.value[index].timestamp || Date.now(),
      );
      messages.value[index].time = String(
        payload?.time || formatRoleChatClockTime(messages.value[index].timestamp),
      );
      if (messages.value[index].status !== "read") {
        messages.value[index].status = "sent";
      }
    });

    sock.on("message_read", (payload) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) {
        return;
      }
      updateLocalMessageStatus(payload?.messageId, "read");
    });

    sock.on("all_messages_read", (payload) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) {
        return;
      }

      messages.value.forEach((item) => {
        if (item.self && item.status !== "failed" && item.status !== "read") {
          item.status = "read";
        }
      });
    });

    sock.on("clear_messages_denied", () => {
      showMerchantChatToast(runtimeUni, {
        title: "聊天记录需按平台规则保留",
        icon: "none",
      });
    });

    sock.on("disconnect", () => {
      isConnected.value = false;
    });

    sock.on("connect_error", (error) => {
      isConnected.value = false;
      if (/认证失败|auth/i.test(String(error?.message || ""))) {
        clearCachedSocketToken();
      }
      scheduleReconnect();
    });

    sock.on("auth_error", () => {
      isConnected.value = false;
      clearCachedSocketToken();
      scheduleReconnect();
    });

    socket.value = sock;
  }

  async function initSocket() {
    if (!merchantId.value || !chatId.value) {
      return;
    }

    try {
      const token = await fetchSocketToken();
      connectSocket(token);
    } catch (error) {
      showMerchantChatToast(runtimeUni, {
        title: error?.message || "连接聊天失败",
        icon: "none",
      });
    }
  }

  function queueSendTimeout(localMessageId) {
    resolveMerchantChatTimeout(
      settings.setTimeoutFn,
      () => {
        const target = messages.value.find((item) => item.mid === localMessageId);
        if (target && target.status === "sending") {
          target.status = "failed";
        }
      },
      DEFAULT_MERCHANT_CHAT_SEND_TIMEOUT_MS,
    );
  }

  function emitMessage(messageType, content) {
    const localMessageId = appendLocalMessage(true, content, messageType);
    socket.value.emit(
      "send_message",
      buildRoleChatOutgoingPayload({
        chatId: chatId.value,
        targetType: normalizeTargetType(),
        role: chatRole.value,
        targetId: targetId.value,
        targetName: chatTitle.value || inferTitleByRole(chatRole.value),
        targetAvatar: "",
        senderId: merchantId.value,
        senderRole: "merchant",
        sender: merchantName.value,
        avatar: merchantAvatar.value,
        messageType,
        content,
        tempId: localMessageId,
      }),
    );
    queueSendTimeout(localMessageId);
  }

  function sendText() {
    const content = normalizeMerchantChatText(draft.value);
    if (!content) {
      return;
    }
    if (!socket.value || !isConnected.value) {
      showMerchantChatToast(runtimeUni, {
        title: "连接中，请稍后重试",
        icon: "none",
      });
      return;
    }

    emitMessage("text", content);
    draft.value = "";
  }

  function chooseImage() {
    if (!socket.value || !isConnected.value) {
      showMerchantChatToast(runtimeUni, {
        title: "连接中，请稍后重试",
        icon: "none",
      });
      return;
    }

    chooseMerchantChatImage(runtimeUni, {
      count: 1,
      sizeType: ["compressed"],
      success: (result) => {
        const tempFilePath = result?.tempFilePaths?.[0];
        if (!tempFilePath) {
          return;
        }

        showMerchantChatLoading(runtimeUni, { title: "上传中..." });
        Promise.resolve(
          typeof settings.uploadImage === "function"
            ? settings.uploadImage(tempFilePath, {
                uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
              })
            : null,
        )
          .then((payload) => {
            hideMerchantChatLoading(runtimeUni);
            const imageUrl = normalizeMerchantChatText(resolveUploadAssetUrl(payload));
            if (!imageUrl) {
              showMerchantChatToast(runtimeUni, {
                title: "图片发送失败",
                icon: "none",
              });
              return;
            }

            emitMessage("image", imageUrl);
          })
          .catch(() => {
            hideMerchantChatLoading(runtimeUni);
            showMerchantChatToast(runtimeUni, {
              title: "图片发送失败",
              icon: "none",
            });
          });
      },
    });
  }

  function previewImage(url) {
    previewMerchantChatImage(runtimeUni, url);
  }

  function clearLocalMessages() {
    messages.value = [];
    showMerchantChatToast(runtimeUni, {
      title: "已清除当前设备记录",
      icon: "none",
    });
  }

  function goBack() {
    navigateMerchantChatBack(runtimeUni);
  }

  onLoadImpl((pageOptions = {}) => {
    const merchantAuth =
      typeof settings.readMerchantAuthIdentity === "function"
        ? settings.readMerchantAuthIdentity({ uniApp: runtimeUni })
        : {};
    const profile =
      (typeof settings.getMerchantProfile === "function"
        ? settings.getMerchantProfile()
        : null)
      || merchantAuth.profile
      || {};
    merchantId.value =
      (typeof settings.getMerchantId === "function" && settings.getMerchantId())
      || String(merchantAuth.merchantPhone || "");
    merchantName.value = String(merchantAuth.merchantName || "商户");
    merchantAvatar.value = String(profile.avatar || profile.logo || "");

    chatId.value = safeDecodeRoleChatValue(pageOptions.chatId || pageOptions.id || "");
    chatRole.value = normalizeRoleChatRole(pageOptions.role || "user", {
      allowedRoles: ["user", "rider", "admin"],
    });
    orderId.value = safeDecodeRoleChatValue(pageOptions.orderId || "");
    targetId.value = safeDecodeRoleChatValue(pageOptions.targetId || "");

    if (!chatId.value) {
      chatId.value = `merchant_${merchantId.value || "default"}`;
      chatRole.value = "admin";
    }

    const explicitTitle = safeDecodeRoleChatValue(pageOptions.name || "");
    chatTitle.value = explicitTitle || inferTitleByRole(chatRole.value);

    void loadSupportRuntimeConfig(!explicitTitle).finally(async () => {
      await ensureConversationExists();
      await loadServerHistory();
      await initSocket();
    });
  });

  onUnloadImpl(() => {
    if (reconnectTimer.value) {
      clearMerchantChatTimeout(settings.clearTimeoutFn, reconnectTimer.value);
      reconnectTimer.value = null;
    }
    if (socket.value && typeof socket.value.disconnect === "function") {
      socket.value.disconnect();
      socket.value = null;
    }
  });

  return {
    chatTitle,
    navSubtitle,
    draft,
    messages,
    scrollIntoView,
    displayText,
    chooseImage,
    sendText,
    previewImage,
    clearLocalMessages,
    goBack,
    loadSupportRuntimeConfig,
    loadServerHistory,
    initSocket,
    clearCachedSocketToken,
    _merchantChatDebug: {
      chatId,
      chatRole,
      orderId,
      targetId,
      merchantId,
      merchantName,
      merchantAvatar,
      socket,
      isConnected,
      supportTitle,
      reconnectTimer,
    },
  };
}
