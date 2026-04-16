import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminOrderDetail,
  canAdminOrderQuickDispatch,
  extractAdminOrderPage,
  formatAdminOrderTime,
  getAdminOrderStatusTagType,
  getAdminOrderStatusText,
  getAdminOrderTypeIcon,
  getAdminOrderTypeText,
  normalizeAdminOrderBizType,
} from "./order-resources.js";

test("order resources unwrap admin order pages and preserve biz type semantics", () => {
  assert.deepEqual(
    extractAdminOrderPage({
      data: {
        orders: [{ id: 1 }, { id: 2 }],
        total: 2,
      },
    }),
    {
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 0,
      limit: 0,
    },
  );

  assert.equal(normalizeAdminOrderBizType({ biz_type: " groupbuy " }), "groupbuy");
  assert.equal(normalizeAdminOrderBizType({ bizType: "takeout" }), "takeout");
});

test("order resources keep dispatch and status semantics stable", () => {
  assert.equal(
    canAdminOrderQuickDispatch({ status: "pending", rider_id: "", rider_name: "", rider_phone: "" }),
    true,
  );
  assert.equal(
    canAdminOrderQuickDispatch({ status: "pending", biz_type: "groupbuy" }),
    false,
  );

  assert.equal(
    getAdminOrderStatusText("paid_unused", { biz_type: "groupbuy" }),
    "待核销",
  );
  assert.equal(
    getAdminOrderStatusText("accepted", { service_type: "massage" }),
    "待上门",
  );
  assert.equal(getAdminOrderStatusText("completed", {}), "已完成");
  assert.equal(getAdminOrderStatusTagType("pending_payment"), "warning");
  assert.equal(getAdminOrderStatusTagType("completed"), "success");
});

test("order resources normalize order type, time and detail payloads", () => {
  assert.equal(getAdminOrderTypeText({ food_request: "炒饭" }), "餐食服务");
  assert.equal(getAdminOrderTypeText({ bizType: "groupbuy" }), "团购");
  assert.equal(getAdminOrderTypeIcon({ delivery_request: "文件" }), "📮");
  assert.equal(getAdminOrderTypeIcon({ errand_request: "{}" }), "🚴");
  assert.equal(formatAdminOrderTime(""), "-");
  assert.equal(formatAdminOrderTime("not-a-date"), "not-a-date");

  assert.deepEqual(
    buildAdminOrderDetail({
      id: 8,
      preferred_time: "今天",
      errand_request: JSON.stringify({
        service_type: "phone_film",
        service_description: "钢化膜",
        package_name: "旗舰套餐",
        package_price: 39,
        phone_model: "iPhone 16",
        special_notes: "提前联系",
      }),
    }),
    {
      id: 8,
      preferred_time: "今天",
      errand_request:
        "{\"service_type\":\"phone_film\",\"service_description\":\"钢化膜\",\"package_name\":\"旗舰套餐\",\"package_price\":39,\"phone_model\":\"iPhone 16\",\"special_notes\":\"提前联系\"}",
      service_type: "phone_film",
      service_description: "钢化膜",
      package_name: "旗舰套餐",
      package_price: 39,
      phone_model: "iPhone 16",
      special_notes: "提前联系",
    },
  );
});
