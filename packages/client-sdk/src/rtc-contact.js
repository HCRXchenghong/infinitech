import {
  buildSocketTokenAccountKey,
  extractSocketTokenResult,
} from "./realtime-token.js";

function trimValue(value) {
  return String(value || "").trim();
}

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveGetCurrentPages(getCurrentPagesFn) {
  if (typeof getCurrentPagesFn === "function") {
    return getCurrentPagesFn;
  }
  if (typeof globalThis.getCurrentPages === "function") {
    return globalThis.getCurrentPages;
  }
  return null;
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

function parseJSON(value) {
  if (typeof value !== "string") {
    return value;
  }

  const raw = value.trim();
  if (!raw) {
    return value;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return value;
  }
}

function normalizeParticipantRole(raw) {
  switch (trimValue(raw).toLowerCase()) {
    case "shop":
    case "merchant":
      return "merchant";
    case "customer":
    case "user":
      return "user";
    case "rider":
      return "rider";
    case "support":
    case "admin":
      return "admin";
    default:
      return "";
  }
}

function resolveCurrentPlatform(options = {}) {
  const explicitPlatform = trimValue(options.platform);
  if (explicitPlatform) {
    return explicitPlatform;
  }
  if (typeof options.resolvePlatform === "function") {
    return trimValue(options.resolvePlatform());
  }
  const uniApp = resolveUniRuntime(options.uniApp);
  try {
    const info = uniApp && typeof uniApp.getSystemInfoSync === "function"
      ? uniApp.getSystemInfoSync() || {}
      : {};
    return trimValue(info.uniPlatform || info.platform || "");
  } catch (_error) {
    return "";
  }
}

export function canUseRTCContact(options = {}) {
  const platform = trimValue(options.platform || resolveCurrentPlatform(options)).toLowerCase();
  if (!platform) {
    return false;
  }
  if (platform === "app-plus" || platform === "h5" || platform === "web") {
    return true;
  }
  return !platform.startsWith("mp-");
}

function normalizeCallId(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return trimValue(value);
  }
  if (typeof value === "object") {
    return trimValue(value.uid || value.callId || value.call_id_raw || value.call_id);
  }
  return "";
}

function normalizeCallPayload(payload = {}, options = {}) {
  return {
    callId: normalizeCallId(payload.callId),
    calleeRole: normalizeParticipantRole(payload.calleeRole || payload.targetRole),
    calleeId: trimValue(payload.calleeId || payload.targetId),
    calleePhone: trimValue(payload.calleePhone || payload.targetPhone),
    conversationId: trimValue(payload.conversationId),
    orderId: trimValue(payload.orderId),
    entryPoint: trimValue(payload.entryPoint),
    scene: trimValue(payload.scene),
    clientPlatform: trimValue(payload.clientPlatform || resolveCurrentPlatform(options)),
    clientKind: trimValue(payload.clientKind || options.clientKind || "uni-app"),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined,
  };
}

function createNoopSession(callId) {
  return {
    callId,
    connected: false,
    emit() {},
    join() {},
    accept() {},
    reject() {},
    cancel() {},
    timeout() {},
    end() {},
    signal() {},
    disconnect() {},
  };
}

function normalizeSocketTokenResponse(response) {
  const payload = response && typeof response === "object" && "data" in response
    ? parseJSON(response.data)
    : response;
  return extractSocketTokenResult(payload).token;
}

function defaultResolveIncomingTargetName(role) {
  if (role === "rider") {
    return "Rider";
  }
  if (role === "merchant") {
    return "Merchant";
  }
  return "Contact";
}

