function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInteger(value, fallback = 0) {
  return Math.max(0, Math.floor(normalizeNumber(value, fallback)));
}

function toOptionalQueryValue(value) {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

export function normalizeAdminCommunicationRole(value) {
  const role = normalizeText(value).toLowerCase();
  if (role === "shop") {
    return "merchant";
  }
  if (role === "customer") {
    return "user";
  }
  return role;
}

export function createAdminAuditPaginationState(source = {}) {
  return {
    page: normalizeInteger(source.page, 1) || 1,
    limit: normalizeInteger(source.limit, 20) || 20,
    total: normalizeInteger(source.total, 0),
  };
}

export function getAdminCommunicationRoleLabel(role) {
  const normalizedRole = normalizeAdminCommunicationRole(role);
  if (normalizedRole === "user") {
    return "用户";
  }
  if (normalizedRole === "merchant") {
    return "商户";
  }
  if (normalizedRole === "rider") {
    return "骑手";
  }
  if (normalizedRole === "admin") {
    return "管理员";
  }
  return normalizeText(role) || "-";
}

export function formatAdminCommunicationAuditDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatAdminCommunicationAuditMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return "-";
  }
  if (typeof metadata === "object") {
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  }
  const text = String(metadata).trim();
  if (!text) {
    return "-";
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function createAdminContactPhoneAuditFilters() {
  return {
    actorRole: "",
    targetRole: "",
    clientResult: "",
    entryPoint: "",
    keyword: "",
  };
}

export function createAdminContactPhoneAuditSummary(source = {}) {
  return {
    total: normalizeInteger(source.total, 0),
    clicked: normalizeInteger(source.clicked, 0),
    opened: normalizeInteger(source.opened, 0),
    failed: normalizeInteger(source.failed, 0),
  };
}

export function buildAdminContactPhoneAuditQuery(filters = {}, pagination = {}) {
  return {
    actorRole: toOptionalQueryValue(filters.actorRole),
    targetRole: toOptionalQueryValue(filters.targetRole),
    clientResult: toOptionalQueryValue(filters.clientResult),
    entryPoint: toOptionalQueryValue(filters.entryPoint),
    keyword: toOptionalQueryValue(filters.keyword),
    page: createAdminAuditPaginationState(pagination).page,
    limit: createAdminAuditPaginationState(pagination).limit,
  };
}

export function getAdminContactPhoneAuditResultLabel(result) {
  if (result === "clicked") {
    return "已点击";
  }
  if (result === "opened") {
    return "已拉起";
  }
  if (result === "failed") {
    return "失败";
  }
  return normalizeText(result) || "-";
}

export function getAdminContactPhoneAuditResultTagType(result) {
  if (result === "clicked") {
    return "info";
  }
  if (result === "opened") {
    return "success";
  }
  if (result === "failed") {
    return "danger";
  }
  return "";
}

export function createAdminRTCCallAuditFilters() {
  return {
    callerRole: "",
    calleeRole: "",
    status: "",
    clientKind: "",
    complaintStatus: "",
    keyword: "",
  };
}

export function createAdminRTCCallAuditSummary(source = {}) {
  return {
    total: normalizeInteger(source.total, 0),
    accepted: normalizeInteger(source.accepted, 0),
    ended: normalizeInteger(source.ended, 0),
    failed: normalizeInteger(source.failed, 0),
    complaints: normalizeInteger(source.complaints, 0),
  };
}

export function createAdminRTCTargetSearchForm(source = {}) {
  return {
    keyword: normalizeText(source.keyword),
    role: normalizeAdminCommunicationRole(source.role),
  };
}

export function createAdminRTCCallForm(source = {}) {
  return {
    conversationId: normalizeText(source.conversationId),
    orderId: normalizeText(source.orderId),
    entryPoint: normalizeText(source.entryPoint, "admin_rtc_console"),
    scene: normalizeText(source.scene, "admin_support"),
  };
}

export function normalizeAdminRTCTarget(raw = {}) {
  const role = normalizeAdminCommunicationRole(raw.role);
  const chatId = normalizeText(raw.chatId || raw.id || raw.uid);
  const legacyId = normalizeText(raw.legacyId);
  return {
    resultKey: `${role}:${chatId || legacyId || raw.phone || raw.name || "target"}`,
    role,
    chatId,
    id: normalizeText(raw.id),
    uid: normalizeText(raw.uid),
    legacyId,
    phone: normalizeText(raw.phone),
    name: normalizeText(raw.name),
    avatar: normalizeText(raw.avatar),
  };
}

function isSupportedAdminRTCTargetRole(role) {
  return ["user", "merchant", "rider"].includes(normalizeAdminCommunicationRole(role));
}

export function filterAdminRTCTargets(list = [], role = "") {
  const normalizedRole = normalizeAdminCommunicationRole(role);
  return (Array.isArray(list) ? list : [])
    .map((item) => normalizeAdminRTCTarget(item))
    .filter(
      (item) => isSupportedAdminRTCTargetRole(item.role)
        && (!normalizedRole || item.role === normalizedRole),
    );
}

export function buildAdminRTCCallAuditQuery(filters = {}, pagination = {}) {
  return {
    callerRole: toOptionalQueryValue(filters.callerRole),
    calleeRole: toOptionalQueryValue(filters.calleeRole),
    status: toOptionalQueryValue(filters.status),
    clientKind: toOptionalQueryValue(filters.clientKind),
    complaintStatus: toOptionalQueryValue(filters.complaintStatus),
    keyword: toOptionalQueryValue(filters.keyword),
    page: createAdminAuditPaginationState(pagination).page,
    limit: createAdminAuditPaginationState(pagination).limit,
  };
}

export function getAdminRTCCallAuditRowKey(row = {}) {
  return String(row?.uid || row?.id || row?.call_id_raw || "").trim();
}

export function getAdminRTCCallTypeLabel(value) {
  if (value === "audio") {
    return "语音通话";
  }
  return normalizeText(value) || "-";
}

export function getAdminRTCCallStatusLabel(value) {
  if (value === "initiated") {
    return "发起中";
  }
  if (value === "ringing") {
    return "振铃中";
  }
  if (value === "accepted") {
    return "已接通";
  }
  if (value === "ended") {
    return "已结束";
  }
  if (value === "rejected") {
    return "已拒接";
  }
  if (value === "busy") {
    return "忙线";
  }
  if (value === "cancelled") {
    return "已取消";
  }
  if (value === "timeout") {
    return "超时";
  }
  if (value === "failed") {
    return "失败";
  }
  return normalizeText(value) || "-";
}

export function getAdminRTCCallStatusTagType(value) {
  if (value === "accepted" || value === "ended") {
    return "success";
  }
  if (value === "initiated" || value === "ringing") {
    return "info";
  }
  if (
    value === "busy" ||
    value === "timeout" ||
    value === "failed" ||
    value === "rejected"
  ) {
    return "danger";
  }
  if (value === "cancelled") {
    return "warning";
  }
  return "";
}

export function getAdminRTCCallComplaintLabel(value) {
  if (value === "none") {
    return "无投诉";
  }
  if (value === "reported") {
    return "投诉中";
  }
  if (value === "resolved") {
    return "已处理";
  }
  return normalizeText(value) || "-";
}

export function getAdminRTCCallComplaintTagType(value) {
  if (value === "reported") {
    return "danger";
  }
  if (value === "resolved") {
    return "success";
  }
  return "info";
}

export function getAdminRTCCallRetentionLabel(value) {
  if (value === "standard") {
    return "默认保留";
  }
  if (value === "frozen") {
    return "冻结留存";
  }
  if (value === "cleared") {
    return "已标记清理";
  }
  return normalizeText(value) || "-";
}

export function getAdminRTCCallRetentionTagType(value) {
  if (value === "frozen") {
    return "warning";
  }
  if (value === "cleared") {
    return "success";
  }
  return "info";
}

export function formatAdminRTCCallDuration(value) {
  const numeric = normalizeInteger(value, 0);
  if (numeric <= 0) {
    return "0 秒";
  }
  if (numeric < 60) {
    return `${numeric} 秒`;
  }
  const minutes = Math.floor(numeric / 60);
  const seconds = numeric % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? `${hours} 小时 ${remainMinutes} 分` : `${hours} 小时`;
}

const RTC_CALL_REVIEW_ACTIONS = {
  markComplaint: {
    payload: { complaintStatus: "reported" },
    successMessage: "已标记为投诉中，并冻结录音留存",
    confirmMessage: "确认将该通话标记为投诉中并冻结录音留存吗？",
  },
  resolveComplaint: {
    payload: { complaintStatus: "resolved" },
    successMessage: "已标记为处理完成，录音留存已按策略切换",
    confirmMessage: "确认将该通话投诉标记为已处理吗？",
  },
  freezeRetention: {
    payload: { recordingRetention: "frozen" },
    successMessage: "已冻结录音留存",
    confirmMessage: "确认冻结该通话的录音留存吗？",
  },
  clearRetention: {
    payload: { recordingRetention: "cleared" },
    successMessage: "已标记为可清理",
    confirmMessage: "确认将该通话标记为可清理吗？",
  },
};

export function createAdminRTCCallReviewAction(kind) {
  const action = RTC_CALL_REVIEW_ACTIONS[kind];
  if (!action) {
    return null;
  }
  return {
    payload: { ...action.payload },
    successMessage: action.successMessage,
    confirmMessage: action.confirmMessage,
  };
}

export function mergeAdminRTCCallAuditRecords(records = [], updated = {}) {
  const key = getAdminRTCCallAuditRowKey(updated);
  if (!key) {
    return Array.isArray(records) ? [...records] : [];
  }
  return (Array.isArray(records) ? records : []).map((item) =>
    getAdminRTCCallAuditRowKey(item) === key ? { ...item, ...updated } : item,
  );
}

export function mergeAdminRTCCallAuditDetail(detail = null, updated = {}) {
  const detailKey = getAdminRTCCallAuditRowKey(detail || {});
  const updatedKey = getAdminRTCCallAuditRowKey(updated);
  if (!detailKey || detailKey !== updatedKey) {
    return detail;
  }
  return {
    ...(detail || {}),
    ...updated,
  };
}
