import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

function cloneValue(value, fallback) {
  const source = value == null ? fallback : value;
  return JSON.parse(JSON.stringify(source));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function extractOfficialSiteRecordCollection(payload, options = {}) {
  const page = extractPaginatedItems(payload, {
    listKeys: ["records", "list", "items"],
    ...(options || {}),
  });
  return {
    records: page.items,
    total: Number(page.total || 0),
    page: Number(page.page || 0),
    limit: Number(page.limit || 0),
  };
}

export function extractOfficialSiteSupportMessageBundle(payload) {
  const source = extractEnvelopeData(payload) || payload || {};
  return {
    session: source?.session || null,
    messages: Array.isArray(source?.messages) ? source.messages : [],
  };
}

export function createAdminOfficialSiteExposureDraft() {
  return {
    id: "",
    content: "",
    amount: 0,
    appeal: "",
    contact_phone: "",
    photo_urls: [],
    review_status: "pending",
    review_remark: "",
    process_status: "unresolved",
    process_remark: "",
    created_at: "",
    handled_at: "",
  };
}

export function officialSiteExposureReviewLabel(status) {
  if (status === "approved") {
    return "已通过";
  }
  if (status === "rejected") {
    return "已驳回";
  }
  return "待审核";
}

export function officialSiteExposureReviewTagType(status) {
  if (status === "approved") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  return "warning";
}

export function officialSiteExposureProcessLabel(status) {
  if (status === "resolved") {
    return "已处理";
  }
  if (status === "processing") {
    return "处理中";
  }
  return "未处理";
}

export function officialSiteExposureProcessTagType(status) {
  if (status === "resolved") {
    return "success";
  }
  if (status === "processing") {
    return "warning";
  }
  return "danger";
}

export function mergeOfficialSiteSupportSession(currentValue, payload) {
  if (!payload || typeof payload !== "object") {
    return currentValue || null;
  }
  return {
    ...(currentValue || {}),
    ...payload,
  };
}

export function compareOfficialSiteSupportSessions(left, right) {
  const leftTime = Date.parse(left?.last_message_at || left?.created_at || "") || 0;
  const rightTime = Date.parse(right?.last_message_at || right?.created_at || "") || 0;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return String(left?.id || "").localeCompare(String(right?.id || ""));
}

export function upsertOfficialSiteSupportSessions(records, payload) {
  if (!payload?.id) {
    return asArray(records);
  }

  const nextRecords = cloneValue(asArray(records), []);
  const index = nextRecords.findIndex((item) => item?.id === payload.id);
  if (index >= 0) {
    nextRecords[index] = mergeOfficialSiteSupportSession(nextRecords[index], payload);
  } else {
    nextRecords.unshift(payload);
  }

  nextRecords.sort(compareOfficialSiteSupportSessions);
  return nextRecords;
}

export function officialSiteSupportMessageKey(message) {
  if (message?.id) {
    return `id:${message.id}`;
  }
  if (message?.legacy_id) {
    return `legacy:${message.legacy_id}`;
  }
  return `${message?.sender_type || "unknown"}:${message?.created_at || ""}:${message?.content || ""}`;
}

export function compareOfficialSiteSupportMessages(left, right) {
  const leftTime = Date.parse(left?.created_at || "") || 0;
  const rightTime = Date.parse(right?.created_at || "") || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return officialSiteSupportMessageKey(left).localeCompare(
    officialSiteSupportMessageKey(right),
  );
}

export function mergeOfficialSiteSupportMessages(existing, incoming) {
  const merged = new Map();
  [...asArray(existing), ...asArray(incoming)].forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    merged.set(officialSiteSupportMessageKey(item), item);
  });
  return Array.from(merged.values()).sort(compareOfficialSiteSupportMessages);
}

export function buildAdminOfficialSiteSupportSummaryCards({
  sessions,
  realtimeConnected,
  selectedSession,
} = {}) {
  const list = asArray(sessions);
  const openCount = list.filter((item) => item?.status !== "closed").length;
  const unreadCount = list.reduce(
    (total, item) => total + Number(item?.unread_admin_count || 0),
    0,
  );
  return [
    {
      label: "实时链路",
      value: realtimeConnected ? "在线" : "兜底",
      desc: realtimeConnected ? "官网客服新消息即时推送。" : "当前改为自动轮询同步。",
    },
    {
      label: "进行中会话",
      value: String(openCount),
      desc: "当前仍在推进中的官网客服会话数量。",
    },
    {
      label: "待看消息",
      value: String(unreadCount),
      desc: "来自官网访客、后台尚未查看的未读消息数。",
    },
    {
      label: "当前选中",
      value: selectedSession?.nickname || "待选择",
      desc: "选择会话后可直接查看消息、改状态和发送回复。",
    },
  ];
}
