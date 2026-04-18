import { extractEnvelopeData } from "../../contracts/src/http.js";

export const DEFAULT_SOCKET_TOKEN_STORAGE_KEY = "socket_token";
export const DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY =
  "socket_token_account_key";

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

function readUniStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

function writeUniStorage(uniApp, key, value) {
  if (!uniApp || typeof uniApp.setStorageSync !== "function") {
    return;
  }

  try {
    uniApp.setStorageSync(key, value);
  } catch (_error) {
    // Ignore storage write failures in constrained runtimes.
  }
}

function removeUniStorage(uniApp, key) {
  if (!uniApp || typeof uniApp.removeStorageSync !== "function") {
    return;
  }

  try {
    uniApp.removeStorageSync(key);
  } catch (_error) {
    // Ignore storage cleanup failures in constrained runtimes.
  }
}

function readStorage(options, key) {
  if (typeof options.readStorage === "function") {
    try {
      return options.readStorage(key);
    } catch (_error) {
      return "";
    }
  }

  const storage = options.storage;
  if (storage && typeof storage.getItem === "function") {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return "";
    }
  }

  return readUniStorage(resolveUniRuntime(options.uniApp), key);
}

function writeStorage(options, key, value) {
  if (typeof options.writeStorage === "function") {
    try {
      options.writeStorage(key, value);
    } catch (_error) {
      // Ignore custom storage write failures.
    }
    return;
  }

  const storage = options.storage;
  if (storage && typeof storage.setItem === "function") {
    try {
      storage.setItem(key, value);
    } catch (_error) {
      // Ignore custom storage write failures.
    }
    return;
  }

  writeUniStorage(resolveUniRuntime(options.uniApp), key, value);
}

function removeStorage(options, key) {
  if (typeof options.removeStorage === "function") {
    try {
      options.removeStorage(key);
    } catch (_error) {
      // Ignore custom storage cleanup failures.
    }
    return;
  }

  const storage = options.storage;
  if (storage && typeof storage.removeItem === "function") {
    try {
      storage.removeItem(key);
    } catch (_error) {
      // Ignore custom storage cleanup failures.
    }
    return;
  }

  removeUniStorage(resolveUniRuntime(options.uniApp), key);
}

export function buildSocketTokenAccountKey(userId, role) {
  const normalizedUserId = trimValue(userId);
  const normalizedRole = trimValue(role).toLowerCase();
  if (!normalizedUserId || !normalizedRole) {
    return "";
  }
  return `${normalizedRole}:${normalizedUserId}`;
}

export function extractSocketTokenResult(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const data = extractEnvelopeData(source);
  const normalizedData = data && typeof data === "object" ? data : {};

  return {
    token: trimValue(
      normalizedData.token ||
        normalizedData.socketToken ||
        source.token ||
        source.socketToken,
    ),
    userId: trimValue(
      normalizedData.userId ||
        normalizedData.user_id ||
        source.userId ||
        source.user_id,
    ),
    role: trimValue(normalizedData.role || source.role).toLowerCase(),
  };
}

function normalizeSocketTokenResponsePayload(response) {
  const normalizedResponse = parseJSON(response);
  if (
    normalizedResponse &&
    typeof normalizedResponse === "object" &&
    "data" in normalizedResponse
  ) {
    return parseJSON(normalizedResponse.data);
  }
  return normalizedResponse;
}

function normalizeAuthorizationHeader({
  authHeader,
  readAuthorizationHeader,
  authToken,
} = {}) {
  const runtimeHeader =
    typeof readAuthorizationHeader === "function"
      ? readAuthorizationHeader()
      : null;
  const resolvedHeader =
    authHeader && typeof authHeader === "object"
      ? { ...authHeader }
      : runtimeHeader && typeof runtimeHeader === "object"
        ? { ...runtimeHeader }
        : {};

  const directAuthorization = trimValue(
    resolvedHeader.Authorization || resolvedHeader.authorization,
  );
  if (directAuthorization) {
    if (!resolvedHeader.Authorization) {
      resolvedHeader.Authorization = directAuthorization;
    }
    if ("authorization" in resolvedHeader) {
      delete resolvedHeader.authorization;
    }
    return resolvedHeader;
  }

  const normalizedToken = trimValue(authToken);
  if (!normalizedToken) {
    return resolvedHeader;
  }

  return {
    ...resolvedHeader,
    Authorization: /^Bearer\s+/i.test(normalizedToken)
      ? normalizedToken
      : `Bearer ${normalizedToken}`,
  };
}

