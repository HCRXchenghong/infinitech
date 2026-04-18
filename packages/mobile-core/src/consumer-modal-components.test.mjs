import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerOrderDetailRows,
  createCartModalComponent,
  createContactModalComponent,
  createOrderDetailPopupComponent,
  createPhoneWarningModalComponent,
  formatConsumerCartPrice,
  resolveConsumerOrderDetailAmountText,
  resolveConsumerOrderDetailOrderNo,
  resolveConsumerOrderDetailShopName,
  resolveConsumerOrderDetailStatusText,
} from "./consumer-modal-components.js";

test("consumer modal helpers format cart and order detail values consistently", () => {
  assert.equal(formatConsumerCartPrice(10), "10");
  assert.equal(formatConsumerCartPrice("10.5"), "10.50");
  assert.equal(
    resolveConsumerOrderDetailOrderNo({ order_no: "ORD-001" }),
    "ORD-001",
  );
  assert.equal(
    resolveConsumerOrderDetailStatusText({ status: "delivering" }),
    "配送中",
  );
  assert.equal(
    resolveConsumerOrderDetailShopName({ shop_name: "无限城餐厅" }),
    "无限城餐厅",
  );
  assert.equal(
    resolveConsumerOrderDetailAmountText({ total_price: "32.5" }),
    "32.50",
  );
  assert.deepEqual(
    buildConsumerOrderDetailRows({
      order_no: "ORD-001",
      created_at: "2026-04-18 10:00",
      customer_name: "张三",
      customer_phone: "13800000000",
      address: "上海市浦东新区",
    }),
    [
      { label: "订单号", value: "ORD-001" },
      { label: "下单时间", value: "2026-04-18 10:00" },
      { label: "联系人", value: "张三" },
      { label: "联系电话", value: "13800000000" },
      { label: "收货地址", value: "上海市浦东新区" },
    ],
  );
});

test("consumer contact modal factory exposes stable emit semantics", () => {
  const events = [];
  const component = createContactModalComponent({
    name: "TestContactModal",
  });
  const instance = {
    $emit(eventName) {
      events.push(eventName);
    },
  };
  instance.handleClose = component.methods.handleClose.bind(instance);

  assert.equal(component.name, "TestContactModal");
  component.methods.handleRTCContact.call(instance);
  component.methods.handleOnlineContact.call(instance);
  component.methods.handlePhoneContact.call(instance);

  assert.deepEqual(events, [
    "rtc",
    "close",
    "online",
    "close",
    "phone",
    "close",
  ]);
});

test("consumer phone warning modal factory loads support runtime titles and emits confirmation", async () => {
  const events = [];
  const component = createPhoneWarningModalComponent({
    getCachedSupportRuntimeSettings() {
      return { title: "平台客服" };
    },
    async loadSupportRuntimeSettings() {
      return { title: "专属客服" };
    },
  });
  const instance = {
    supportTitle: component.data().supportTitle,
    $emit(eventName) {
      events.push(eventName);
    },
  };
  instance.handleClose = component.methods.handleClose.bind(instance);

  assert.equal(instance.supportTitle, "平台客服");
  await component.methods.loadSupportRuntimeConfig.call(instance);
  component.methods.handleConfirm.call(instance);

  assert.equal(instance.supportTitle, "专属客服");
  assert.deepEqual(events, ["confirm", "close"]);
});

test("consumer cart modal factory confirms clear and closes after checkout", () => {
  const events = [];
  const modalCalls = [];
  const component = createCartModalComponent({
    uniApp: {
      showModal(payload) {
        modalCalls.push(payload.title);
        payload.success({ confirm: true });
      },
    },
  });
  const instance = {
    $emit(eventName, payload) {
      events.push(payload ? `${eventName}:${payload.id}` : eventName);
    },
  };
  instance.handleClose = component.methods.handleClose.bind(instance);

  component.methods.handlePlus.call(instance, { id: "sku-1" });
  component.methods.handleMinus.call(instance, { id: "sku-2" });
  component.methods.handleClear.call(instance);
  component.methods.handleCheckout.call(instance);

  assert.equal(component.methods.formatPrice(18.8), "18.80");
  assert.deepEqual(modalCalls, ["确认清空"]);
  assert.deepEqual(events, [
    "plus:sku-1",
    "minus:sku-2",
    "clear",
    "checkout",
    "close",
  ]);
});

test("consumer order detail popup factory keeps computed fields stable", () => {
  const component = createOrderDetailPopupComponent();
  const instance = {
    order: {
      order_no: "ORD-002",
      status: "completed",
      shop_name: "无限城咖啡",
      total_price: "45.2",
      created_at: "2026-04-18 11:00",
      customer_name: "李四",
      customer_phone: "13900000000",
      address: "上海市徐汇区",
    },
    $emit() {},
  };

  instance.safeOrder = component.computed.safeOrder.call(instance);
  instance.orderNo = component.computed.orderNo.call(instance);
  instance.statusText = component.computed.statusText.call(instance);
  instance.shopName = component.computed.shopName.call(instance);
  instance.amountText = component.computed.amountText.call(instance);
  instance.detailRows = component.computed.detailRows.call(instance);

  assert.equal(instance.orderNo, "ORD-002");
  assert.equal(instance.statusText, "已完成");
  assert.equal(instance.shopName, "无限城咖啡");
  assert.equal(instance.amountText, "45.20");
  assert.equal(instance.detailRows[4].value, "上海市徐汇区");
});