function buildIncomingCallUrl(payload, options = {}) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const call = safePayload.call || safePayload || {};
  const callId = normalizeCallId(call) || trimValue(safePayload.callId);
  const callerRole = trimValue(call.callerRole || call.caller_role || safePayload.fromRole);
  const callerId = trimValue(call.callerId || call.caller_id || safePayload.fromId);
  const orderId = trimValue(call.orderId || call.order_id);
  const conversationId = trimValue(call.conversationId || call.conversation_id);
  const resolveIncomingTargetName =
    typeof options.resolveIncomingTargetName === "function"
      ? options.resolveIncomingTargetName
      : defaultResolveIncomingTargetName;
  const targetName = trimValue(resolveIncomingTargetName(callerRole, safePayload, call));
  const callPagePath = trimValue(options.callPagePath || "/pages/rtc/call/index");

  return (
    `${callPagePath}?mode=incoming` +
    `&callId=${encodeURIComponent(callId)}` +
    `&orderId=${encodeURIComponent(orderId)}` +
    `&conversationId=${encodeURIComponent(conversationId)}` +
    `&targetRole=${encodeURIComponent(callerRole)}` +
    `&targetId=${encodeURIComponent(callerId)}` +
    `&targetName=${encodeURIComponent(targetName)}`
  );
}

export function createRTCContactHelper(options = {}) {
  const createRTCCall =
    typeof options.createRTCCall === "function" ? options.createRTCCall : null;
  const updateRTCCallStatus =
    typeof options.updateRTCCallStatus === "function" ? options.updateRTCCallStatus : null;
  const createSocket =
    typeof options.createSocket === "function" ? options.createSocket : null;
  const getSocketToken =
    typeof options.getSocketToken === "function" ? options.getSocketToken : null;

  async function connectSignalSession(callId, handlers = {}) {
    const socketUrl = trimValue(
      typeof options.getSocketUrl === "function" ? options.getSocketUrl() : options.socketUrl,
    );
    if (!createSocket || !socketUrl || !getSocketToken) {
      return createNoopSession(callId);
    }

    const token = trimValue(await getSocketToken());
    if (!token) {
      throw new Error("socket token is required for rtc signaling");
    }

    const socket = createSocket(socketUrl, "/rtc", token).connect();
    const eventNames = [
      "connect",
      "disconnect",
      "connect_error",
      "auth_error",
      "rtc_ready",
      "rtc_error",
      "rtc_call_created",
      "rtc_invite",
      "rtc_status",
      "rtc_signal",
      "rtc_joined",
      "rtc_left",
    ];

    eventNames.forEach((eventName) => {
      if (typeof handlers[eventName] === "function") {
        socket.on(eventName, handlers[eventName]);
      }
    });

    const normalizedCallId = normalizeCallId(callId);

    return {
      callId: normalizedCallId,
      connected: true,
      emit(eventName, payload = {}) {
        socket.emit(eventName, payload);
      },
      join() {
        socket.emit("rtc_join_call", { callId: normalizedCallId });
      },
      accept(extra = {}) {
        socket.emit("rtc_accept_call", { callId: normalizedCallId, ...extra });
      },
      reject(extra = {}) {
        socket.emit("rtc_reject_call", { callId: normalizedCallId, ...extra });
      },
      cancel(extra = {}) {
        socket.emit("rtc_cancel_call", { callId: normalizedCallId, ...extra });
      },
      timeout(extra = {}) {
        socket.emit("rtc_timeout_call", { callId: normalizedCallId, ...extra });
      },
      end(extra = {}) {
        socket.emit("rtc_end_call", { callId: normalizedCallId, ...extra });
      },
      signal(signalType, signal, extra = {}) {
        socket.emit("rtc_signal", {
          callId: normalizedCallId,
          signalType,
          signal,
          ...extra,
        });
      },
      disconnect() {
        socket.disconnect();
      },
    };
  }

  async function startCall(payload = {}, handlers = {}) {
    if (!createRTCCall) {
      throw new Error("createRTCCall is required");
    }
    if (!canUseRTCContact(options)) {
      throw new Error("rtc_not_supported_on_current_platform");
    }

    const normalizedPayload = normalizeCallPayload(payload, options);
    if (!normalizedPayload.calleeRole || !normalizedPayload.calleeId) {
      throw new Error("calleeRole and calleeId are required");
    }

    const callRecord = await createRTCCall(normalizedPayload);
    const callId = normalizeCallId(callRecord);
    if (!callId) {
      throw new Error("rtc_call_id_missing");
    }

    const session = await connectSignalSession(callId, handlers);
    if (session.connected) {
      session.emit("rtc_start_call", {
        ...normalizedPayload,
        callId,
      });
    }

    return {
      call: callRecord,
      callId,
      session,
    };
  }

  async function updateStatus(callId, payload = {}) {
    if (!updateRTCCallStatus) {
      throw new Error("updateRTCCallStatus is required");
    }
    const normalizedCallId = normalizeCallId(callId);
    if (!normalizedCallId) {
      throw new Error("callId is required");
    }
    return updateRTCCallStatus(normalizedCallId, payload);
  }

  return {
    canUseRTCContact,
    connectSignalSession,
    startCall,
    updateStatus,
  };
}

