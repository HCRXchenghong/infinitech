import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileFavoriteShopPath,
  buildConsumerProfileFavoritesQuery,
  createProfileFavoritesPage,
  extractConsumerProfileFavoritesPage,
  formatConsumerProfileFavoriteMoney,
  formatConsumerProfileFavoriteRating,
  normalizeConsumerProfileFavoritesErrorMessage,
  normalizeConsumerProfileFavoriteItem,
  resolveConsumerProfileFavoritesUserId,
} from "./profile-favorites.js";

test("profile favorites helpers normalize identity and queries", () => {
  assert.equal(
    resolveConsumerProfileFavoritesUserId({ userId: "user-1" }),
    "user-1",
  );
  assert.deepEqual(buildConsumerProfileFavoritesQuery("2", "30"), {
    page: 2,
    pageSize: 30,
  });
  assert.equal(
    buildConsumerProfileFavoriteShopPath("shop 1"),
    "/pages/shop/detail/index?id=shop%201",
  );
});

test("profile favorites helpers normalize pages and presentation", () => {
  assert.deepEqual(
    normalizeConsumerProfileFavoriteItem(
      {
        id: "shop-1",
        name: "",
        rating: "4.5",
        minPrice: "20",
        deliveryPrice: "3",
      },
      0,
      2,
    ),
    {
      id: "shop-1",
      name: "未知商家",
      favoriteId: "shop-1",
      rating: 4.5,
      minPrice: 20,
      deliveryPrice: 3,
      monthlySales: 0,
      logo: "",
      coverImage: "",
    },
  );
  assert.deepEqual(
    extractConsumerProfileFavoritesPage(
      {
        data: {
          list: [{ id: "shop-2", name: "店铺 2" }],
          total: 8,
        },
      },
      3,
    ),
    {
      list: [
        {
          id: "shop-2",
          name: "店铺 2",
          favoriteId: "shop-2",
          rating: 0,
          monthlySales: 0,
          minPrice: 0,
          deliveryPrice: 0,
          logo: "",
          coverImage: "",
        },
      ],
      total: 8,
    },
  );
  assert.equal(formatConsumerProfileFavoriteRating("4.28"), "4.3");
  assert.equal(formatConsumerProfileFavoriteMoney("12"), "12.0");
});

test("profile favorites helpers normalize errors", () => {
  assert.equal(
    normalizeConsumerProfileFavoritesErrorMessage(
      { response: { data: { error: "读取失败" } } },
      "fallback",
    ),
    "读取失败",
  );
});

test("profile favorites page loads and removes favorites through shared logic", async () => {
  const navigation = [];
  const deleteCalls = [];
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync() {
      return {};
    },
    showToast() {},
    navigateTo({ url }) {
      navigation.push(url);
    },
  };

  try {
    const page = createProfileFavoritesPage({
      fetchUserFavorites: async () => ({
        data: {
          list: [{ id: "shop-1", name: "店铺 1", rating: 4.5 }],
          total: 1,
        },
      }),
      deleteUserFavorite: async (userId, shopId) => {
        deleteCalls.push({ userId, shopId });
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      userId: "user-1",
    };

    await instance.loadFavorites(true);
    instance.goShop("shop-1");
    await instance.removeFavorite({ id: "shop-1" });

    assert.equal(instance.items.length, 0);
    assert.equal(instance.total, 0);
    assert.deepEqual(deleteCalls, [{ userId: "user-1", shopId: "shop-1" }]);
    assert.deepEqual(navigation, ["/pages/shop/detail/index?id=shop-1"]);
  } finally {
    globalThis.uni = originalUni;
  }
});
