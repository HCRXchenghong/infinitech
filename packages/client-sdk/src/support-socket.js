function trimValue(value) {
  return String(value || "").trim();
}

function createEventQueueItem(type, roomId, text = "") {
  return {
    type,
    roomId: trimValue(roomId),
    text: trimValue(text),
  };
}

export function createSupportSocketService(options = {}) {
  const createSocket = typeof options.createSocket === "function" ? options.createSocket : null;
  const namespace = trimValue(options.namespace || "/support") || "/support";
  const socketUrl = trimValue(options.socketUrl);
  const joinEvent = trimValue(options.joinEvent || "join") || "join";
  const messageEvent = trimValue(options.messageEvent || "msg") || "msg";
  const emitMessage = typeof options.emitMessage === "function" ? options.emitMessage : () => {};

  let socket = null;
  let messageQueue = [];
  let isConnected = false;
  let isConnecting = false;
  let token = "";

  function flushQueue() {
    if (!socket || !isConnected || messageQueue.length === 0) {
      return;
    }

    while (messageQueue.length > 0) {
      const item = messageQueue.shift();
      if (!item) {
        continue;
      }
      if (item.type === "message" && item.text) {
        socket.emit(messageEvent, { room: item.roomId, text: item.text });
        continue;
      }
      if (item.type === "join" && item.roomId) {
        socket.emit(joinEvent, item.roomId);
      }
    }
  }

  function connect(nextToken = "") {
    if (nextToken) {
      token = trimValue(nextToken);
    }

    if (socket && isConnected) {
      flushQueue();
      return;
    }

    if (isConnecting) {
      return;
    }

    if (!createSocket) {
      throw new Error("createSocket is required");
    }

    isConnecting = true;

    if (socket) {
      try {
        socket.disconnect();
      } catch (_error) {
        // ignore stale socket cleanup errors
      }
      socket = null;
    }

    const currentSocket = createSocket(socketUrl, namespace, token).connect();
    socket = currentSocket;

    currentSocket.on("connect", () => {
      isConnected = true;
      isConnecting = false;
      flushQueue();
    });

    currentSocket.on("disconnect", () => {
      isConnected = false;
      isConnecting = false;
    });

    currentSocket.on("connect_error", () => {
      isConnecting = false;
    });

    currentSocket.on("auth_error", () => {
      isConnected = false;
      isConnecting = false;
      token = "";
    });

    currentSocket.on(messageEvent, (data) => {
      emitMessage(data);
    });
  }

  function joinRoom(roomId) {
    const normalizedRoomId = trimValue(roomId);
    if (!normalizedRoomId) {
      return;
    }

    connect();
    if (socket && isConnected) {
      socket.emit(joinEvent, normalizedRoomId);
      return;
    }
    messageQueue.push(createEventQueueItem("join", normalizedRoomId));
  }

  function send(roomId, text) {
    const normalizedRoomId = trimValue(roomId);
    const normalizedText = trimValue(text);
    if (!normalizedRoomId || !normalizedText) {
      return;
    }

    if (socket && isConnected) {
      socket.emit(messageEvent, { room: normalizedRoomId, text: normalizedText });
      return;
    }

    messageQueue.push(createEventQueueItem("message", normalizedRoomId, normalizedText));
    connect();
  }

  function close() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    isConnected = false;
    isConnecting = false;
    messageQueue = [];
  }

  function getState() {
    return {
      isConnected,
      isConnecting,
      queueLength: messageQueue.length,
    };
  }

  return {
    connect,
    joinRoom,
    send,
    close,
    getState,
  };
}

export function createUniSupportSocketBridge(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const messageEventName = trimValue(options.messageEventName || "chat-message") || "chat-message";
  return createSupportSocketService({
    ...options,
    emitMessage(data) {
      if (typeof options.emitMessage === "function") {
        options.emitMessage(data);
      }
      if (uniApp && typeof uniApp.$emit === "function") {
        uniApp.$emit(messageEventName, data);
      }
    },
  });
}
