import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCartPopupItems,
  createCartPopupPage,
  normalizeCartPopupCartMap,
} from "./cart-popup-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("cart popup helpers normalize cart maps and build cart items deterministically", () => {
  assert.deepEqual(normalizeCartPopupCartMap('{"sku_1":2}'), { sku_1: 2 });
  assert.deepEqual(
    buildCartPopupItems(
      [
        { id: "sku_1", name: "米线", price: 12 },
        { id: "sku_2", name: "饮料", price: 4 },
      ],
      { sku_1: 2, sku_3: 1 },
    ),
    [{ id: "sku_1", name: "米线", price: 12, count: 2 }],
  );
});

test("cart popup page updates cart state, emits refresh, and clears confirmed carts", async () => {
  const storage = {
    authMode: "user",
    cart_shop_7: JSON.stringify({ sku_1: 1 }),
  };
  const events = [];
  const navigation = [];
  const previousUni = globalThis.uni;
  const previousSetTimeout = globalThis.setTimeout;

  try {
    globalThis.setTimeout = (handler) => {
      handler();
      return 0;
    };
    globalThis.uni = {
      getStorageSync(key) {
        return storage[key];
      },
      setStorageSync(key, value) {
        storage[key] = value;
      },
      $emit(name, payload) {
        events.push({ name, payload });
      },
      showModal({ success }) {
        success({ confirm: true });
      },
      navigateBack() {
        navigation.push({ back: true });
      },
      redirectTo(payload) {
        navigation.push(payload);
      },
    };

    const component = createCartPopupPage({
      fetchMenuItems: async () => [
        { id: "sku_1", name: "米线", price: 12 },
        { id: "sku_2", name: "饮料", price: 4 },
      ],
    });
    const page = instantiatePage(component);

    component.onLoad.call(page, { shopId: "shop_7" });
    await page.loadProducts();
    page.loadCart();
    page.handlePlus({ id: "sku_1" });
    page.handleMinus({ id: "sku_1" });
    page.handleClear();

    assert.deepEqual(page.cartItems, []);
    assert.equal(storage.cart_shop_7, "{}");
    assert.deepEqual(events, [
      { name: "cartUpdated", payload: { shopId: "shop_7" } },
      { name: "cartUpdated", payload: { shopId: "shop_7" } },
      { name: "cartUpdated", payload: { shopId: "shop_7" } },
    ]);
    assert.deepEqual(navigation, [{ back: true }]);
  } finally {
    globalThis.uni = previousUni;
    globalThis.setTimeout = previousSetTimeout;
  }
});
