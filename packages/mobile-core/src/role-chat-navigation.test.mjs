import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleChatRouteUrl,
  navigateToRoleChat,
  resolveRoleChatOrderId,
} from "./role-chat-navigation.js";

test("role chat navigation resolves order ids from mixed payloads", () => {
  assert.equal(resolveRoleChatOrderId({ order_id: "order-1" }), "order-1");
  assert.equal(resolveRoleChatOrderId({ daily_order_id: "daily-2" }), "daily-2");
  assert.equal(resolveRoleChatOrderId({}), "");
});

test("role chat navigation builds encoded chat urls with normalized roles", () => {
  assert.equal(
    buildRoleChatRouteUrl({
      baseUrl: "/pages/messages/chat",
      chatId: "shop_order-1",
      role: "support",
      name: "平台 客服",
      targetId: "merchant-1",
      orderId: "order-1",
      allowedRoles: ["user", "rider", "admin"],
    }),
    "/pages/messages/chat?chatId=shop_order-1&role=admin&name=%E5%B9%B3%E5%8F%B0%20%E5%AE%A2%E6%9C%8D&targetId=merchant-1&orderId=order-1",
  );
});

test("role chat navigation can navigate through injected uni runtime", () => {
  const calls = [];
  const uniApp = {
    navigateTo(payload) {
      calls.push(payload);
    },
  };

  const url = navigateToRoleChat(uniApp, {
    chatId: "rs_order-2",
    role: "merchant",
    name: "商家会话",
    targetId: "shop-2",
    orderId: "order-2",
  });

  assert.equal(
    url,
    "/pages/service/index?chatId=rs_order-2&role=merchant&name=%E5%95%86%E5%AE%B6%E4%BC%9A%E8%AF%9D&targetId=shop-2&orderId=order-2",
  );
  assert.deepEqual(calls, [{ url }]);
});
