import {
  buildSocketTokenAccountKey,
  clearCachedSocketToken,
  resolveSocketToken,
} from "./realtime-token.js";

function trimValue(value) {
  return String(value || "").trim();
}

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function readStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function writeStorage(uniApp, key, value) {
  if (!uniApp || typeof uniApp.setStorageSync !== "function") {
    return;
  }

  try {
    uniApp.setStorageSync(key, value);
  } catch (_error) {
    // Ignore storage write failures in constrained runtimes.
  }
}

function removeStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.removeStorageSync !== "function") {
    return;
  }

  try {
    uniApp.removeStorageSync(key);
  } catch (_error) {
    // Ignore storage cleanup failures in constrained runtimes.
  }
}

function normalizeRoute(route) {
  const raw = trimValue(route);
  if (!raw) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(raw)) {
    return raw;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function normalizeEnvelope(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const refreshTargets = Array.isArray(source.refreshTargets)
    ? source.refreshTargets.map((item) => trimValue(item).toLowerCase()).filter(Boolean)
    : [];

  return {
    eventType: trimValue(source.eventType),
    title: trimValue(source.title),
    content: trimValue(source.content || source.body),
    route: normalizeRoute(source.route || source.path || source.url),
    messageId: trimValue(source.messageId || source.message_id),
    refreshTargets,
    payload: source,
  };
}

function shortenToastText(title, content) {
  const text = trimValue(title) || trimValue(content);
  if (!text) {
    return "";
  }
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

function normalizeLogger(logger, loggerTag) {
  if (logger && typeof logger === "object") {
    return {
      error: typeof logger.error === "function"
        ? (...args) => logger.error(...args)
        : (...args) => console.error(...args),
    };
  }

  return {
    error: (...args) => console.error(`[${loggerTag}]`, ...args),
  };
}

function normalizeTimer(setTimeoutFn, clearTimeoutFn) {
  return {
    setTimeoutFn: typeof setTimeoutFn === "function" ? setTimeoutFn : globalThis.setTimeout,
    clearTimeoutFn: typeof clearTimeoutFn === "function" ? clearTimeoutFn : globalThis.clearTimeout,
  };
}

export function createRealtimeNotifyBridge(options = {}) {
  const loggerTag = trimValue(options.loggerTag) || "RealtimeNotify";
  const storageKey = trimValue(options.storageKey) || "realtime_notify_state";
  const tokenStorageKey = trimValue(options.tokenStorageKey) || "socket_token";
  const tokenAccountKeyStorageKey = trimValue(options.tokenAccountKeyStorageKey) ||
    "socket_token_account_key";
  const eventName = trimValue(options.eventName) || "business_notification";
  const reconnectDelayMs = Number(options.reconnectDelayMs || 3000);
  const seenMessageTTL = Number(options.seenMessageTTL || 120000);
  const nowFn = typeof options.nowFn === "function" ? options.nowFn : () => Date.now();
  const uniApp = resolveUniRuntime(options.uniApp);
  const logger = normalizeLogger(options.logger, loggerTag);
  const timer = normalizeTimer(options.setTimeoutFn, options.clearTimeoutFn);

  let socket = null;
  let isConnected = false;
  let isConnecting = false;
  let reconnectTimer = null;
  const seenMessages = new Map();

  function clearSeenMessages() {
    const cutoff = nowFn() - seenMessageTTL;
    for (const [messageId, timestamp] of seenMessages.entries()) {
      if (timestamp < cutoff) {
        seenMessages.delete(messageId);
      }
    }
  }

  function rememberMessage(messageId) {
    if (!messageId) {
      return false;
    }
    clearSeenMessages();
    if (seenMessages.has(messageId)) {
      return true;
    }
    seenMessages.set(messageId, nowFn());
    return false;
  }

  function resolveIdentityAccountKey(identity) {
    if (typeof options.resolveTokenAccountKey === "function") {
      return trimValue(options.resolveTokenAccountKey(identity));
    }
    return buildSocketTokenAccountKey(identity && identity.userId, identity && identity.role);
  }

  function clearTokenCache() {
    clearCachedSocketToken({
      uniApp,
      tokenStorageKey,
      tokenAccountKeyStorageKey,
    });
  }

  async function fetchSocketToken(identity, forceRefresh = false) {
    return resolveSocketToken({
      uniApp,
      userId: trimValue(identity && identity.userId),
      role: trimValue(identity && identity.role),
      identity,
      accountKey: resolveIdentityAccountKey(identity),
      tokenStorageKey,
      tokenAccountKeyStorageKey,
      forceRefresh,
      getSocketURL: options.getSocketURL,
      socketUrl: options.socketUrl,
      authToken: trimValue(identity && identity.authToken),
      requestSocketToken: options.requestSocketToken,
      missingAccountKeyMessage: "missing realtime socket account key",
      missingAuthorizationMessage: "missing auth token for realtime socket",
      missingSocketUrlMessage: "socket url is not configured",
      missingTokenMessage: "missing socket token from response",
    });
  }

  function emitUniEvent(name, payload) {
    if (uniApp && typeof uniApp.$emit === "function") {
      uniApp.$emit(name, payload);
    }
  }

  function emitEnvelope(envelope) {
    emitUniEvent("realtime:notification", envelope);
    if (envelope.eventType) {
      emitUniEvent(`realtime:event:${envelope.eventType}`, envelope);
    }
    for (const target of envelope.refreshTargets || []) {
      emitUniEvent(`realtime:refresh:${target}`, envelope);
    }
    if (typeof options.onReceive === "function") {
      options.onReceive(envelope);
    }

    const toastText = shortenToastText(envelope.title, envelope.content);
    if (toastText && uniApp && typeof uniApp.showToast === "function") {
      uniApp.showToast({ title: toastText, icon: "none" });
    }
  }

  function handleEvent(payload) {
    const envelope = normalizeEnvelope(payload);
    if (rememberMessage(envelope.messageId)) {
      return;
    }
    emitEnvelope(envelope);
  }

  function clearReconnectTimer() {
    if (reconnectTimer && typeof timer.clearTimeoutFn === "function") {
      timer.clearTimeoutFn(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function disconnectRealtimeChannel() {
    clearReconnectTimer();
    if (socket) {
      try {
        socket.disconnect();
      } catch (_error) {
        // Ignore stale socket disconnect failures during cleanup.
      }
      socket = null;
    }
    isConnected = false;
    isConnecting = false;
    emitUniEvent("realtime:disconnected", { namespace: "notify" });
  }

  function clearRealtimeState() {
    disconnectRealtimeChannel();
    clearTokenCache();
    removeStorage(uniApp, storageKey);
  }

  function scheduleReconnect(forceTokenRefresh = false) {
    clearReconnectTimer();
    if (typeof timer.setTimeoutFn !== "function") {
      return;
    }
    reconnectTimer = timer.setTimeoutFn(() => {
      void connectCurrentRealtimeChannel({ forceTokenRefresh });
    }, reconnectDelayMs);
  }

  async function connectCurrentRealtimeChannel({ forceTokenRefresh = false } = {}) {
    if (socket && isConnected && !forceTokenRefresh) {
      return;
    }
    if (isConnecting) {
      return;
    }

    const identity = typeof options.resolveAuthIdentity === "function"
      ? options.resolveAuthIdentity()
      : null;
    if (
      !identity ||
      !trimValue(identity.userId) ||
      !trimValue(identity.role) ||
      !trimValue(identity.authToken)
    ) {
      clearRealtimeState();
      return;
    }

    const socketUrl = trimValue(
      typeof options.getSocketURL === "function" ? options.getSocketURL() : options.socketUrl,
    );
    if (!socketUrl) {
      return;
    }

    if (typeof options.createSocket !== "function") {
      throw new Error("createSocket is required");
    }

    isConnecting = true;

    try {
      const token = await fetchSocketToken(identity, forceTokenRefresh);

      if (socket) {
        try {
          socket.disconnect();
        } catch (_error) {
          // Ignore stale socket cleanup failures before reconnecting.
        }
        socket = null;
      }

      const createdSocket = options.createSocket(socketUrl, "/notify", token);
      socket = createdSocket && typeof createdSocket.connect === "function"
        ? createdSocket.connect()
        : createdSocket;

      socket.on("connect", () => {
        isConnected = true;
        isConnecting = false;
        clearReconnectTimer();
        writeStorage(
          uniApp,
          storageKey,
          JSON.stringify({
            userId: trimValue(identity.userId),
            role: trimValue(identity.role),
            connectedAt: nowFn(),
          }),
        );
        emitUniEvent("realtime:connected", { namespace: "notify" });
      });

      socket.on(eventName, handleEvent);
      socket.on("disconnect", () => {
        isConnected = false;
        isConnecting = false;
        emitUniEvent("realtime:disconnected", { namespace: "notify" });
        scheduleReconnect(false);
      });

      socket.on("connect_error", (error) => {
        logger.error("realtime connect error:", error);
        isConnected = false;
        isConnecting = false;
        scheduleReconnect(false);
      });

      socket.on("auth_error", (error) => {
        logger.error("realtime auth error:", error);
        isConnected = false;
        isConnecting = false;
        clearTokenCache();
        scheduleReconnect(true);
      });
    } catch (error) {
      logger.error("realtime connect failed:", error);
      isConnected = false;
      isConnecting = false;
      scheduleReconnect(forceTokenRefresh);
    }
  }

  return {
    connectCurrentRealtimeChannel,
    disconnectRealtimeChannel,
    clearRealtimeState,
  };
}
