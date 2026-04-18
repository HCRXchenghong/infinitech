import test from "node:test";
import assert from "node:assert/strict";

import {
  createProductDetailPage,
  createProductPopupDetailPage,
  createShopListPage,
  normalizeConsumerProductDetailPayload,
  normalizeConsumerShopList,
  readConsumerProductCartCount,
  writeConsumerProductCartCount,
} from "./product-pages.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("product page helpers normalize product payloads and shop collections", () => {
  assert.deepEqual(
    normalizeConsumerProductDetailPayload(
      {
        id: " sku_1 ",
        price: "18.6",
        originalPrice: "25",
        name: " 招牌饭 ",
        images: '["https://cdn.example.com/product.png"]',
        nutrition: '{"calories":420,"protein":18}',
        rating: "4.8",
        monthlySales: "66",
        description: " 现做现卖 ",
        shopName: " 测试店铺 ",
      },
      { shopId: " shop_9 " },
    ),
    {
      id: "sku_1",
      price: 18.6,
      originalPrice: 25,
      name: "招牌饭",
      image: "https://cdn.example.com/product.png",
      shopId: "shop_9",
      shopName: "测试店铺",
      sales: 66,
      likeRate: 96,
      nutrition: {
        calories: 420,
        protein: 18,
      },
      detail: "现做现卖",
      tag: "",
      images: '["https://cdn.example.com/product.png"]',
      rating: "4.8",
      monthlySales: "66",
      description: " 现做现卖 ",
    },
  );

  assert.deepEqual(normalizeConsumerShopList({ data: [{ id: 8, rating: "4.7" }] }), [
    {
      id: "8",
      rating: 4.7,
      name: "",
      monthlySales: 0,
      minPrice: 0,
      deliveryPrice: 0,
    },
  ]);
});

test("product page cart helpers persist per shop and emit updates", () => {
  const storage = {};
  const events = [];
  const uniApp = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    $emit(name, payload) {
      events.push({ name, payload });
    },
  };

  writeConsumerProductCartCount(uniApp, "shop_1", "sku_1", 2);
  assert.equal(readConsumerProductCartCount(uniApp, "shop_1", "sku_1"), 2);

  writeConsumerProductCartCount(uniApp, "shop_1", "sku_1", 0);
  assert.equal(readConsumerProductCartCount(uniApp, "shop_1", "sku_1"), 0);
  assert.deepEqual(events, [
    { name: "cartUpdated", payload: { shopId: "shop_1" } },
    { name: "cartUpdated", payload: { shopId: "shop_1" } },
  ]);
});

test("product detail page loads shared payload and redirects to shop menu after add cart", async () => {
  const redirects = [];
  const storage = {};
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      getStorageSync(key) {
        return storage[key];
      },
      setStorageSync(key, value) {
        storage[key] = value;
      },
      $emit() {},
      redirectTo(payload) {
        redirects.push(payload);
      },
      showLoading() {},
      hideLoading() {},
      showToast() {},
    };

    const component = createProductDetailPage({
      fetchProductDetail: async () => ({
        id: "sku_8",
        price: "12.5",
        shopId: "shop_8",
      }),
    });
    const page = instantiatePage(component);

    await component.onLoad.call(page, { id: "sku_8", shopId: "shop_8" });
    page.addToCart();

    assert.equal(page.product.price, 12.5);
    assert.deepEqual(JSON.parse(storage.cart_shop_8), { sku_8: 1 });
    assert.deepEqual(redirects, [
      {
        url: "/pages/shop/menu/index?id=shop_8",
      },
    ]);
  } finally {
    globalThis.uni = previousUni;
  }
});

test("product popup page blocks cart changes until consumer login", () => {
  const navigation = [];
  const toasts = [];
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      getStorageSync(key) {
        if (key === "authMode") {
          return "guest";
        }
        return "";
      },
      navigateTo(payload) {
        navigation.push(payload);
      },
      showToast(payload) {
        toasts.push(payload);
      },
    };

    const component = createProductPopupDetailPage();
    const page = instantiatePage(component);
    page.shopId = "shop_5";
    page.productId = "sku_5";

    page.handlePlus();

    assert.equal(page.count, 0);
    assert.deepEqual(toasts, [{ title: "请先登录后下单", icon: "none" }]);
    assert.deepEqual(navigation, [{ url: "/pages/auth/login/index" }]);
  } finally {
    globalThis.uni = previousUni;
  }
});

test("shop list page loads normalized shops and navigates to detail", async () => {
  const navigation = [];
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      navigateTo(payload) {
        navigation.push(payload);
      },
      showToast() {},
    };

    const component = createShopListPage({
      fetchShops: async () => ({
        items: [
          {
            id: "shop_2",
            name: " 星选门店 ",
            rating: "4.9",
            monthlySales: "88",
            minPrice: "20",
            deliveryPrice: "3",
          },
        ],
      }),
    });
    const page = instantiatePage(component);

    await page.loadShops();
    page.goDetail("shop_2");

    assert.deepEqual(page.shops, [
      {
        id: "shop_2",
        name: "星选门店",
        rating: 4.9,
        monthlySales: 88,
        minPrice: 20,
        deliveryPrice: 3,
      },
    ]);
    assert.deepEqual(navigation, [
      {
        url: "/pages/shop/detail/index?id=shop_2",
      },
    ]);
  } finally {
    globalThis.uni = previousUni;
  }
});
