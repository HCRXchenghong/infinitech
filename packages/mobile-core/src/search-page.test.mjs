import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSearchHistory,
  createDefaultHotSearchKeywords,
  DEFAULT_HOT_SEARCH_KEYWORDS,
  filterSearchShopsByKeyword,
  formatSearchShopDistance,
  formatSearchShopRating,
  formatSearchShopSales,
  getSearchShopInitial,
  normalizeSearchHistory,
  normalizeSearchShopList,
  normalizeSearchShopTags,
  SEARCH_HISTORY_KEY,
  trimSearchValue,
} from "./search-page.js";

test("search page helpers expose stable defaults", () => {
  assert.equal(SEARCH_HISTORY_KEY, "searchHistory");
  assert.equal(trimSearchValue(" 奶茶 "), "奶茶");
  assert.deepEqual(DEFAULT_HOT_SEARCH_KEYWORDS.slice(0, 3), ["奶茶", "汉堡", "火锅"]);
  assert.deepEqual(createDefaultHotSearchKeywords(), DEFAULT_HOT_SEARCH_KEYWORDS);
  assert.notEqual(createDefaultHotSearchKeywords(), DEFAULT_HOT_SEARCH_KEYWORDS);
});

test("search page helpers normalize history and shop collections", () => {
  assert.deepEqual(
    normalizeSearchHistory([" 奶茶 ", "", "火锅", "奶茶", "水果"], 3),
    ["奶茶", "火锅", "水果"],
  );
  assert.deepEqual(buildSearchHistory(" 咖啡 ", ["奶茶", "咖啡", "火锅"], 3), [
    "咖啡",
    "奶茶",
    "火锅",
  ]);
  assert.deepEqual(
    normalizeSearchShopList({ data: [{ id: "shop-1" }] }),
    [{ id: "shop-1" }],
  );
  assert.deepEqual(
    normalizeSearchShopList({ shops: [{ id: "shop-2" }] }),
    [{ id: "shop-2" }],
  );
  assert.deepEqual(
    normalizeSearchShopTags({ tags: " 奶茶、 甜品, 深夜 " }),
    ["奶茶", "甜品", "深夜"],
  );
});

test("search page helpers keep filtering and presentation stable", () => {
  assert.deepEqual(
    filterSearchShopsByKeyword(
      [
        {
          id: "shop-1",
          name: "深夜奶茶屋",
          category: "饮品",
          description: "招牌杨枝甘露",
          tags: ["甜品", "夜宵"],
        },
        {
          id: "shop-2",
          name: "早餐铺",
          category: "小吃",
          description: "豆浆油条",
          tags: "早餐, 粥",
        },
      ],
      " 奶茶 ",
    ).map((item) => item.id),
    ["shop-1"],
  );
  assert.equal(getSearchShopInitial("悦享餐厅"), "悦享");
  assert.equal(getSearchShopInitial(""), "店铺");
  assert.equal(formatSearchShopRating(4.36), "评分 4.4");
  assert.equal(formatSearchShopRating(0), "暂无评分");
  assert.equal(formatSearchShopSales(88), "月售 88");
  assert.equal(formatSearchShopSales(-1), "暂无销量");
  assert.equal(formatSearchShopDistance(" 1.2km "), "1.2km");
  assert.equal(formatSearchShopDistance(" "), "距离未知");
});
