const SAFE_CONSUMER_AUTH_PROTOCOLS = new Set(["http:", "https:"]);

export const DEFAULT_CONSUMER_AUTH_NICKNAME = "悦享e食用户";

export function trimAuthPortalValue(value) {
  return String(value || "").trim();
}

export function normalizeConsumerAuthMode(value) {
  return trimAuthPortalValue(value) === "register" ? "register" : "login";
}

export function normalizeConsumerInviteCode(value) {
  return trimAuthPortalValue(value).toUpperCase();
}

function buildAuthPortalQuery(params = {}) {
  return Object.keys(params)
    .filter((key) => trimAuthPortalValue(params[key]) !== "")
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(
          trimAuthPortalValue(params[key]),
        )}`,
    )
    .join("&");
}

export function buildAuthPortalPageUrl(path, params = {}) {
  const query = buildAuthPortalQuery(params);
  return query ? `${path}?${query}` : path;
}

export function normalizeConsumerAuthExternalUrl(url) {
  const raw = trimAuthPortalValue(url);
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (!SAFE_CONSUMER_AUTH_PROTOCOLS.has(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function deriveWebRootFromEntryUrl(entryUrl) {
  const value = normalizeConsumerAuthExternalUrl(entryUrl);
  if (!value) {
    return "";
  }

  const apiIndex = value.indexOf("/api/");
  if (apiIndex > 0) {
    return value.slice(0, apiIndex);
  }

  const authIndex = value.indexOf("/auth/wechat/start");
  if (authIndex > 0) {
    return value.slice(0, authIndex);
  }

  const match = value.match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : "";
}

export function buildConsumerWechatReturnUrl(entryUrl, mode, params = {}) {
  const root = deriveWebRootFromEntryUrl(entryUrl);
  if (!root) {
    return "";
  }

  const queryParams = {
    mode: normalizeConsumerAuthMode(mode),
    ...params,
  };
  if (Object.prototype.hasOwnProperty.call(queryParams, "inviteCode")) {
    queryParams.inviteCode = normalizeConsumerInviteCode(queryParams.inviteCode);
  }

  return buildAuthPortalPageUrl(`${root}/#/pages/auth/wechat-callback/index`, queryParams);
}

export function buildConsumerWechatStartUrl(entryUrl, mode, params = {}) {
  const normalizedEntryUrl = normalizeConsumerAuthExternalUrl(entryUrl);
  const normalizedMode = normalizeConsumerAuthMode(mode);
  const returnUrl = buildConsumerWechatReturnUrl(
    normalizedEntryUrl,
    normalizedMode,
    params,
  );

  if (!normalizedEntryUrl || !returnUrl) {
    return "";
  }

  const connector = normalizedEntryUrl.includes("?") ? "&" : "?";
  return `${normalizedEntryUrl}${connector}mode=${encodeURIComponent(
    normalizedMode,
  )}&returnUrl=${encodeURIComponent(returnUrl)}`;
}

export function buildConsumerAuthUserProfile(user, fallbackPhone = "") {
  const source =
    user && typeof user === "object" && !Array.isArray(user) ? { ...user } : {};
  const nickname =
    trimAuthPortalValue(source.nickname) || DEFAULT_CONSUMER_AUTH_NICKNAME;
  const phone =
    trimAuthPortalValue(source.phone) || trimAuthPortalValue(fallbackPhone);
  const next = { ...source, nickname };

  if (phone) {
    next.phone = phone;
  } else {
    delete next.phone;
  }

  return next;
}

export function shouldRedirectRegisteredConsumerToLogin(message) {
  return /已注册|已存在|already registered|already exists/i.test(
    trimAuthPortalValue(message),
  );
}
