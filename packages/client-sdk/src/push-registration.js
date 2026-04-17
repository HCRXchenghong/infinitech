function trimValue(value) {
  return String(value || "").trim();
}

function resolveUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolvePlusRuntime(plusRuntime) {
  return plusRuntime || globalThis.plus || null;
}

function resolveIntlApi(intlApi) {
  return intlApi || globalThis.Intl || null;
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

function resolveTimezone(intlApi) {
  try {
    if (intlApi && typeof intlApi.DateTimeFormat === "function") {
      const timezone = intlApi.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        return timezone;
      }
    }
  } catch (_error) {
    // Ignore timezone detection failures and fall back to offset formatting.
  }

  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0");
  const remainder = String(Math.abs(minutes) % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${remainder}`;
}

function defaultGetSystemInfo(uniApp) {
  if (!uniApp || typeof uniApp.getSystemInfoSync !== "function") {
    return {};
  }

  try {
    return uniApp.getSystemInfoSync() || {};
  } catch (_error) {
    return {};
  }
}

function defaultGetPushClientInfo(plusRuntime) {
  if (
    !plusRuntime ||
    !plusRuntime.push ||
    typeof plusRuntime.push.getClientInfo !== "function"
  ) {
    return null;
  }

  try {
    return plusRuntime.push.getClientInfo() || {};
  } catch (_error) {
    return null;
  }
}

export function extractPushDeviceToken(pushInfo = {}) {
  if (!pushInfo || typeof pushInfo !== "object") {
    return "";
  }

  const candidates = [
    pushInfo.clientid,
    pushInfo.clientId,
    pushInfo.token,
    pushInfo.deviceToken,
  ];

  for (const candidate of candidates) {
    const token = trimValue(candidate);
    if (token) {
      return token;
    }
  }

  return "";
}

function readState(uniApp, storageKey) {
  const raw = readStorage(uniApp, storageKey);
  if (!raw) {
    return null;
  }

  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_error) {
    return null;
  }
}

function buildFingerprint(payload) {
  return [
    trimValue(payload.userId),
    trimValue(payload.userType),
    trimValue(payload.deviceToken),
    trimValue(payload.appVersion),
    trimValue(payload.locale),
    trimValue(payload.timezone),
    trimValue(payload.appEnv),
  ].join("|");
}

export function createPushRegistrationManager(options = {}) {
  const storageKey = trimValue(options.storageKey) || "push_registration";
  const minRegisterIntervalMs = Number(options.minRegisterIntervalMs || 10 * 60 * 1000);
  const getNow = typeof options.nowFn === "function" ? options.nowFn : () => Date.now();
  const uniApp = resolveUniRuntime(options.uniApp);
  const plusRuntime = resolvePlusRuntime(options.plusRuntime);
  const intlApi = resolveIntlApi(options.intlApi);

  const clearPushRegistrationState = () => {
    removeStorage(uniApp, storageKey);
  };

  const getCachedRegistrationState = () => readState(uniApp, storageKey);

  const resolveRegistrationPayload = () => {
    const identity = typeof options.resolveAuthIdentity === "function"
      ? options.resolveAuthIdentity()
      : null;
    if (!identity || !trimValue(identity.userId) || !trimValue(identity.userType)) {
      return null;
    }

    const systemInfo = typeof options.getSystemInfo === "function"
      ? options.getSystemInfo()
      : defaultGetSystemInfo(uniApp);
    const pushInfo = typeof options.getPushClientInfo === "function"
      ? options.getPushClientInfo()
      : defaultGetPushClientInfo(plusRuntime);
    const deviceToken = extractPushDeviceToken(pushInfo);
    if (!deviceToken) {
      return null;
    }

    const appVersion = trimValue(
      typeof options.getAppVersion === "function"
        ? options.getAppVersion(systemInfo)
        : systemInfo.appWgtVersion || systemInfo.appVersion || systemInfo.version,
    );
    const locale = trimValue(systemInfo.language || systemInfo.locale || "zh-Hans");
    const timezone = trimValue(systemInfo.timezone || resolveTimezone(intlApi));
    const appEnv = trimValue(
      typeof options.getAppEnv === "function" ? options.getAppEnv(systemInfo) : "prod",
    ) || "prod";

    return {
      userId: trimValue(identity.userId),
      userType: trimValue(identity.userType),
      deviceToken,
      appVersion,
      locale,
      timezone,
      appEnv,
    };
  };

  const registerCurrentPushDevice = async ({ force = false } = {}) => {
    const payload = resolveRegistrationPayload();
    if (!payload) {
      clearPushRegistrationState();
      return { success: false, skipped: true, reason: "missing-context" };
    }

    const fingerprint = buildFingerprint(payload);
    const currentState = getCachedRegistrationState();
    const lastRegisteredAt = Number(currentState && currentState.lastRegisteredAt);
    const currentTimestamp = getNow();
    const shouldSkip =
      !force &&
      currentState &&
      currentState.fingerprint === fingerprint &&
      Number.isFinite(lastRegisteredAt) &&
      currentTimestamp - lastRegisteredAt < minRegisterIntervalMs;

    if (shouldSkip) {
      return {
        success: true,
        skipped: true,
        reason: "recently-registered",
        payload,
      };
    }

    if (typeof options.registerPushDevice !== "function") {
      return { success: false, skipped: true, reason: "missing-api", payload };
    }

    const result = await options.registerPushDevice(payload);
    writeStorage(
      uniApp,
      storageKey,
      JSON.stringify({
        ...payload,
        fingerprint,
        lastRegisteredAt: currentTimestamp,
      }),
    );

    return {
      success: true,
      payload,
      data: result,
    };
  };

  const unregisterCurrentPushDevice = async () => {
    const currentState = getCachedRegistrationState() || {};
    const payload = resolveRegistrationPayload() || {};
    const userId = trimValue(payload.userId || currentState.userId);
    const userType = trimValue(payload.userType || currentState.userType);
    const deviceToken = trimValue(payload.deviceToken || currentState.deviceToken);

    if (!userId || !userType || !deviceToken) {
      clearPushRegistrationState();
      return { success: false, skipped: true, reason: "missing-context" };
    }

    if (typeof options.unregisterPushDevice !== "function") {
      clearPushRegistrationState();
      return { success: false, skipped: true, reason: "missing-api" };
    }

    try {
      const result = await options.unregisterPushDevice({
        userId,
        userType,
        deviceToken,
      });
      clearPushRegistrationState();
      return { success: true, data: result };
    } catch (error) {
      clearPushRegistrationState();
      throw error;
    }
  };

  const ackPushMessage = async (payload) => {
    if (typeof options.ackPushMessage !== "function") {
      return { success: false, skipped: true, reason: "missing-api" };
    }
    return options.ackPushMessage(payload);
  };

  return {
    registerCurrentPushDevice,
    unregisterCurrentPushDevice,
    clearPushRegistrationState,
    getCachedRegistrationState,
    ackPushMessage,
  };
}
