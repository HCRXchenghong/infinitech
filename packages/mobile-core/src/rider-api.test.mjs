import test from "node:test";
import assert from "node:assert/strict";

import { createRiderBusinessApi } from "./rider-api.js";

test("rider business api binds rider-scoped endpoints and rider action payloads", async () => {
  const calls = [];
  const riderApi = createRiderBusinessApi({
    readPrincipalId() {
      return "rider 1";
    },
    request(options) {
      calls.push(options);
      if (options.url.includes("/change-phone")) {
        return Promise.resolve({ data: { token: "next-token" } });
      }
      return Promise.resolve({ ok: true, url: options.url });
    },
    extractAuthSessionResult(response) {
      return {
        normalized: true,
        response,
      };
    },
  });

  assert.deepEqual(await riderApi.fetchRiderInfo(), {
    ok: true,
    url: "/api/riders/rider%201",
  });
  assert.deepEqual(await riderApi.fetchRiderOrders("available"), {
    ok: true,
    url: "/api/riders/orders/available",
  });
  assert.deepEqual(await riderApi.fetchRiderOrders("completed"), {
    ok: true,
    url: "/api/riders/rider%201/orders",
  });
  assert.deepEqual(await riderApi.acceptOrder("order/1"), {
    ok: true,
    url: "/api/orders/order%2F1/accept",
  });
  assert.deepEqual(await riderApi.pickupOrder("order/1"), {
    ok: true,
    url: "/api/orders/order%2F1/pickup",
  });
  assert.deepEqual(await riderApi.deliverOrder("order/1"), {
    ok: true,
    url: "/api/orders/order%2F1/deliver",
  });
  assert.deepEqual(await riderApi.reportOrderException("order/1", { reason: "late" }), {
    ok: true,
    url: "/api/orders/order%2F1/exception-report",
  });
  assert.deepEqual(await riderApi.fetchEarnings({ month: "2026-04" }), {
    ok: true,
    url: "/api/riders/rider%201/earnings",
  });
  assert.deepEqual(await riderApi.fetchRiderStats(), {
    ok: true,
    url: "/api/riders/rider%201/stats",
  });
  assert.deepEqual(await riderApi.updateRiderStatus(true), {
    ok: true,
    url: "/api/riders/rider%201/online-status",
  });
  assert.deepEqual(await riderApi.heartbeatRiderStatus(), {
    ok: true,
    url: "/api/riders/rider%201/heartbeat",
  });
  assert.deepEqual(await riderApi.updateAvatar("https://cdn/avatar.png"), {
    ok: true,
    url: "/api/riders/rider%201/avatar",
  });
  assert.deepEqual(await riderApi.getRiderProfile(), {
    ok: true,
    url: "/api/riders/rider%201/profile",
  });
  assert.deepEqual(await riderApi.updateRiderProfile({ nickname: "骑手A" }), {
    ok: true,
    url: "/api/riders/rider%201/profile",
  });
  assert.deepEqual(await riderApi.changePhone({ phone: "13800000000" }), {
    normalized: true,
    response: { data: { token: "next-token" } },
  });
  assert.deepEqual(await riderApi.changePassword({ nextPassword: "secret" }), {
    ok: true,
    url: "/api/riders/rider%201/change-password",
  });
  assert.deepEqual(await riderApi.getRiderRank(), {
    ok: true,
    url: "/api/riders/rider%201/rank",
  });
  assert.deepEqual(await riderApi.getRiderRating(), {
    ok: true,
    url: "/api/riders/rider%201/rating",
  });
  assert.deepEqual(await riderApi.getRankList("week rank"), {
    ok: true,
    url: "/api/riders/rank-list?type=week%20rank",
  });

  assert.deepEqual(calls, [
    {
      url: "/api/riders/rider%201",
    },
    {
      url: "/api/riders/orders/available",
      method: "GET",
      data: {},
    },
    {
      url: "/api/riders/rider%201/orders",
      method: "GET",
      data: { status: "completed" },
    },
    {
      url: "/api/orders/order%2F1/accept",
      method: "POST",
      data: { rider_id: "rider 1" },
    },
    {
      url: "/api/orders/order%2F1/pickup",
      method: "POST",
      data: { rider_id: "rider 1" },
    },
    {
      url: "/api/orders/order%2F1/deliver",
      method: "POST",
      data: { rider_id: "rider 1" },
    },
    {
      url: "/api/orders/order%2F1/exception-report",
      method: "POST",
      data: { reason: "late" },
    },
    {
      url: "/api/riders/rider%201/earnings",
      data: { month: "2026-04" },
    },
    {
      url: "/api/riders/rider%201/stats",
    },
    {
      url: "/api/riders/rider%201/online-status",
      method: "PUT",
      data: { is_online: true },
    },
    {
      url: "/api/riders/rider%201/heartbeat",
      method: "POST",
    },
    {
      url: "/api/riders/rider%201/avatar",
      method: "PUT",
      data: { avatar: "https://cdn/avatar.png" },
    },
    {
      url: "/api/riders/rider%201/profile",
    },
    {
      url: "/api/riders/rider%201/profile",
      method: "PUT",
      data: { nickname: "骑手A" },
    },
    {
      url: "/api/riders/rider%201/change-phone",
      method: "POST",
      data: { phone: "13800000000" },
    },
    {
      url: "/api/riders/rider%201/change-password",
      method: "POST",
      data: { nextPassword: "secret" },
    },
    {
      url: "/api/riders/rider%201/rank",
      method: "GET",
    },
    {
      url: "/api/riders/rider%201/rating",
      method: "GET",
    },
    {
      url: "/api/riders/rank-list?type=week%20rank",
      method: "GET",
    },
  ]);
});

