import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAdminMerchantPage,
  extractAdminRiderPage,
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
