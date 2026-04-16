import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminNotificationSummary,
  extractAdminNotificationPage,
  filterAdminNotifications,
  formatAdminNotificationStatus,
  formatAdminNotificationTime,
  getAdminNotificationStatusTagType,
  normalizeAdminNotificationRecord,
  sortAdminNotificationsByUpdatedAt,
} from "./notification-resources.js";

test("admin notification resources normalize and extract records", () => {
  assert.deepEqual(
    normalizeAdminNotificationRecord({
      id: 12,
      title: " 系统升级 ",
      source: "",
      is_published: 1,
      createdAt: "2026-04-10T10:00:00Z",
    }),
    {
      id: 12,
      title: "系统升级",
      source: "悦享e食",
      cover: "",
      is_published: true,
      created_at: "2026-04-10T10:00:00Z",
      updated_at: "",
      createdAt: "2026-04-10T10:00:00Z",
    },
  );

  assert.deepEqual(
    extractAdminNotificationPage({
      data: {
        notifications: [
          { id: 1, title: "公告A", source: "平台", is_published: 1 },
          { id: 2, title: "公告B", source: "", is_published: 0 },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    }),
    {
      items: [
        {
          id: 1,
          title: "公告A",
          source: "平台",
          cover: "",
          is_published: true,
          created_at: "",
          updated_at: "",
        },
        {
          id: 2,
          title: "公告B",
          source: "悦享e食",
          cover: "",
          is_published: false,
          created_at: "",
          updated_at: "",
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    },
  );
});

test("admin notification resources keep filtering and summary semantics stable", () => {
  const records = sortAdminNotificationsByUpdatedAt([
    { id: 1, title: "商户通知", source: "运营", is_published: false, updated_at: "2026-04-01T08:00:00Z" },
    { id: 2, title: "系统公告", source: "平台", is_published: true, updated_at: "2026-04-02T08:00:00Z" },
  ]);

  assert.deepEqual(records.map((item) => item.id), [2, 1]);
  assert.deepEqual(
    filterAdminNotifications(records, { keyword: "系统", status: "published" }).map((item) => item.id),
    [2],
  );
  assert.deepEqual(buildAdminNotificationSummary(records), {
    total: 2,
    published: 1,
    draft: 1,
  });
  assert.equal(formatAdminNotificationStatus(true), "已发布");
  assert.equal(getAdminNotificationStatusTagType(false), "info");
  assert.equal(formatAdminNotificationTime("2026-04-02T08:03:00+08:00"), "2026-04-02 08:03");
});
