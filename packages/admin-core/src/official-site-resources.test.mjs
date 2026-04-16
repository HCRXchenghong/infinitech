import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminOfficialSiteSupportSummaryCards,
  compareOfficialSiteSupportMessages,
  createAdminOfficialSiteExposureDraft,
  extractOfficialSiteRecordCollection,
  extractOfficialSiteSupportMessageBundle,
  mergeOfficialSiteSupportMessages,
  mergeOfficialSiteSupportSession,
  officialSiteExposureProcessLabel,
  officialSiteExposureProcessTagType,
  officialSiteExposureReviewLabel,
  officialSiteExposureReviewTagType,
  officialSiteSupportMessageKey,
  upsertOfficialSiteSupportSessions,
} from "./official-site-resources.js";

test("extractOfficialSiteRecordCollection unwraps records and pagination", () => {
  assert.deepEqual(
    extractOfficialSiteRecordCollection({
      data: {
        records: [{ id: "expo-1" }],
        pagination: {
          total: 8,
          page: 2,
          limit: 20,
        },
      },
    }),
    {
      records: [{ id: "expo-1" }],
      total: 8,
      page: 2,
      limit: 20,
    },
  );
});

test("extractOfficialSiteSupportMessageBundle unwraps session and messages", () => {
  assert.deepEqual(
    extractOfficialSiteSupportMessageBundle({
      data: {
        session: { id: "session-1" },
        messages: [{ id: "msg-1" }],
      },
    }),
    {
      session: { id: "session-1" },
      messages: [{ id: "msg-1" }],
    },
  );
});

test("official site exposure helpers keep review and process semantics", () => {
  assert.equal(officialSiteExposureReviewLabel("approved"), "已通过");
  assert.equal(officialSiteExposureReviewTagType("rejected"), "danger");
  assert.equal(officialSiteExposureProcessLabel("processing"), "处理中");
  assert.equal(officialSiteExposureProcessTagType("unresolved"), "danger");
  assert.deepEqual(createAdminOfficialSiteExposureDraft(), {
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
  });
});

test("support session helpers merge and sort by latest activity", () => {
  const current = { id: "session-1", nickname: "Old", status: "open" };
  assert.deepEqual(
    mergeOfficialSiteSupportSession(current, { id: "session-1", nickname: "New" }),
    { id: "session-1", nickname: "New", status: "open" },
  );

  const nextRecords = upsertOfficialSiteSupportSessions(
    [
      {
        id: "session-2",
        last_message_at: "2026-04-16T10:00:00Z",
      },
    ],
    {
      id: "session-1",
      last_message_at: "2026-04-16T11:00:00Z",
      unread_admin_count: 3,
    },
  );

  assert.deepEqual(nextRecords, [
    {
      id: "session-1",
      last_message_at: "2026-04-16T11:00:00Z",
      unread_admin_count: 3,
    },
    {
      id: "session-2",
      last_message_at: "2026-04-16T10:00:00Z",
    },
  ]);
});

test("support message helpers dedupe and keep chronological order", () => {
  assert.equal(
    officialSiteSupportMessageKey({ sender_type: "visitor", created_at: "t1", content: "hello" }),
    "visitor:t1:hello",
  );

  const merged = mergeOfficialSiteSupportMessages(
    [
      { id: "msg-2", created_at: "2026-04-16T10:01:00Z", content: "2" },
      { id: "msg-1", created_at: "2026-04-16T10:00:00Z", content: "1" },
    ],
    [
      { id: "msg-2", created_at: "2026-04-16T10:01:00Z", content: "2-latest" },
      { legacy_id: "legacy-3", created_at: "2026-04-16T10:02:00Z", content: "3" },
    ],
  );

  assert.deepEqual(merged, [
    { id: "msg-1", created_at: "2026-04-16T10:00:00Z", content: "1" },
    { id: "msg-2", created_at: "2026-04-16T10:01:00Z", content: "2-latest" },
    { legacy_id: "legacy-3", created_at: "2026-04-16T10:02:00Z", content: "3" },
  ]);
  assert.equal(
    compareOfficialSiteSupportMessages(
      { id: "left", created_at: "2026-04-16T10:00:00Z" },
      { id: "right", created_at: "2026-04-16T10:01:00Z" },
    ) < 0,
    true,
  );
});

test("buildAdminOfficialSiteSupportSummaryCards derives support metrics", () => {
  assert.deepEqual(
    buildAdminOfficialSiteSupportSummaryCards({
      realtimeConnected: true,
      sessions: [
        { id: "session-1", status: "open", unread_admin_count: 2 },
        { id: "session-2", status: "closed", unread_admin_count: 1 },
      ],
      selectedSession: { nickname: "测试访客" },
    }),
    [
      {
        label: "实时链路",
        value: "在线",
        desc: "官网客服新消息即时推送。",
      },
      {
        label: "进行中会话",
        value: "1",
        desc: "当前仍在推进中的官网客服会话数量。",
      },
      {
        label: "待看消息",
        value: "3",
        desc: "来自官网访客、后台尚未查看的未读消息数。",
      },
      {
        label: "当前选中",
        value: "测试访客",
        desc: "选择会话后可直接查看消息、改状态和发送回复。",
      },
    ],
  );
});
