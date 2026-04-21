import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDiningBuddyMessageDeletePayload,
  buildDiningBuddyPartyActionPayload,
  buildDiningBuddyPartyListQuery,
  buildDiningBuddyReportActionPayload,
  buildDiningBuddyReportListQuery,
  buildDiningBuddyRestrictionPayload,
  buildDiningBuddyRuntimePayload,
  buildDiningBuddySensitivePayload,
  createDiningBuddyPartyFilterState,
  createDiningBuddyReportFilterState,
  createDiningBuddyRestrictionForm,
  createDiningBuddyRuntimeForm,
  createDiningBuddyRuntimeQuestion,
  createDiningBuddySensitiveForm,
  extractDiningBuddyAuditLogList,
  extractDiningBuddyMessageList,
  extractDiningBuddyPartyDetail,
  extractDiningBuddyPartyList,
  extractDiningBuddyReportList,
  extractDiningBuddyRestrictionList,
  extractDiningBuddyRuntimeSettings,
  extractDiningBuddySensitiveWordList,
  DINING_BUDDY_PARTY_CATEGORY_OPTIONS,
  DINING_BUDDY_PARTY_STATUS_OPTIONS,
  DINING_BUDDY_REPORT_STATUS_OPTIONS,
  DINING_BUDDY_RESTRICTION_TYPE_OPTIONS,
  getDiningBuddyPartyActionLabel,
  getDiningBuddyReportActionLabel,
  getDiningBuddyRestrictionDialogTitle,
  getDiningBuddySensitiveDialogTitle,
  sortDiningBuddyRuntimeCategories,
  validateDiningBuddyRestrictionForm,
  validateDiningBuddyRuntimeForm,
  validateDiningBuddySensitiveForm,
} from "./dining-buddy-governance-resources.js";

test("dining buddy runtime helpers keep form and query semantics stable", () => {
  const question = createDiningBuddyRuntimeQuestion({
    question: "  周末想做什么  ",
    options: [{ text: "  吃饭  ", icon: "  🍜  " }],
  });
  assert.match(question.localKey, /^question-/);
  assert.match(question.options[0].localKey, /^option-/);
  assert.equal(question.question, "周末想做什么");
  assert.deepEqual(question.options[0], {
    localKey: question.options[0].localKey,
    text: "吃饭",
    icon: "🍜",
  });

  const form = createDiningBuddyRuntimeForm({
    enabled: false,
    welcome_title: "  欢迎来到同频饭友  ",
    categories: [
      { id: "food", label: "约饭", sort_order: "20" },
      { id: "study", label: "学习", sort_order: "10" },
    ],
    questions: [
      {
        question: "偏好时间",
        options: [
          { text: "晚上", icon: "🌙" },
          { text: "   ", icon: "x" },
        ],
      },
    ],
  });
  assert.equal(form.enabled, false);
  assert.equal(form.welcome_title, "欢迎来到同频饭友");
  assert.deepEqual(
    sortDiningBuddyRuntimeCategories(form.categories).map((item) => item.id),
    ["study", "food"],
  );
  assert.equal(validateDiningBuddyRuntimeForm({ welcome_title: " " }), "欢迎标题不能为空");
  assert.deepEqual(buildDiningBuddyRuntimePayload(form), {
    enabled: false,
    welcome_title: "欢迎来到同频饭友",
    welcome_subtitle: "",
    publish_limit_per_day: 5,
    message_rate_limit_per_minute: 20,
    default_max_people: 4,
    max_max_people: 6,
    auto_close_expired_hours: 24,
    categories: [
      {
        id: "food",
        label: "约饭",
        icon: "",
        icon_type: "image",
        enabled: true,
        sort_order: 20,
        color: "",
      },
      {
        id: "study",
        label: "学习",
        icon: "",
        icon_type: "image",
        enabled: true,
        sort_order: 10,
        color: "",
      },
    ],
    questions: [
      {
        question: "偏好时间",
        options: [{ text: "晚上", icon: "🌙" }],
      },
    ],
  });

  assert.deepEqual(createDiningBuddyPartyFilterState(), {
    status: "",
    category: "",
    search: "",
  });
  assert.deepEqual(
    buildDiningBuddyPartyListQuery({ status: "open", category: "food", search: " Alice " }),
    { status: "open", category: "food", search: "Alice" },
  );
  assert.equal(getDiningBuddyPartyActionLabel("reopen"), "重开");
  assert.deepEqual(buildDiningBuddyPartyActionPayload("  管理员关闭  "), {
    reason: "管理员关闭",
  });

  assert.deepEqual(createDiningBuddyReportFilterState(), { status: "" });
  assert.deepEqual(buildDiningBuddyReportListQuery({ status: "pending" }), { status: "pending" });
  assert.equal(getDiningBuddyReportActionLabel("resolve"), "受理");
  assert.deepEqual(
    buildDiningBuddyReportActionPayload("resolve", {
      resolutionNote: "  已核实  ",
      resolutionAction: "",
    }),
    {
      resolution_note: "已核实",
      resolution_action: "manual_review",
    },
  );
});

