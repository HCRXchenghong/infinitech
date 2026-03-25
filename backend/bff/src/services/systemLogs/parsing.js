const {
  ACTION_LABELS,
  RESOURCE_RULES,
  MAX_SCAN_LINES,
  BFF_LOG_PATH,
  GO_LOG_PATH,
} = require("./constants");
const {
  normalizeTime,
  normalizeGoTimestamp,
  readRecentLines,
} = require("./helpers");

function parseMethodPath(text) {
  const match = String(text || "").match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s]+)/i);
  if (!match) {
    return { method: "", path: "" };
  }
  return {
    method: match[1].toUpperCase(),
    path: match[2]
  };
}

function normalizePath(rawPath) {
  if (!rawPath) {
    return "";
  }
  return String(rawPath).split("?")[0];
}

function normalizePathLower(rawPath) {
  return normalizePath(rawPath).toLowerCase();
}

function detectAuthScene(rawPath) {
  const path = normalizePathLower(rawPath);
  if (path === "/auth/login" || path === "/api/auth/login") {
    return "user_login";
  }
  if (path === "/auth/register" || path === "/api/auth/register") {
    return "user_register";
  }
  if (path === "/auth/rider/login" || path === "/api/auth/rider/login") {
    return "rider_login";
  }
  if (path === "/auth/merchant/login" || path === "/api/auth/merchant/login") {
    return "merchant_login";
  }
  if (path === "/login" || path === "/api/login") {
    return "admin_login";
  }
  return "";
}

function resolveResourceLabel(apiPath) {
  if (!apiPath) {
    return "系统";
  }
  const plainPath = normalizePath(apiPath);
  const rule = RESOURCE_RULES.find((item) => item.pattern.test(plainPath));
  if (rule) {
    return rule.label;
  }
  const parts = plainPath.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return parts[1];
  }
  return plainPath;
}

function classifyAction({ method, path, level, message, status, eventType }) {
  const text = `${String(message || "")} ${String(path || "")}`.toLowerCase();
  const authScene = detectAuthScene(path);
  const normalizedLevel = String(level || "").toLowerCase();

  if (normalizedLevel === "error" || Number(status) >= 500 || /error|fatal|panic|异常|失败|错误/.test(text)) {
    return "error";
  }

  if (eventType === "response") {
    return Number(status) >= 400 ? "error" : "system";
  }

  if (eventType === "system" || eventType === "plain") {
    return "system";
  }

  if (!method) {
    return "system";
  }

  if (method === "DELETE") {
    return "delete";
  }
  if (method === "PUT" || method === "PATCH") {
    return "update";
  }
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return "read";
  }
  if (method === "POST") {
    if (authScene && authScene.endsWith("_login")) {
      return "system";
    }
    if (authScene === "user_register") {
      return "create";
    }
    if (/\/delete-all|\/delete-orders|delete|remove|revoke/.test(text)) {
      return "delete";
    }
    if (/reset|status|update|reorganize|approve|reject|disable|enable|set-/.test(text)) {
      return "update";
    }
    if (/\/export|\/health/.test(text)) {
      return "read";
    }
    return "create";
  }
  return "system";
}

function buildReadableOperation({ actionType, method, path: apiPath, message, eventType, status, actionScene }) {
  if (eventType === "response" && method && apiPath) {
    if (Number(status) >= 400) {
      return `接口调用失败 ${method} ${apiPath}`;
    }
    return `接口调用完成 ${method} ${apiPath}`;
  }

  if (!method || !apiPath) {
    return String(message || "系统事件");
  }

  const plainPath = normalizePath(apiPath);
  const scene = actionScene || detectAuthScene(plainPath);
  const resource = resolveResourceLabel(plainPath);

  if (scene === "user_login") {
    return "用户登录";
  }
  if (scene === "user_register") {
    return "用户注册";
  }
  if (scene === "rider_login") {
    return "骑手登录";
  }
  if (scene === "merchant_login") {
    return "商户登录";
  }
  if (scene === "admin_login") {
    return "管理员登录";
  }

  if (/\/reset-password/.test(plainPath)) {
    return `重置${resource}密码`;
  }
  if (method === "POST" && /^(\/api)?\/(users|riders|merchants)$/.test(plainPath)) {
    return `${resource}注册`;
  }
  if (method === "POST" && /^(\/api)?\/admins$/.test(plainPath)) {
    return "管理员注册";
  }
  if (/\/delete-all/.test(plainPath)) {
    return `批量删除${resource}`;
  }
  if (/\/import/.test(plainPath)) {
    return `导入${resource}数据`;
  }
  if (/\/export/.test(plainPath)) {
    return `导出${resource}数据`;
  }
  if (/\/upload/.test(plainPath)) {
    return `上传${resource}文件`;
  }
  if (/\/health$/.test(plainPath)) {
    return "健康检查";
  }

  const verb = ACTION_LABELS[actionType] || "处理";
  return `${verb}${resource}`;
}