export function createUniRTCContactBridge(options = {}) {
  const uniApp = resolveUniRuntime(options.uniApp);
  const getCurrentPagesFn = resolveGetCurrentPages(options.getCurrentPagesFn);
  const socketTokenStorageKey = trimValue(options.socketTokenStorageKey || "socket_token");
  const socketTokenAccountKeyStorageKey = trimValue(
    options.socketTokenAccountKeyStorageKey || "socket_token_account_key",
  );
  const tokenStorageKey = trimValue(options.tokenStorageKey || "token");
  const authModeStorageKey = trimValue(options.authModeStorageKey || "authMode");
  const role = trimValue(options.role || "user");
  const authMode = trimValue(options.authMode || role);

  let inviteBridgeSocket = null;

  const rtcHelper = createRTCContactHelper({
    ...options,
    uniApp,
    getSocketToken: ensureSocketToken,
  });

  function getCachedRTCRuntimeSettings() {
    if (typeof options.getCachedRTCRuntimeSettings === "function") {
      return options.getCachedRTCRuntimeSettings();
    }
    return { enabled: true };
  }

  function canUseCurrentRTCContact() {
    return canUseRTCContact({ ...options, uniApp }) && getCachedRTCRuntimeSettings().enabled !== false;
  }

  async function requestSocketToken({ socketUrl, currentUserId }) {
    if (typeof options.requestSocketToken === "function") {
      return options.requestSocketToken({
        socketUrl,
        currentUserId,
        role,
      });
    }

    if (!uniApp || typeof uniApp.request !== "function") {
      throw new Error("uni.request is not available");
    }

    return new Promise((resolve, reject) => {
      uniApp.request({
        url: `${socketUrl}/api/generate-token`,
        method: "POST",
        header: Object.assign(
          { "Content-Type": "application/json" },
          typeof options.readAuthorizationHeader === "function"
            ? options.readAuthorizationHeader()
            : {},
        ),
        data: { userId: currentUserId, role },
        success: resolve,
        fail: reject,
      });
    });
  }

  async function ensureSocketToken() {
    const currentUserId = trimValue(
      typeof options.resolveCurrentUserId === "function" ? options.resolveCurrentUserId() : "",
    );
    if (!currentUserId) {
      throw new Error("missing current user id");
    }

    const accountKey = buildSocketTokenAccountKey(currentUserId, role);
    const cached = trimValue(readStorage(uniApp, socketTokenStorageKey));
    const cachedAccountKey = trimValue(readStorage(uniApp, socketTokenAccountKeyStorageKey));
    if (cached && cachedAccountKey === accountKey) {
      return cached;
    }
    if (cached && cachedAccountKey !== accountKey) {
      removeStorage(uniApp, socketTokenStorageKey);
      removeStorage(uniApp, socketTokenAccountKeyStorageKey);
    }

    const socketUrl = trimValue(
      typeof options.getSocketUrl === "function" ? options.getSocketUrl() : options.socketUrl,
    );
    if (!socketUrl) {
      throw new Error("socket url is required");
    }

    const response = await requestSocketToken({ socketUrl, currentUserId });
    const token = trimValue(normalizeSocketTokenResponse(response));
    if (!token) {
      throw new Error("failed to generate socket token");
    }
    writeStorage(uniApp, socketTokenStorageKey, token);
    writeStorage(uniApp, socketTokenAccountKeyStorageKey, accountKey);
    return token;
  }

  function getCurrentPageInfo() {
    if (!getCurrentPagesFn) {
      return null;
    }
    try {
      const pages = getCurrentPagesFn();
      if (!Array.isArray(pages) || pages.length === 0) {
        return null;
      }
      return pages[pages.length - 1] || null;
    } catch (_error) {
      return null;
    }
  }

  async function ensureRTCInviteBridge() {
    const token = trimValue(readStorage(uniApp, tokenStorageKey));
    const runtimeAuthMode = trimValue(readStorage(uniApp, authModeStorageKey));
    if (!token || runtimeAuthMode !== authMode) {
      disconnectRTCInviteBridge();
      return null;
    }

    if (inviteBridgeSocket) {
      return inviteBridgeSocket;
    }

    if (typeof options.createSocket !== "function") {
      throw new Error("createSocket is required");
    }

    const socketToken = await ensureSocketToken();
    const socketUrl = trimValue(
      typeof options.getSocketUrl === "function" ? options.getSocketUrl() : options.socketUrl,
    );
    const socket = options.createSocket(socketUrl, "/rtc", socketToken).connect();

    socket.on("auth_error", () => {
      disconnectRTCInviteBridge();
    });

    socket.on("rtc_invite", (payload = {}) => {
      const safePayload = payload && typeof payload === "object" ? payload : {};
      const callId =
        normalizeCallId(safePayload.call || safePayload) || trimValue(safePayload.callId);
      if (!callId) {
        return;
      }

      const currentPage = getCurrentPageInfo();
      const currentRoute = currentPage && currentPage.route ? `/${currentPage.route}` : "";
      const currentOptions = currentPage && currentPage.options ? currentPage.options : {};
      const currentCallId = trimValue(currentOptions.callId);
      const callPagePath = trimValue(options.callPagePath || "/pages/rtc/call/index");
      if (currentRoute === callPagePath && currentCallId === callId) {
        return;
      }

      if (uniApp && typeof uniApp.navigateTo === "function") {
        uniApp.navigateTo({
          url: buildIncomingCallUrl(safePayload, options),
          fail: () => {},
        });
      }
    });

    inviteBridgeSocket = socket;
    return socket;
  }

  function disconnectRTCInviteBridge() {
    if (!inviteBridgeSocket) {
      return;
    }
    inviteBridgeSocket.disconnect();
    inviteBridgeSocket = null;
  }

  return {
    canUseCurrentRTCContact,
    getCachedRTCRuntimeSettings,
    loadRTCRuntimeSettings: typeof options.loadRTCRuntimeSettings === "function"
      ? options.loadRTCRuntimeSettings
      : async () => ({ enabled: true }),
    startRTCCall(payload, handlers = {}) {
      return rtcHelper.startCall(
        {
          clientKind: trimValue(options.clientKind || "uni-app"),
          clientPlatform: trimValue(payload && payload.clientPlatform),
          ...payload,
        },
        handlers,
      );
    },
    connectRTCSignalSession(callId, handlers = {}) {
      return rtcHelper.connectSignalSession(callId, handlers);
    },
    updateRTCCall(callId, payload = {}) {
      return rtcHelper.updateStatus(callId, payload);
    },
    fetchRTCCall(callId) {
      if (typeof options.getRTCCall !== "function") {
        throw new Error("getRTCCall is required");
      }
      return options.getRTCCall(callId);
    },
    fetchRTCCallHistory(params = {}) {
      if (typeof options.listRTCCallHistory !== "function") {
        throw new Error("listRTCCallHistory is required");
      }
      return options.listRTCCallHistory(params);
    },
    ensureSocketToken,
    ensureRTCInviteBridge,
    disconnectRTCInviteBridge,
  };
}