test("dining buddy moderation forms keep dialog and payload semantics stable", () => {
  assert.equal(DINING_BUDDY_PARTY_STATUS_OPTIONS.length, 3);
  assert.equal(DINING_BUDDY_PARTY_CATEGORY_OPTIONS.length, 3);
  assert.equal(DINING_BUDDY_REPORT_STATUS_OPTIONS.length, 3);
  assert.equal(DINING_BUDDY_RESTRICTION_TYPE_OPTIONS.length, 2);

  const sensitiveForm = createDiningBuddySensitiveForm({
    id: "WORD-1",
    word: "  spam  ",
    description: "  广告词  ",
    enabled: "false",
  });
  assert.equal(getDiningBuddySensitiveDialogTitle(sensitiveForm), "编辑敏感词");
  assert.equal(validateDiningBuddySensitiveForm({ word: " " }), "敏感词不能为空");
  assert.deepEqual(buildDiningBuddySensitivePayload(sensitiveForm), {
    word: "spam",
    description: "广告词",
    enabled: false,
  });

  const restrictionForm = createDiningBuddyRestrictionForm({
    user_uid: "U-100",
    restriction_type: "ban",
    reason: "  风险账号  ",
    note: "  需人工复核  ",
    expires_at: " 2026-05-01T00:00:00Z ",
  });
  assert.equal(getDiningBuddyRestrictionDialogTitle(restrictionForm), "新增用户限制");
  assert.equal(
    validateDiningBuddyRestrictionForm({ target_user_id: "", restriction_type: "" }),
    "目标用户和限制类型不能为空",
  );
  assert.deepEqual(buildDiningBuddyRestrictionPayload(restrictionForm), {
    target_user_id: "U-100",
    restriction_type: "ban",
    reason: "风险账号",
    note: "需人工复核",
    expires_at: "2026-05-01T00:00:00Z",
  });

  assert.deepEqual(buildDiningBuddyMessageDeletePayload("  删除违规内容  "), {
    reason: "删除违规内容",
  });
});

test("dining buddy extract helpers unwrap runtime, list and detail payloads safely", () => {
  assert.equal(
    extractDiningBuddyRuntimeSettings({
      data: { welcome_title: "  同频饭友欢迎你  " },
    }).welcome_title,
    "同频饭友欢迎你",
  );

  assert.deepEqual(
    extractDiningBuddyPartyList({
      data: {
        parties: [{ id: "party-1", title: "一起晚餐" }],
        pagination: { total: 1 },
      },
    }),
    [{ id: "party-1", title: "一起晚餐" }],
  );

  assert.deepEqual(
    extractDiningBuddyPartyDetail(
      { data: { id: "party-2", title: "学习搭子" } },
      { id: "fallback" },
    ),
    { id: "party-2", title: "学习搭子" },
  );

  assert.deepEqual(
    extractDiningBuddyPartyDetail(null, { id: "fallback", title: "回退详情" }),
    { id: "fallback", title: "回退详情" },
  );

  assert.deepEqual(
    extractDiningBuddyMessageList({ data: { messages: [{ id: "msg-1" }] } }),
    [{ id: "msg-1" }],
  );
  assert.deepEqual(
    extractDiningBuddyReportList({ data: { reports: [{ id: "report-1" }] } }),
    [{ id: "report-1" }],
  );
  assert.deepEqual(
    extractDiningBuddySensitiveWordList({ data: { items: [{ id: "word-1" }] } }),
    [{ id: "word-1" }],
  );
  assert.deepEqual(
    extractDiningBuddyRestrictionList({ data: { items: [{ id: "restriction-1" }] } }),
    [{ id: "restriction-1" }],
  );
  assert.deepEqual(
    extractDiningBuddyAuditLogList({ data: { items: [{ id: "audit-1" }] } }),
    [{ id: "audit-1" }],
  );
});
