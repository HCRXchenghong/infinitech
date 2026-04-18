import test from "node:test";
import assert from "node:assert/strict";

import {
  createFeaturedPage,
  normalizeFeaturedPageFeed,
} from "./featured-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("featured page helpers normalize feed projections deterministically", () => {
  assert.deepEqual(
    normalizeFeaturedPageFeed(
      {
        products: [{ id: 1 }, { id: 2 }],
        shops: [{ id: 3 }],
      },
      {
        normalizeFeaturedProductProjection(item) {
          return { ...item, kind: "product" };
        },
        normalizeShopProjection(item) {
          return { ...item, kind: "shop" };
        },
      },
    ),
    {
      products: [
        { id: 1, kind: "product" },
        { id: 2, kind: "product" },
      ],
      shops: [{ id: 3, kind: "shop" }],
    },
  );
});

test("featured page loads shared feed and routes to product and shop detail", async () => {
  const navigation = [];
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      navigateTo(payload) {
        navigation.push(payload);
      },
      showToast() {},
    };

    const component = createFeaturedPage({
      fetchHomeFeed: async () => ({
        products: [{ id: "sku_1", shopId: "shop_1", name: "招牌套餐" }],
        shops: [{ id: "shop_1", name: "测试门店" }],
      }),
      normalizeFeaturedProductProjection(item) {
        return { ...item, projected: true };
      },
      normalizeShopProjection(item) {
        return { ...item, projected: true };
      },
      HomeShopCard: {},
    });
    const page = instantiatePage(component);

    await page.loadHomeFeed();
    page.goProductDetail(page.products[0]);
    page.goShopDetail("shop_1");

    assert.deepEqual(page.products, [
      {
        id: "sku_1",
        shopId: "shop_1",
        name: "招牌套餐",
        projected: true,
      },
    ]);
    assert.deepEqual(page.shops, [
      {
        id: "shop_1",
        name: "测试门店",
        projected: true,
      },
    ]);
    assert.deepEqual(navigation, [
      {
        url: "/pages/product/detail/index?id=sku_1&shopId=shop_1",
      },
      {
        url: "/pages/shop/detail/index?id=shop_1",
      },
    ]);
  } finally {
    globalThis.uni = previousUni;
  }
});
