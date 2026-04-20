const UNIFIED_ID_PREFIX = "250724";
const BFF_LOG_BUCKET = "98";
const INVITE_RUNTIME_PORT = "1788";
const SITE_RUNTIME_PORT = "1888";
const PUBLIC_RUNTIME_ALLOWED_API_RULES = {
  [SITE_RUNTIME_PORT]: [
    { method: "GET", pattern: /^\/api\/public\/app-download-config$/ },
    { method: "GET", pattern: /^\/api\/official-site\/news$/ },
    { method: "GET", pattern: /^\/api\/official-site\/news\/[^/]+$/ },
    { method: "GET", pattern: /^\/api\/official-site\/exposures$/ },
    { method: "GET", pattern: /^\/api\/official-site\/exposures\/[^/]+$/ },
    { method: "POST", pattern: /^\/api\/official-site\/exposures\/assets$/ },
    { method: "POST", pattern: /^\/api\/official-site\/exposures$/ },
    { method: "POST", pattern: /^\/api\/official-site\/cooperations$/ },
    { method: "POST", pattern: /^\/api\/official-site\/support\/sessions$/ },
    {
      method: "GET",
      pattern: /^\/api\/official-site\/support\/sessions\/[^/]+\/socket-token$/,
    },
    {
      method: "GET",
      pattern: /^\/api\/official-site\/support\/sessions\/[^/]+\/messages$/,
    },
    {
      method: "POST",
      pattern: /^\/api\/official-site\/support\/sessions\/[^/]+\/messages$/,
    },
    { method: "GET", pattern: /^\/api\/health$/ },
    { method: "GET", pattern: /^\/api\/ready$/ },
  ],
  [INVITE_RUNTIME_PORT]: [
    { method: "GET", pattern: /^\/api\/onboarding\/invites\/[^/]+$/ },
    { method: "POST", pattern: /^\/api\/onboarding\/invites\/[^/]+\/upload$/ },
    { method: "POST", pattern: /^\/api\/onboarding\/invites\/[^/]+\/submit$/ },
    { method: "GET", pattern: /^\/api\/coupons\/link\/[^/]+$/ },
    { method: "POST", pattern: /^\/api\/coupons\/link\/[^/]+\/claim$/ },
    { method: "GET", pattern: /^\/api\/health$/ },
    { method: "GET", pattern: /^\/api\/ready$/ },
  ],
};

let bffLogMinute = "";
let bffLogCounter = 0;

function nextLogTsid() {
  const now = new Date();
  const shanghai = new Date(
    now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60 * 1000,
  );
  const minute = [
    String(shanghai.getUTCFullYear()).slice(-2),
    String(shanghai.getUTCMonth() + 1).padStart(2, "0"),
    String(shanghai.getUTCDate()).padStart(2, "0"),
    String(shanghai.getUTCHours()).padStart(2, "0"),
    String(shanghai.getUTCMinutes()).padStart(2, "0"),
  ].join("");

  if (bffLogMinute !== minute) {
    bffLogMinute = minute;
    bffLogCounter = 0;
  }
  bffLogCounter += 1;
  if (bffLogCounter > 999999) {
    bffLogCounter = 1;
  }
  return `${UNIFIED_ID_PREFIX}${BFF_LOG_BUCKET}${minute}${String(bffLogCounter).padStart(6, "0")}`;
}

function normalizeIp(rawIp) {
  const value = String(rawIp || "").trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("::ffff:")) {
    return value.slice(7);
  }
  if (value === "::1") {
    return "127.0.0.1";
  }
  return value;
}

function extractClientIp(req) {
  const xForwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((item) => item.trim())
    .find(Boolean);
  const xRealIp = String(req.headers["x-real-ip"] || "").trim();
  const candidate =
    xForwardedFor || xRealIp || req.ip || req.socket?.remoteAddress || "";
  return normalizeIp(candidate);
}

function parseUrlPort(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }
  try {
    const parsed = new URL(value);
    if (parsed.port) {
      return parsed.port;
    }
    return parsed.protocol === "https:" ? "443" : "80";
  } catch (error) {
    return "";
  }
}

