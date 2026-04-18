function resolveLogger(options = {}) {
  const logger = options.logger;

  if (logger && typeof logger.error === "function") {
    return logger;
  }

  const loggerTag = String(options.loggerTag || "App").trim();
  return {
    error(...args) {
      console.error(`[${loggerTag}]`, ...args);
    },
  };
}

export function createConsumerAppBridgeManager(options = {}) {
  const logger = resolveLogger(options);
  const hasActiveSession =
    typeof options.hasActiveSession === "function"
      ? options.hasActiveSession
      : () => false;
  const registerCurrentPushDevice =
    typeof options.registerCurrentPushDevice === "function"
      ? options.registerCurrentPushDevice
      : async () => {};
  const clearPushRegistrationState =
    typeof options.clearPushRegistrationState === "function"
      ? options.clearPushRegistrationState
      : () => {};
  const connectCurrentRealtimeChannel =
    typeof options.connectCurrentRealtimeChannel === "function"
      ? options.connectCurrentRealtimeChannel
      : async () => {};
  const clearRealtimeState =
    typeof options.clearRealtimeState === "function"
      ? options.clearRealtimeState
      : () => {};
  const ensureUserRTCInviteBridge =
    typeof options.ensureUserRTCInviteBridge === "function"
      ? options.ensureUserRTCInviteBridge
      : async () => {};
  const disconnectUserRTCInviteBridge =
    typeof options.disconnectUserRTCInviteBridge === "function"
      ? options.disconnectUserRTCInviteBridge
      : () => {};

  async function runBridgeTask(name, task) {
    try {
      await task();
    } catch (error) {
      logger.error(`${name} failed:`, error);
    }
  }

  function teardownBridges() {
    clearPushRegistrationState();
    clearRealtimeState();
    disconnectUserRTCInviteBridge();
  }

  async function syncBridges() {
    if (!hasActiveSession()) {
      teardownBridges();
      return false;
    }

    await runBridgeTask("push registration", registerCurrentPushDevice);
    await runBridgeTask("realtime notify", connectCurrentRealtimeChannel);
    await runBridgeTask("rtc invite bridge", ensureUserRTCInviteBridge);
    return true;
  }

  return {
    syncBridges,
    teardownBridges,
  };
}