function parseBffLine(line, index) {
  const fallbackMs = Date.now() - index;
  let payload;
  try {
    payload = JSON.parse(line);
  } catch (error) {
    const parsed = parseMethodPath(line);
    const actionType = classifyAction({
      method: parsed.method,
      path: parsed.path,
      level: "",
      message: line,
      status: 0,
      eventType: "plain"
    });
    return {
      id: `bff-${fallbackMs}-${index}`,
      source: "bff",
      sourceLabel: "BFF",
      level: "info",
      method: parsed.method,
      path: parsed.path,
      status: null,
      ip: "",
      operatorId: "",
      operatorName: "",
      actorType: "",
      actionScene: "",
      actionSubject: "",
      latency: "",
      eventType: "plain",
      actionType,
      actionLabel: ACTION_LABELS[actionType],
      operation: buildReadableOperation({
        actionType,
        method: parsed.method,
        path: parsed.path,
        message: line,
        eventType: "plain",
        status: 0,
        actionScene: detectAuthScene(parsed.path)
      }),
      message: String(line || ""),
      timestamp: new Date(fallbackMs).toISOString(),
      timestampMs: fallbackMs,
      raw: line
    };
  }

  const methodPath = parseMethodPath(payload.message);
  const normalizedTime = normalizeTime(payload.timestamp, fallbackMs);
  const actionType = classifyAction({
    method: methodPath.method,
    path: methodPath.path,
    level: payload.level,
    message: payload.message,
    status: payload.status,
    eventType: "request"
  });

  return {
    id: `bff-${normalizedTime.timestampMs}-${index}`,
    source: "bff",
    sourceLabel: "BFF",
    level: String(payload.level || "info"),
    method: methodPath.method,
    path: methodPath.path,
    status: Number.isFinite(payload.status) ? payload.status : null,
    ip: String(payload.ip || ""),
    operatorId: String(payload.operatorId || ""),
    operatorName: String(payload.operatorName || ""),
    actorType: String(payload.actorType || ""),
    actionScene: String(payload.actionScene || ""),
    actionSubject: String(payload.actionSubject || ""),
    latency: payload.latencyMs ? `${payload.latencyMs}ms` : "",
    eventType: "request",
    actionType,
    actionLabel: ACTION_LABELS[actionType],
    operation: buildReadableOperation({
      actionType,
      method: methodPath.method,
      path: methodPath.path,
      message: payload.message,
      eventType: "request",
      status: payload.status,
      actionScene: String(payload.actionScene || "")
    }),
    message: String(payload.message || ""),
    timestamp: normalizedTime.timestamp,
    timestampMs: normalizedTime.timestampMs,
    raw: line
  };
}

function parseGoLine(line, index) {
  const fallbackMs = Date.now() - index;
  const prefixMatch = line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+(.*)$/);
  const goTs = prefixMatch ? prefixMatch[1] : "";
  const rawMessage = prefixMatch ? prefixMatch[2] : line;
  const normalizedTime = normalizeGoTimestamp(goTs, fallbackMs);

  const requestMatch = rawMessage.match(/^📥 \[请求\]\s+([A-Z]+)\s+(\S+)\s+from\s+(.+)$/);
  const responseMatch = rawMessage.match(/^[✅❌]\s+\[响应\]\s+([A-Z]+)\s+(\S+)\s+(\d{3})\s+([^\s]+).*$/);

  let method = "";
  let apiPath = "";
  let status = null;
  let ip = "";
  let latency = "";
  let eventType = "system";
  let level = "info";

  if (requestMatch) {
    method = requestMatch[1].toUpperCase();
    apiPath = requestMatch[2];
    ip = requestMatch[3];
    eventType = "request";
  } else if (responseMatch) {
    method = responseMatch[1].toUpperCase();
    apiPath = responseMatch[2];
    status = Number.parseInt(responseMatch[3], 10);
    latency = responseMatch[4];
    eventType = "response";
    if (status >= 400) {
      level = "error";
    }
  } else {
    const parsed = parseMethodPath(rawMessage);
    method = parsed.method;
    apiPath = parsed.path;
    if (/error|fatal|panic|异常|失败|错误/i.test(rawMessage)) {
      level = "error";
    }
  }

  const actionType = classifyAction({
    method,
    path: apiPath,
    level,
    message: rawMessage,
    status,
    eventType
  });

  return {
    id: `go-${normalizedTime.timestampMs}-${index}`,
    source: "go",
    sourceLabel: "Go",
    level,
    method,
    path: apiPath,
    status,
    ip,
    operatorId: "",
    operatorName: "",
    actorType: "",
    actionScene: detectAuthScene(apiPath),
    actionSubject: "",
    latency,
    eventType,
    actionType,
    actionLabel: ACTION_LABELS[actionType],
    operation: buildReadableOperation({
      actionType,
      method,
      path: apiPath,
      message: rawMessage,
      eventType,
      status,
      actionScene: detectAuthScene(apiPath)
    }),
    message: rawMessage,
    timestamp: normalizedTime.timestamp,
    timestampMs: normalizedTime.timestampMs,
    raw: line
  };
}

function loadEntries(source) {
  const items = [];

  if (source === "all" || source === "bff") {
    const lines = readRecentLines(BFF_LOG_PATH, MAX_SCAN_LINES);
    lines.forEach((line, idx) => {
      items.push(parseBffLine(line, idx));
    });
  }

  if (source === "all" || source === "go") {
    const lines = readRecentLines(GO_LOG_PATH, MAX_SCAN_LINES);
    lines.forEach((line, idx) => {
      items.push(parseGoLine(line, idx));
    });
  }

  return items;
}

module.exports = {
  loadEntries,
};
