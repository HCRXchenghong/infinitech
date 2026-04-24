import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderHistoryOrdersPageLogic,
  extractRiderHistoryOrderList,
  formatRiderHistoryPrice,
  formatRiderHistoryTime,
  getRiderHistoryStatusText,
  mergeRiderHistoryOrders,
  normalizeRiderHistoryOrder,
} from "./rider-history-orders-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider history helpers extract lists, prices and normalized orders", () => {
  assert.deepEqual(extractRiderHistoryOrderList({ data: { orders: [{ id: 1 }] } }), [{ id: 1 }]);
  assert.equal(formatRiderHistoryTime("2026-04-23 09:05:00"), "04-23 09:05");
  assert.equal(formatRiderHistoryPrice({ rider_income: 1234 }), "12.34");
  assert.equal(formatRiderHistoryPrice({ delivery_fee: 18.6 }), "18.60");
  assert.equal(getRiderHistoryStatusText("cancelled"), "已取消");

  const order = normalizeRiderHistoryOrder({
    id: "order-1",
    status: "completed",
    daily_order_id: "D20260423001",
    shop_name: "商家A",
    address: "测试路 99 号",
    completed_at: "2026-04-23 10:30:00",
    rider_income: 1888,
    customer_name: "张三",
    customer_phone: "13812345678",
  });

  assert.deepEqual(order, {
    id: "order-1",
    orderNo: "D20260423001",
    orderNum: "D20260423001",
    status: "completed",
    shopName: "商家A",
    customerAddress: "测试路 99 号",
    createTime: "04-23 10:30",
    createdAt: "04-23 10:30",
    sortAt: new Date("2026-04-23 10:30:00").getTime(),
    customerName: "张三",
    customerPhone: "13812345678",
    customer_phone: "13812345678",
    address: "测试路 99 号",
    statusText: "已完成",
    amount: "18.88",
    price: "18.88",
  });
});

test("rider history helpers merge by id and sort descending", () => {
  const merged = mergeRiderHistoryOrders([
    { id: "2", sortAt: 10 },
    { id: "1", sortAt: 20 },
    { id: "2", sortAt: 30, shopName: "最新商家" },
  ]);

  assert.deepEqual(merged, [
    { id: "2", sortAt: 30, shopName: "最新商家" },
    { id: "1", sortAt: 20 },
  ]);
});

test("rider history page logic preserves injected page components", () => {
  const componentRegistry = {
    OrderDetailPopup: { name: "OrderDetailPopup" },
  };

  const component = createRiderHistoryOrdersPageLogic({
    components: componentRegistry,
  });

  assert.equal(component.components, componentRegistry);
});

test("rider history page loads completed and cancelled orders and opens popup", async () => {
  const stopCalls = [];
  const component = createRiderHistoryOrdersPageLogic({
    fetchRiderOrders(status) {
      if (status === "completed") {
        return Promise.resolve({
          data: {
            orders: [
              {
                id: "completed-1",
                status: "completed",
                shop_name: "商家完成单",
                address: "完成地址",
                completed_at: "2026-04-23 11:00:00",
                rider_income: 1500,
              },
            ],
          },
        });
      }
      return Promise.resolve([
        {
          id: "cancelled-1",
          status: "cancelled",
          merchantName: "商家取消单",
          customerAddress: "取消地址",
          updated_at: "2026-04-22 09:00:00",
          total_price: 23.5,
        },
      ]);
    },
    readRiderAuthIdentity() {
      return { riderId: "rider-1" };
    },
    uniApp: {
      stopPullDownRefresh() {
        stopCalls.push("stop");
      },
      showToast() {},
    },
  });
  const page = instantiatePage(component);

  await page.loadHistoryOrders(true);
  assert.equal(page.orders.length, 2);
  assert.equal(page.orders[0].id, "completed-1");
  assert.equal(page.orders[1].id, "cancelled-1");

  page.openOrderDetail(page.orders[0]);
  assert.equal(page.showOrderDetailPopup, true);
  assert.equal(page.currentOrderDetail.id, "completed-1");
  assert.deepEqual(stopCalls, ["stop"]);
});

test("rider history page resets when auth missing and surfaces load failures", async () => {
  const toasts = [];
  let stopCount = 0;
  const failedComponent = createRiderHistoryOrdersPageLogic({
    fetchRiderOrders() {
      throw new Error("boom");
    },
    readRiderAuthIdentity() {
      return { riderId: "" };
    },
    uniApp: {
      stopPullDownRefresh() {
        stopCount += 1;
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const missingAuthPage = instantiatePage(failedComponent);
  await missingAuthPage.loadHistoryOrders(true);
  assert.deepEqual(missingAuthPage.orders, []);
  assert.equal(stopCount, 1);

  const errorComponent = createRiderHistoryOrdersPageLogic({
    fetchRiderOrders() {
      return Promise.reject(new Error("boom"));
    },
    readRiderAuthIdentity() {
      return { riderId: "rider-2" };
    },
    uniApp: {
      stopPullDownRefresh() {
        stopCount += 1;
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const errorPage = instantiatePage(errorComponent);
  const originalConsoleError = console.error;
  try {
    console.error = () => {};
    await errorPage.loadHistoryOrders();
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(errorPage.orders, []);
  assert.deepEqual(toasts, [{ title: "历史订单加载失败", icon: "none" }]);
});