function extractSourcePort(req) {
  const originPort = parseUrlPort(req.headers.origin);
  if (originPort) {
    return originPort;
  }
  return parseUrlPort(req.headers.referer);
}

function normalizeRequestPath(value) {
  const path = String(value || "").trim();
  if (!path) {
    return "";
  }
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

function inferActorTypeByPath(rawPath) {
  const path = normalizeRequestPath(rawPath).toLowerCase();
  const segments = path.split("/").filter(Boolean);
  const hasAdminSegment = segments.includes("admin") || segments.includes("admins");

  if (
    path === "/login" ||
    path === "/api/login" ||
    path.startsWith("/admins") ||
    path.startsWith("/api/admins") ||
    path.startsWith("/admin") ||
    path.startsWith("/api/admin") ||
    hasAdminSegment
  ) {
    return "admin";
  }
  if (
    path === "/auth/rider/login" ||
    path === "/api/auth/rider/login" ||
    path.startsWith("/riders") ||
    path.startsWith("/api/riders")
  ) {
    return "rider";
  }
  if (
    path === "/auth/merchant/login" ||
    path === "/api/auth/merchant/login" ||
    path.startsWith("/merchants") ||
    path.startsWith("/api/merchants")
  ) {
    return "merchant";
  }
  if (
    path === "/auth/login" ||
    path === "/api/auth/login" ||
    path === "/auth/register" ||
    path === "/api/auth/register" ||
    path.startsWith("/users") ||
    path.startsWith("/api/users") ||
    path.startsWith("/user") ||
    path.startsWith("/api/user")
  ) {
    return "user";
  }

  return "";
}

function inferActionScene(method, rawPath) {
  const path = normalizeRequestPath(rawPath).toLowerCase();
  const normalizedMethod = String(method || "").toUpperCase();

  if (normalizedMethod === "POST") {
    if (path === "/auth/login" || path === "/api/auth/login") {
      return "user_login";
    }
    if (path === "/auth/register" || path === "/api/auth/register") {
      return "user_register";
    }
    if (path === "/auth/rider/login" || path === "/api/auth/rider/login") {
      return "rider_login";
    }
    if (
      path === "/auth/merchant/login" ||
      path === "/api/auth/merchant/login"
    ) {
      return "merchant_login";
    }
    if (path === "/login" || path === "/api/login") {
      return "admin_login";
    }
  }

  return "";
}

function extractSubject(req, actionScene) {
  if (!actionScene) {
    return "";
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const raw = body.phone || body.account || body.username || body.email || "";
  return String(raw || "").trim();
}

function isPublicRuntimePort(port) {
  return Boolean(PUBLIC_RUNTIME_ALLOWED_API_RULES[String(port || "").trim()]);
}

function getPublicRuntimeGuardMessage(port) {
  const normalized = String(port || "").trim();
  if (normalized === SITE_RUNTIME_PORT) {
    return "1888 仅开放官网相关接口";
  }
  return "1788 仅开放邀请 / 领券页相关接口";
}

function isPublicRuntimeAllowedApiRequest(port, method, path) {
  const rules =
    PUBLIC_RUNTIME_ALLOWED_API_RULES[String(port || "").trim()] || [];
  const normalizedMethod = String(method || "").toUpperCase();
  const normalizedPath = normalizeRequestPath(path);
  if (!normalizedPath.startsWith("/api/")) {
    return true;
  }

  if (normalizedMethod === "OPTIONS") {
    return rules.some((rule) => rule.pattern.test(normalizedPath));
  }

  return rules.some((rule) => {
    const ruleMethod = String(rule.method || "").toUpperCase();
    const methodMatched =
      normalizedMethod === ruleMethod ||
      (normalizedMethod === "HEAD" && ruleMethod === "GET");
    return methodMatched && rule.pattern.test(normalizedPath);
  });
}

module.exports = {
  INVITE_RUNTIME_PORT,
  SITE_RUNTIME_PORT,
  nextLogTsid,
  extractClientIp,
  extractSourcePort,
  normalizeRequestPath,
  inferActorTypeByPath,
  inferActionScene,
  extractSubject,
  isPublicRuntimePort,
  getPublicRuntimeGuardMessage,
  isPublicRuntimeAllowedApiRequest,
};
