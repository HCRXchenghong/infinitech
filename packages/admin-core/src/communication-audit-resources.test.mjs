import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminContactPhoneAuditQuery,
  buildAdminRTCCallAuditQuery,
  createAdminAuditPaginationState,
  createAdminContactPhoneAuditFilters,
  createAdminRTCCallForm,
  createAdminContactPhoneAuditSummary,
  createAdminRTCCallAuditFilters,
  createAdminRTCCallAuditSummary,
  createAdminRTCCallReviewAction,
  createAdminRTCTargetSearchForm,
  filterAdminRTCTargets,
  formatAdminCommunicationAuditDateTime,
  formatAdminCommunicationAuditMetadata,
  formatAdminRTCCallDuration,
  getAdminCommunicationRoleLabel,
  getAdminContactPhoneAuditResultLabel,
  getAdminContactPhoneAuditResultTagType,
  getAdminRTCCallAuditRowKey,
  getAdminRTCCallComplaintLabel,
  getAdminRTCCallComplaintTagType,
  getAdminRTCCallRetentionLabel,
  getAdminRTCCallRetentionTagType,
  getAdminRTCCallStatusLabel,
  getAdminRTCCallStatusTagType,
  getAdminRTCCallTypeLabel,
  mergeAdminRTCCallAuditDetail,
  mergeAdminRTCCallAuditRecords,
  normalizeAdminCommunicationRole,
  normalizeAdminRTCTarget,
} from "./communication-audit-resources.js";

test("communication audit resources keep contact phone audit semantics stable", () => {
  assert.deepEqual(createAdminAuditPaginationState(), {
    page: 1,
    limit: 20,
    total: 0,
  });
  assert.equal(normalizeAdminCommunicationRole("shop"), "merchant");
  assert.equal(normalizeAdminCommunicationRole("customer"), "user");
  assert.equal(getAdminCommunicationRoleLabel("merchant"), "商户");
  assert.equal(getAdminCommunicationRoleLabel("shop"), "商户");
  assert.equal(getAdminCommunicationRoleLabel(""), "-");
  assert.equal(
    formatAdminCommunicationAuditDateTime("2026-04-16T12:34:56+08:00"),
    "2026-04-16 12:34:56",
  );
  assert.equal(formatAdminCommunicationAuditDateTime("invalid"), "invalid");
  assert.equal(
    formatAdminCommunicationAuditMetadata('{"ok":true}'),
    '{\n  "ok": true\n}',
  );
  assert.equal(
    formatAdminCommunicationAuditMetadata({ ok: true }),
    '{\n  "ok": true\n}',
  );
  assert.equal(formatAdminCommunicationAuditMetadata(""), "-");
  assert.deepEqual(createAdminContactPhoneAuditFilters(), {
    actorRole: "",
    targetRole: "",
    clientResult: "",
    entryPoint: "",
    keyword: "",
  });
  assert.deepEqual(createAdminContactPhoneAuditSummary({ clicked: "2" }), {
    total: 0,
    clicked: 2,
    opened: 0,
    failed: 0,
  });
  assert.deepEqual(
    buildAdminContactPhoneAuditQuery(
      {
        actorRole: " user ",
        targetRole: "",
        clientResult: " opened ",
        entryPoint: " order_detail ",
        keyword: " 13800138000 ",
      },
      {
        page: "3",
        limit: "50",
      },
    ),
    {
      actorRole: "user",
      targetRole: undefined,
      clientResult: "opened",
      entryPoint: "order_detail",
      keyword: "13800138000",
      page: 3,
      limit: 50,
    },
  );
  assert.equal(getAdminContactPhoneAuditResultLabel("clicked"), "已点击");
  assert.equal(getAdminContactPhoneAuditResultTagType("failed"), "danger");
});

