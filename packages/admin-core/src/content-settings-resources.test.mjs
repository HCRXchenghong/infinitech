import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminPushMessageStats,
  createAdminCarouselForm,
  createAdminPushMessageForm,
  extractAdminCarouselPage,
  extractAdminPushDeliveryPage,
  extractAdminPushMessagePage,
  formatPushDeliveryActionLabel,
  formatPushDeliveryError,
  formatPushDeliveryTime,
  getPushDeliveryActionTagType,
  getPushDeliveryStatusTagType,
  normalizeAdminCarouselRecord,
  normalizeAdminPushMessageFormState,
  normalizeAdminPushMessageRecord,
  validateAdminImageFile,
} from "./content-settings-resources.js";

test("content settings resources provide stable admin forms and extraction", () => {
  assert.deepEqual(createAdminPushMessageForm(), {
    title: "",
    content: "",
    image_url: "",
    compress_image: true,
    is_active: false,
    scheduled_start_time: "",
    scheduled_end_time: "",
  });

  assert.deepEqual(
    normalizeAdminPushMessageFormState({
      title: " 平台提醒 ",
      content: "通知内容",
      image_url: "/banner.png",
      is_active: 1,
      scheduled_start_time: "2026-04-16 10:00:00",
    }),
    {
      title: "平台提醒",
      content: "通知内容",
      image_url: "/banner.png",
      compress_image: true,
      is_active: true,
      scheduled_start_time: "2026-04-16 10:00:00",
      scheduled_end_time: "",
    },
  );

  assert.deepEqual(createAdminCarouselForm(), {
    title: "",
    image_url: "",
    link_url: "",
    link_type: "external",
    sort_order: 0,
    is_active: true,
  });

  assert.deepEqual(
    extractAdminPushMessagePage({
      data: {
        messages: [{ id: 9, title: "新消息", is_active: 1 }],
        total: 1,
      },
    }),
    {
      items: [
        {
          id: 9,
          title: "新消息",
          content: "",
          image_url: "",
          compress_image: true,
          is_active: true,
          scheduled_start_time: "",
          scheduled_end_time: "",
        },
      ],
      total: 1,
      page: 0,
      limit: 0,
    },
  );
});

test("content settings resources keep delivery and stats semantics stable", () => {
  assert.deepEqual(
    normalizeAdminCarouselRecord({
      id: 3,
      title: "  首页焦点 ",
      image_url: "/carousel.png",
      link_url: " /landing ",
      sort_order: "7",
      is_active: 0,
    }),
    {
      id: 3,
      title: "首页焦点",
      image_url: "/carousel.png",
      link_url: "/landing",
      link_type: "external",
      sort_order: 7,
      is_active: false,
    },
  );

  assert.deepEqual(
    extractAdminCarouselPage({
      data: {
        carousels: [{ id: 1, title: "图1", image_url: "/a.png", is_active: 1 }],
      },
    }).items,
    [
      {
        id: 1,
        title: "图1",
        image_url: "/a.png",
        link_url: "",
        link_type: "external",
        sort_order: 0,
        is_active: true,
      },
    ],
  );

  assert.deepEqual(
    extractAdminPushDeliveryPage({
      data: {
        deliveries: [{ id: 1 }, { id: 2 }],
      },
    }).items,
    [{ id: 1 }, { id: 2 }],
  );

  assert.equal(getPushDeliveryStatusTagType("retry_pending"), "warning");
  assert.equal(getPushDeliveryActionTagType("opened"), "success");
  assert.equal(formatPushDeliveryActionLabel("dismissed"), "已忽略");
  assert.equal(formatPushDeliveryTime(""), "—");
  assert.equal(
    formatPushDeliveryError({
      error_code: "E401",
      error_message: "权限不足",
    }),
    "E401: 权限不足",
  );
  assert.deepEqual(
    buildAdminPushMessageStats(
      normalizeAdminPushMessageRecord({ id: 2, title: "活动通知", is_active: 1 }),
      { total_users: 100, read_rate_percent: 56.789 },
    ),
    {
      id: 2,
      title: "活动通知",
      content: "",
      image_url: "",
      compress_image: true,
      is_active: true,
      scheduled_start_time: "",
      scheduled_end_time: "",
      total_users: 100,
      read_rate_percent: 56.789,
      read_rate_display: "56.79%",
    },
  );
  assert.deepEqual(validateAdminImageFile({ type: "image/png", size: 1024 }, 10), {
    valid: true,
    message: "",
  });
});