test("rider business api falls back cleanly when rider identity is missing", async () => {
  const calls = [];
  const riderApi = createRiderBusinessApi({
    readPrincipalId() {
      return "";
    },
    request(options) {
      calls.push(options);
      return Promise.resolve({ ok: true, url: options.url });
    },
  });

  assert.equal(await riderApi.fetchRiderInfo(), null);
  assert.deepEqual(await riderApi.fetchRiderOrders(), []);
  assert.deepEqual(await riderApi.fetchEarnings(), {
    success: true,
    summary: {
      totalIncome: 0,
      settledIncome: 0,
      pendingIncome: 0,
      orderCount: 0,
    },
    items: [],
  });
  assert.deepEqual(await riderApi.fetchRiderStats(), {
    todayEarnings: "0",
    completedCount: 0,
  });
  assert.equal(await riderApi.updateRiderStatus(false), null);
  assert.equal(await riderApi.heartbeatRiderStatus(), null);
  assert.equal(await riderApi.updateAvatar("avatar"), null);
  assert.equal(await riderApi.getRiderProfile(), null);
  assert.equal(await riderApi.updateRiderProfile({ nickname: "test" }), null);
  assert.equal(await riderApi.changePhone({ phone: "13800000000" }), null);
  assert.equal(await riderApi.changePassword({ nextPassword: "secret" }), null);
  assert.equal(await riderApi.getRiderRank(), null);
  assert.equal(await riderApi.getRiderRating(), null);

  await riderApi.acceptOrder("order-1");
  await riderApi.pickupOrder("order-1");
  await riderApi.deliverOrder("order-1");
  await riderApi.reportOrderException("order-1", { reason: "missing" });
  await riderApi.getRankList("month");

  assert.deepEqual(calls, [
    {
      url: "/api/orders/order-1/accept",
      method: "POST",
      data: {},
    },
    {
      url: "/api/orders/order-1/pickup",
      method: "POST",
      data: {},
    },
    {
      url: "/api/orders/order-1/deliver",
      method: "POST",
      data: {},
    },
    {
      url: "/api/orders/order-1/exception-report",
      method: "POST",
      data: { reason: "missing" },
    },
    {
      url: "/api/riders/rank-list?type=month",
      method: "GET",
    },
  ]);
});