test("communication audit resources keep rtc labels, queries and duration semantics stable", () => {
  assert.deepEqual(createAdminRTCTargetSearchForm({ keyword: " 13800138000 ", role: "shop" }), {
    keyword: "13800138000",
    role: "merchant",
  });
  assert.deepEqual(createAdminRTCCallForm({ orderId: " order-1 " }), {
    conversationId: "",
    orderId: "order-1",
    entryPoint: "admin_rtc_console",
    scene: "admin_support",
  });
  assert.deepEqual(createAdminRTCCallAuditFilters(), {
    callerRole: "",
    calleeRole: "",
    status: "",
    clientKind: "",
    complaintStatus: "",
    keyword: "",
  });
  assert.deepEqual(createAdminRTCCallAuditSummary({ accepted: "8" }), {
    total: 0,
    accepted: 8,
    ended: 0,
    failed: 0,
    complaints: 0,
  });
  assert.deepEqual(
    buildAdminRTCCallAuditQuery(
      {
        callerRole: " rider ",
        calleeRole: " user ",
        status: " accepted ",
        clientKind: " app ",
        complaintStatus: "",
        keyword: " call-1 ",
      },
      {
        page: 2,
        limit: 100,
      },
    ),
    {
      callerRole: "rider",
      calleeRole: "user",
      status: "accepted",
      clientKind: "app",
      complaintStatus: undefined,
      keyword: "call-1",
      page: 2,
      limit: 100,
    },
  );
  assert.equal(getAdminRTCCallAuditRowKey({ uid: "rtc-1" }), "rtc-1");
  assert.equal(getAdminRTCCallTypeLabel("audio"), "语音通话");
  assert.equal(getAdminRTCCallStatusLabel("timeout"), "超时");
  assert.equal(getAdminRTCCallStatusTagType("accepted"), "success");
  assert.equal(getAdminRTCCallComplaintLabel("reported"), "投诉中");
  assert.equal(getAdminRTCCallComplaintTagType("resolved"), "success");
  assert.equal(getAdminRTCCallRetentionLabel("frozen"), "冻结留存");
  assert.equal(getAdminRTCCallRetentionTagType("cleared"), "success");
  assert.equal(formatAdminRTCCallDuration(0), "0 秒");
  assert.equal(formatAdminRTCCallDuration(45), "45 秒");
  assert.equal(formatAdminRTCCallDuration(75), "1 分 15 秒");
  assert.equal(formatAdminRTCCallDuration(3600), "1 小时");
  assert.deepEqual(
    normalizeAdminRTCTarget({
      role: "shop",
      id: "merchant-1",
      phone: "13800138000",
      name: " 商户A ",
    }),
    {
      resultKey: "merchant:merchant-1",
      role: "merchant",
      chatId: "merchant-1",
      id: "merchant-1",
      uid: "",
      legacyId: "",
      phone: "13800138000",
      name: "商户A",
      avatar: "",
    },
  );
  assert.deepEqual(
    filterAdminRTCTargets(
      [
        { role: "user", id: "u-1" },
        { role: "shop", id: "m-1" },
        { role: "admin", id: "a-1" },
      ],
      "merchant",
    ),
    [
      {
        resultKey: "merchant:m-1",
        role: "merchant",
        chatId: "m-1",
        id: "m-1",
        uid: "",
        legacyId: "",
        phone: "",
        name: "",
        avatar: "",
      },
    ],
  );
});

test("communication audit resources keep rtc review actions and merge semantics stable", () => {
  assert.deepEqual(createAdminRTCCallReviewAction("markComplaint"), {
    payload: { complaintStatus: "reported" },
    successMessage: "已标记为投诉中，并冻结录音留存",
    confirmMessage: "确认将该通话标记为投诉中并冻结录音留存吗？",
  });
  assert.equal(createAdminRTCCallReviewAction("unknown"), null);
  assert.deepEqual(
    mergeAdminRTCCallAuditRecords(
      [
        { uid: "rtc-1", complaint_status: "none" },
        { uid: "rtc-2", complaint_status: "none" },
      ],
      { uid: "rtc-2", complaint_status: "reported" },
    ),
    [
      { uid: "rtc-1", complaint_status: "none" },
      { uid: "rtc-2", complaint_status: "reported" },
    ],
  );
  assert.deepEqual(
    mergeAdminRTCCallAuditDetail(
      { uid: "rtc-2", complaint_status: "none", metadata: "x" },
      { uid: "rtc-2", complaint_status: "reported" },
    ),
    { uid: "rtc-2", complaint_status: "reported", metadata: "x" },
  );
  assert.deepEqual(
    mergeAdminRTCCallAuditDetail(
      { uid: "rtc-2", complaint_status: "none" },
      { uid: "rtc-3", complaint_status: "reported" },
    ),
    { uid: "rtc-2", complaint_status: "none" },
  );
});