function createDefaultSocketTokenRequester(options = {}) {
  const uniApp = resolveUniRuntime(options.uniApp);
  const fetchImpl =
    typeof options.fetchImpl === "function"
      ? options.fetchImpl
      : typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : null;

  return async ({
    socketUrl,
    userId,
    role,
    authHeader,
    authToken,
    readAuthorizationHeader,
  }) => {
    const header = normalizeAuthorizationHeader({
      authHeader: authHeader || options.authHeader,
      authToken: trimValue(authToken) || trimValue(options.authToken),
      readAuthorizationHeader:
        typeof readAuthorizationHeader === "function"
          ? readAuthorizationHeader
          : options.readAuthorizationHeader,
    });
    if (!trimValue(header.Authorization)) {
      throw new Error(
        trimValue(options.missingAuthorizationMessage) ||
          "missing auth token for socket request",
      );
    }

    if (uniApp && typeof uniApp.request === "function") {
      return new Promise((resolve, reject) => {
        uniApp.request({
          url: `${socketUrl}/api/generate-token`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            ...header,
          },
          data: {
            userId: trimValue(userId),
            role: trimValue(role),
          },
          success: resolve,
          fail: reject,
        });
      });
    }

    if (!fetchImpl) {
      throw new Error("socket token transport is not available");
    }

    const response = await fetchImpl(`${socketUrl}/api/generate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...header,
      },
      body: JSON.stringify({
        userId: trimValue(userId),
        role: trimValue(role),
      }),
    });

    if (response && "ok" in response && !response.ok) {
      throw new Error(`generate socket token failed: ${response.status}`);
    }

    if (response && typeof response.text === "function") {
      return parseJSON(await response.text());
    }
    if (response && typeof response.json === "function") {
      return response.json();
    }
    return response;
  };
}

export function clearCachedSocketToken(options = {}) {
  const tokenStorageKey =
    trimValue(options.tokenStorageKey) || DEFAULT_SOCKET_TOKEN_STORAGE_KEY;
  const tokenAccountKeyStorageKey =
    trimValue(options.tokenAccountKeyStorageKey) ||
    DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY;

  removeStorage(options, tokenStorageKey);
  removeStorage(options, tokenAccountKeyStorageKey);
}

export async function resolveSocketToken(options = {}) {
  const tokenStorageKey =
    trimValue(options.tokenStorageKey) || DEFAULT_SOCKET_TOKEN_STORAGE_KEY;
  const tokenAccountKeyStorageKey =
    trimValue(options.tokenAccountKeyStorageKey) ||
    DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY;
  const userId = trimValue(options.userId);
  const role = trimValue(options.role);
  const accountKey =
    trimValue(options.accountKey) || buildSocketTokenAccountKey(userId, role);
  const forceRefresh = Boolean(options.forceRefresh);

  if (!accountKey) {
    throw new Error(
      trimValue(options.missingAccountKeyMessage) ||
        "missing socket token account key",
    );
  }

  if (!forceRefresh) {
    const cachedToken = trimValue(readStorage(options, tokenStorageKey));
    const cachedAccountKey = trimValue(
      readStorage(options, tokenAccountKeyStorageKey),
    );
    if (cachedToken && cachedAccountKey === accountKey) {
      return cachedToken;
    }
    if (cachedToken || cachedAccountKey) {
      clearCachedSocketToken({
        ...options,
        tokenStorageKey,
        tokenAccountKeyStorageKey,
      });
    }
  }

  const socketUrl = trimValue(
    typeof options.getSocketUrl === "function"
      ? options.getSocketUrl()
      : typeof options.getSocketURL === "function"
        ? options.getSocketURL()
        : options.socketUrl,
  );
  if (!socketUrl) {
    throw new Error(
      trimValue(options.missingSocketUrlMessage) ||
        "socket url is not configured",
    );
  }

  const requestSocketToken =
    typeof options.requestSocketToken === "function"
      ? options.requestSocketToken
      : createDefaultSocketTokenRequester(options);

  const response = await requestSocketToken({
    socketUrl,
    userId,
    role,
    accountKey,
    identity: options.identity,
    authHeader: options.authHeader,
    authToken: options.authToken,
    forceRefresh,
    uniApp: resolveUniRuntime(options.uniApp),
    readAuthorizationHeader: options.readAuthorizationHeader,
  });
  const tokenResult = extractSocketTokenResult(
    normalizeSocketTokenResponsePayload(response),
  );
  const token = trimValue(tokenResult.token);
  if (!token) {
    throw new Error(
      trimValue(options.missingTokenMessage) ||
        "missing socket token from response",
    );
  }

  const resolvedAccountKey =
    buildSocketTokenAccountKey(
      tokenResult.userId || userId,
      tokenResult.role || role,
    ) || accountKey;
  writeStorage(options, tokenStorageKey, token);
  writeStorage(options, tokenAccountKeyStorageKey, resolvedAccountKey);
  return token;
}
