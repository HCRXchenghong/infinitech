import test from "node:test";
import assert from "node:assert/strict";

import {
  createCartBarComponent,
  createCategorySidebarComponent,
  createEmptyStateComponent,
  createFilterBarComponent,
  createMenuItemComponent,
  createMenuNavComponent,
  createPageHeaderComponent,
  createShopCardComponent,
  createSuccessModalComponent,
  getConsumerCategoryCount,
} from "./consumer-shop-components.js";

test("consumer shop helpers keep category count and empty state defaults stable", () => {
  assert.equal(
    getConsumerCategoryCount(
      [
        { categoryId: "food", count: 2 },
        { categoryId: "food", count: 1 },
        { categoryId: "drink", count: 5 },
      ],
      "food",
    ),
    3,
  );

  const emptyState = createEmptyStateComponent();
  assert.equal(emptyState.props.icon.default, "📭");
  assert.equal(emptyState.props.text.default, "暂无内容");
});

test("consumer shop cart bar and filter bar expose stable emit semantics", () => {
  const events = [];
  const cartBar = createCartBarComponent({ name: "TestCartBar" });
  const filterBar = createFilterBarComponent();

  cartBar.methods.handleToggle.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  cartBar.methods.handleCheckout.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  filterBar.methods.handleFilter.call(
    {
      $emit(eventName, payload) {
        events.push(`${eventName}:${payload}`);
      },
    },
    "sales",
  );

  assert.equal(cartBar.name, "TestCartBar");
  assert.deepEqual(events, ["toggle", "checkout", "change:sales"]);
});

test("consumer category sidebar keeps badge counting and switch events stable", () => {
  const events = [];
  const sidebar = createCategorySidebarComponent();
  const instance = {
    cartItems: [
      { categoryId: "snack", count: 2 },
      { categoryId: "snack", count: 3 },
    ],
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload}`);
    },
  };

  assert.equal(sidebar.methods.getCategoryCount.call(instance, "snack"), 5);
  sidebar.methods.handleSwitch.call(instance, 2);
  assert.deepEqual(events, ["switch:2"]);
});

test("consumer menu and card components emit selected records consistently", () => {
  const events = [];
  const menuItem = createMenuItemComponent();
  const menuNav = createMenuNavComponent();
  const shopCard = createShopCardComponent();

  menuItem.methods.handleTap.call({
    item: { id: "sku-1" },
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload.id}`);
    },
  });
  menuItem.methods.handlePlus.call({
    item: { id: "sku-2" },
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload.id}`);
    },
  });
  menuItem.methods.handleMinus.call({
    item: { id: "sku-3" },
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload.id}`);
    },
  });
  menuNav.methods.handleBack.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  shopCard.methods.handleTap.call({
    shop: { id: "shop-1" },
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload}`);
    },
  });

  assert.deepEqual(events, [
    "tap:sku-1",
    "plus:sku-2",
    "minus:sku-3",
    "back",
    "shop-tap:shop-1",
  ]);
});

test("consumer page header emits actions and proxies navigateBack", () => {
  const events = [];
  const navigateCalls = [];
  const header = createPageHeaderComponent({
    uniApp: {
      navigateBack() {
        navigateCalls.push("navigateBack");
      },
    },
  });
  const instance = {
    $emit(eventName) {
      events.push(eventName);
    },
  };

  header.methods.handleBack.call(instance);
  header.methods.handleSearch.call(instance);

  assert.deepEqual(events, ["back", "search"]);
  assert.deepEqual(navigateCalls, ["navigateBack"]);
});

test("consumer success modal confirms and closes in one flow", () => {
  const events = [];
  const modal = createSuccessModalComponent();
  const instance = {
    $emit(eventName) {
      events.push(eventName);
    },
  };
  instance.handleClose = modal.methods.handleClose.bind(instance);

  modal.methods.handleConfirm.call(instance);

  assert.deepEqual(events, ["confirm", "close"]);
});
