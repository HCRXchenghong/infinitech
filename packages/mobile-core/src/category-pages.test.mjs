import test from "node:test";
import assert from "node:assert/strict";

import {
  createCategoryPage,
  createDefaultCategoryPageConfig,
  createCategoryPageFilters,
  matchesCategoryPageShop,
  normalizeCategoryPageConfig,
  normalizeCategoryPageShopCollection,
  sortCategoryPageShops,
} from "./category-pages.js";

test("category page helpers normalize config and filter definitions deterministically", () => {
  assert.deepEqual(createCategoryPageFilters(), [
    { key: "default", label: "综合排序" },
    { key: "sales", label: "销量最高", sortable: true },
    { key: "rating", label: "评分最高", sortable: true },
    { key: "distance", label: "距离最近", sortable: true },
  ]);

  assert.deepEqual(createDefaultCategoryPageConfig(), {
    title: "全部分类",
    keywords: [],
    matchAll: true,
    queryKey: "category",
    fallbackTitle: "全部分类",
  });

  assert.deepEqual(
    normalizeCategoryPageConfig(
      {
        title: "超市便利",
        keywords: ["超市", "便利", "超市便利"],
      },
      {},
    ),
    {
      title: "超市便利",
      keywords: ["超市", "便利", "超市便利"],
      matchAll: false,
      queryKey: "category",
      fallbackTitle: "全部分类",
    },
  );

  assert.deepEqual(
    normalizeCategoryPageConfig({}, { category: "%E5%9B%A2%E8%B4%AD" }),
    {
      title: "团购",
      keywords: ["团购"],
      matchAll: false,
      queryKey: "category",
      fallbackTitle: "全部分类",
    },
  );
});

test("category page helpers match shops and sort collections consistently", () => {
  const dessertConfig = normalizeCategoryPageConfig({
    title: "甜点饮品",
    keywords: ["甜点", "饮品", "甜点饮品"],
  });

  assert.equal(
    matchesCategoryPageShop(
      {
        category: "甜点店",
        tags: ["下午茶"],
      },
      dessertConfig,
    ),
    true,
  );
  assert.equal(
    matchesCategoryPageShop(
      {
        businessCategory: "商超",
        tags: ["水果"],
      },
      dessertConfig,
    ),
    false,
  );

  const shops = [
    { id: 1, monthlySales: 10, rating: 4.1, distance: "2.8" },
    { id: 2, monthlySales: 30, rating: 4.9, distance: "0.8" },
    { id: 3, monthlySales: 20, rating: 4.6, distance: "1.5" },
  ];

  assert.deepEqual(
    sortCategoryPageShops(shops, "sales").map((shop) => shop.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    sortCategoryPageShops(shops, "rating").map((shop) => shop.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    sortCategoryPageShops(shops, "distance").map((shop) => shop.id),
    [2, 3, 1],
  );

  assert.deepEqual(normalizeCategoryPageShopCollection({ data: shops }), shops);
  assert.deepEqual(normalizeCategoryPageShopCollection({ list: shops }), shops);
});

test("category page factory loads shops, applies category config, and proxies navigation", async () => {
  const navigations = [];
  const page = createCategoryPage({
    async fetchShops() {
      return {
        data: [
          {
            id: 1,
            category: "超市便利",
            monthlySales: 10,
            rating: 4.2,
            distance: "2.2",
          },
          {
            id: 2,
            tags: ["便利店"],
            monthlySales: 30,
            rating: 4.8,
            distance: "0.6",
          },
          {
            id: 3,
            tags: ["水果"],
            monthlySales: 20,
            rating: 4.6,
            distance: "1.2",
          },
        ],
      };
    },
    resolveCategoryConfig(query) {
      return {
        title: query.category || "超市便利",
        keywords: ["超市", "便利", "超市便利"],
      };
    },
    uniApp: {
      navigateTo(payload) {
        navigations.push(payload);
      },
    },
  });

  const instance = {
    ...page.data(),
    ...page.methods,
  };

  await page.onLoad.call(instance, { category: "超市便利" });
  instance.setFilter("sales");

  assert.equal(page.computed.pageTitle.call(instance), "超市便利");
  assert.equal(instance.categoryConfig.title, "超市便利");
  assert.deepEqual(
    page.computed.filteredShops.call(instance).map((shop) => shop.id),
    [2, 1],
  );

  instance.goSearch();
  instance.goShopDetail(99);
  assert.deepEqual(navigations, [
    { url: "/pages/search/index/index" },
    { url: "/pages/shop/detail/index?id=99" },
  ]);
});
