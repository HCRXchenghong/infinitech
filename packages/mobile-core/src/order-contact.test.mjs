import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOrderChatContext,
  buildOrderPhoneAuditPayload,
  buildOrderRTCContext,
  riderNameFromOrder,
} from "./order-contact.js";

test("order contact helpers build merchant and rider audit payloads", () => {
  const order = {
    id: "order_1",
    shopId: "shop_9",
    riderId: "rider_7",
    bizType: "takeout",
    status: "delivering",
  };

  assert.deepEqual(
    buildOrderPhoneAuditPayload(order, "shop", "138-0000-0000"),
    {
      targetRole: "merchant",
      targetId: "shop_9",
      targetPhone: "13800000000",
      entryPoint: "order_list",
      scene: "order_contact",
      orderId: "order_1",
      roomId: "shop_order_1",
      pagePath: "/pages/order/list/index",
      metadata: {
        bizType: "takeout",
        status: "delivering",
        shopId: "shop_9",
        riderId: "rider_7",
        contactType: "shop",
      },
    },
  );
  assert.equal(
    buildOrderPhoneAuditPayload(order, "rider", "13811112222", {
      entryPoint: "order_detail",
      pagePath: "/pages/order/detail/index",
    }).targetRole,
    "rider",
  );
});

test("order contact helpers build rtc and chat contexts consistently", () => {
  const order = {
    id: "order_2",
    shopId: "shop_5",
    shopName: "测试商家",
    shopLogo: "/shop.png",
    riderId: "rider_2",
    riderPhone: "13812345678",
    deliveryInfo: {
      rider: "小王 13812345678",
      contact: "13900001111",
    },
  };

  assert.equal(riderNameFromOrder(order), "小王");
  assert.deepEqual(buildOrderRTCContext(order, "rider"), {
    targetRole: "rider",
    targetId: "rider_2",
    targetName: "小王",
    targetPhone: "13812345678",
    conversationId: "rider_order_2",
    orderId: "order_2",
  });
  assert.deepEqual(buildOrderChatContext(order, "shop"), {
    roomId: "shop_order_2",
    name: "测试商家",
    role: "shop",
    avatar: "/shop.png",
    targetId: "shop_5",
    orderId: "order_2",
  });
});
