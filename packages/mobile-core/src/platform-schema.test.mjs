import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  getBusinessCategoryLabelByKey,
  getOrderStatusClass,
  getOrderStatusText,
  normalizeAfterSalesItem,
  normalizeBusinessCategoryKey,
  normalizeOrderListItem,
  normalizeOrderStatus,
  normalizeShopProjection,
  resolveMerchantTypeOption,
} from "./platform-schema.js";

test("platform schema resolves merchant and category options from runtime taxonomy", () => {
  const taxonomy = {
    merchant_types: [
      { key: "takeout", label: "外卖" },
      { key: "hybrid", label: "混营", aliases: ["混营店"] },
    ],
    business_categories: [
      { key: "food", label: "美食" },
      { key: "life_services", label: "生活服务", aliases: ["家政"] },
    ],
  };

  const merchantOptions = buildMerchantTypeOptions(taxonomy);
  const categoryOptions = buildBusinessCategoryOptions(taxonomy);

  assert.equal(merchantOptions[1].orderTypeLabel, "混营类");
  assert.equal(resolveMerchantTypeOption("混营店", taxonomy).key, "hybrid");
  assert.equal(categoryOptions[1].key, "life_services");
  assert.equal(normalizeBusinessCategoryKey("家政", taxonomy), "life_services");
  assert.equal(getBusinessCategoryLabelByKey("life_services", taxonomy), "生活服务");
});

test("platform schema normalizes takeout, groupbuy, and after-sales statuses", () => {
  assert.equal(normalizeOrderStatus("待支付", "takeout"), "priced");
  assert.equal(normalizeOrderStatus("退款中", "groupbuy"), "refunding");
  assert.equal(getOrderStatusText("退款中", "groupbuy"), "退款中");
  assert.equal(getOrderStatusClass("已拒绝", "takeout", { afterSales: true }), "status-cancelled");
});

test("platform schema normalizes order and shop projections safely", () => {
  const order = normalizeOrderListItem({
    id: "order_1",
    shop_name: "测试门店",
    status: "配送中",
    biz_type: "takeout",
    total_price: "32.5",
    items: JSON.stringify([{ image: "a.jpg" }, { img: "b.jpg" }]),
  });
  const shop = normalizeShopProjection({
    shop_id: "shop_1",
    shop_name: "门店A",
    order_type: "团购类",
    business_category: "休闲玩乐",
  });
  const afterSales = normalizeAfterSalesItem({
    id: "as_1",
    request_no: "R-100",
    status: "处理中",
  });

  assert.equal(order.status, "delivering");
  assert.equal(order.price, 32.5);
  assert.deepEqual(order.imageUrls, ["a.jpg", "b.jpg"]);
  assert.equal(shop.merchantType, "groupbuy");
  assert.equal(shop.businessCategory, "休闲娱乐");
  assert.equal(afterSales.status, "processing");
  assert.equal(afterSales.shopName, "售后申请 R-100");
});
