function trimValue(value) {
  return String(value || "").trim();
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

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolvePlusRuntime(plusRuntime) {
  return plusRuntime || globalThis.plus || null;
}

function resolveDocumentRef(documentRef) {
  return documentRef || globalThis.document || null;
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

export function extractPushEventEnvelope(rawMessage) {
  const message = parseJSON(rawMessage) || {};
  const payload = parseJSON(message.payload !== undefined ? message.payload : message) || {};
  const details = payload && typeof payload === "object" ? payload : {};

  const messageId = trimValue(
    message.messageId ||
      message.message_id ||
      details.messageId ||
      details.message_id,
  );
  const notificationId = trimValue(
    details.notificationId ||
      details.notification_id ||
      details.id,
  );
  const route = normalizeRoute(details.route || details.path || details.url);

  return {
    rawMessage: message,
    payload: details,
    messageId,
    notificationId,
    route,
    title: trimValue(message.title || details.title),
    content: trimValue(message.content || details.content || details.body),
  };
}

function waitForPlusReady(plusRuntime, documentRef) {
  return new Promise((resolve) => {
    if (plusRuntime && plusRuntime.push) {
      resolve();
      return;
    }

    if (documentRef && typeof documentRef.addEventListener === "function") {
      documentRef.addEventListener("plusready", () => resolve(), false);
      return;
    }

    resolve();
  });
}

function navigateByEnvelope(uniApp, envelope, resolveClickUrl) {
  if (!uniApp || typeof uniApp.navigateTo !== "function") {
    return;
  }

  let targetUrl = "";
  try {
    targetUrl = normalizeRoute(
      typeof resolveClickUrl === "function" ? resolveClickUrl(envelope) : envelope.route,
    );
  } catch (_error) {
    targetUrl = envelope.route;
  }

  if (!targetUrl || /^https?:\/\//i.test(targetUrl)) {
    return;
  }

  uniApp.navigateTo({
    url: targetUrl,
    fail() {
      if (typeof uniApp.reLaunch === "function") {
        uniApp.reLaunch({ url: targetUrl });
      }
    },
  });
}

async function sendAck(ackPushMessage, action, envelope, logger) {
  if (typeof ackPushMessage !== "function" || !envelope.messageId) {
    return;
  }

  try {
    await ackPushMessage({
      messageId: envelope.messageId,
      action,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("push acknowledge failed:", error);
  }
}

export function createPushEventBridgeController(options = {}) {
  const loggerTag = trimValue(options.loggerTag) || "PushBridge";
  const logger = normalizeLogger(options.logger, loggerTag);
  const uniApp = resolveUniRuntime(options.uniApp);
  const documentRef = resolveDocumentRef(options.documentRef);
  let started = false;
  let startPromise = null;

  async function start() {
    if (started) {
      return;
    }
    if (startPromise) {
      return startPromise;
    }

    startPromise = (async () => {
      await waitForPlusReady(resolvePlusRuntime(options.plusRuntime), documentRef);
      const plusRuntime = resolvePlusRuntime(options.plusRuntime);
      if (
        !plusRuntime ||
        !plusRuntime.push ||
        typeof plusRuntime.push.addEventListener !== "function"
      ) {
        return;
      }

      const handleReceive = async (rawMessage) => {
        const envelope = extractPushEventEnvelope(rawMessage);
        await sendAck(options.ackPushMessage, "received", envelope, logger);
        if (typeof options.onReceive === "function") {
          options.onReceive(envelope);
        }
        if (uniApp && typeof uniApp.$emit === "function") {
          uniApp.$emit("push:received", envelope);
        }
      };

      const handleClick = async (rawMessage) => {
        const envelope = extractPushEventEnvelope(rawMessage);
        await sendAck(options.ackPushMessage, "opened", envelope, logger);
        if (typeof options.onClick === "function") {
          options.onClick(envelope);
        }
        navigateByEnvelope(uniApp, envelope, options.resolveClickUrl);
        if (uniApp && typeof uniApp.$emit === "function") {
          uniApp.$emit("push:clicked", envelope);
        }
      };

      plusRuntime.push.addEventListener("receive", handleReceive);
      plusRuntime.push.addEventListener("click", handleClick);
      started = true;
    })();

    try {
      await startPromise;
    } finally {
      if (!started) {
        startPromise = null;
      }
    }
  }

  return {
    start,
    isStarted() {
      return started;
    },
  };
}

let defaultPushEventBridgeController = null;

export function startPushEventBridge(options = {}) {
  if (!defaultPushEventBridgeController) {
    defaultPushEventBridgeController = createPushEventBridgeController(options);
  }
  return defaultPushEventBridgeController.start();
}

export function resetPushEventBridgeForTest() {
  defaultPushEventBridgeController = null;
}
