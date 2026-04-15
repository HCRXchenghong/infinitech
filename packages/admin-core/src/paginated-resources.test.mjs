import test from "node:test";
import assert from "node:assert/strict";

import {
  extractContactPhoneAuditPage,
  extractAdminMerchantPage,
  extractRTCCallAuditPage,
  extractRTCCallAuditRecord,
  extractRiderReviewPage,
  extractAdminRiderPage,
  extractShopReviewPage,
  extractAdminUserPage,
  normalizeAdminMerchantSummary,
  normalizeAdminRiderSummary,
} from "./paginated-resources.js";

test("extractAdminUserPage supports enveloped and legacy user payloads", () => {
  assert.deepEqual(
    extractAdminUserPage({
      data: {
        items: [{ id: 1, name: "Alice" }],
        total: 3,
        page: 2,
        limit: 20,
      },
    }),
    {
      items: [{ id: 1, name: "Alice" }],
      total: 3,
      page: 2,
      limit: 20,
    },
  );

  assert.deepEqual(
    extractAdminUserPage({
      users: [{ id: 2, name: "Bob" }],
      total: 1,
    }),
    {
      items: [{ id: 2, name: "Bob" }],
      total: 1,
      page: 0,
      limit: 0,
    },
  );
});

test("normalizeAdminRiderSummary coerces rider flags and numbers", () => {
  assert.deepEqual(
    normalizeAdminRiderSummary({
      id: 8,
      is_online: 1,
      rating: "4.8",
      rating_count: "12",
    }),
    {
      id: 8,
      is_online: true,
      rating: 4.8,
      rating_count: 12,
    },
  );
});

test("extractAdminRiderPage supports legacy rider payloads", () => {
  assert.deepEqual(
    extractAdminRiderPage({
      riders: [{ id: 3, is_online: 0, rating: null, ratingCount: 6 }],
      total: 1,
    }),
    {
      items: [{ id: 3, is_online: false, rating: 0, ratingCount: 6, rating_count: 6 }],
      total: 1,
      page: 0,
      limit: 0,
    },
  );
});

test("normalizeAdminMerchantSummary fills owner name and shop count defaults", () => {
  assert.deepEqual(
    normalizeAdminMerchantSummary({
      id: 9,
      name: "Store 9",
      shop_count: "5",
    }),
    {
      id: 9,
      name: "Store 9",
      owner_name: "Store 9",
      shop_count: "5",
      shopCount: 5,
    },
  );
});

test("extractAdminMerchantPage supports enveloped merchant payloads", () => {
  assert.deepEqual(
    extractAdminMerchantPage({
      data: {
        merchants: [{ id: 5, owner_name: "Jane", shopCount: "2" }],
        total: 4,
      },
    }),
    {
      items: [{ id: 5, owner_name: "Jane", shopCount: 2 }],
      total: 4,
      page: 0,
      limit: 0,
    },
  );
});

test("extractContactPhoneAuditPage reads summary and nested pagination", () => {
  assert.deepEqual(
    extractContactPhoneAuditPage({
      data: {
        items: [{ id: 1 }],
        summary: {
          total: 9,
          clicked: 4,
          opened: 3,
          failed: 2,
        },
        pagination: {
          total: 9,
          page: 2,
          limit: 20,
        },
      },
    }),
    {
      items: [{ id: 1 }],
      total: 9,
      page: 2,
      limit: 20,
      summary: {
        total: 9,
        clicked: 4,
        opened: 3,
        failed: 2,
      },
      pagination: {
        total: 9,
        page: 2,
        limit: 20,
      },
    },
  );
});

test("extractRTCCallAuditPage reads rtc summary and extractRTCCallAuditRecord unwraps envelopes", () => {
  assert.deepEqual(
    extractRTCCallAuditPage({
      data: {
        items: [{ uid: "call-1" }],
        summary: {
          total: 5,
          accepted: 2,
          ended: 1,
          failed: 1,
          complaints: 1,
        },
        pagination: {
          total: 5,
          page: 1,
          limit: 8,
        },
      },
    }),
    {
      items: [{ uid: "call-1" }],
      total: 5,
      page: 1,
      limit: 8,
      summary: {
        total: 5,
        accepted: 2,
        ended: 1,
        failed: 1,
        complaints: 1,
      },
      pagination: {
        total: 5,
        page: 1,
        limit: 8,
      },
    },
  );

  assert.deepEqual(
    extractRTCCallAuditRecord({
      data: {
        uid: "call-2",
        complaint_status: "reported",
      },
    }),
    {
      uid: "call-2",
      complaint_status: "reported",
    },
  );
});

test("extractShopReviewPage reads legacy review lists and pageSize metadata", () => {
  assert.deepEqual(
    extractShopReviewPage({
      list: [{ id: 11, rating: 5 }],
      total: 14,
      page: 2,
      pageSize: 50,
      goodCount: 10,
      badCount: 1,
      avgRating: 4.8,
    }),
    {
      items: [{ id: 11, rating: 5 }],
      total: 14,
      page: 2,
      limit: 50,
      summary: {
        goodCount: 10,
        badCount: 1,
        avgRating: 4.8,
      },
      pagination: {
        total: 14,
        page: 2,
        limit: 50,
      },
    },
  );
});

test("extractRiderReviewPage reads enveloped rider review summaries", () => {
  assert.deepEqual(
    extractRiderReviewPage({
      data: {
        items: [{ id: 21, rating: 4 }],
        total: 5,
        page: 1,
        limit: 20,
        summary: {
          rating: 4.9,
          ratingCount: 18,
        },
      },
    }),
    {
      items: [{ id: 21, rating: 4 }],
      total: 5,
      page: 1,
      limit: 20,
      summary: {
        rating: 4.9,
        rating_count: 18,
        ratingCount: 18,
      },
      pagination: {
        total: 5,
        page: 1,
        limit: 20,
      },
    },
  );
});
