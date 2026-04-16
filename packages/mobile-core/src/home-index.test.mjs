import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHomeCategoryNavigation,
  buildHomeFeedCollections,
  buildHomeLocationDisplay,
  buildHomeLocationErrorCopy,
  normalizeHomeSelectedAddress,
  normalizeHomeWeatherRefreshMinutes,
  shouldRefreshHomeWeather,
} from "./home-index.js";

test("home index helpers normalize address and weather refresh values", () => {
  assert.equal(normalizeHomeSelectedAddress("  浦东新区 "), "浦东新区");
  assert.equal(
    normalizeHomeSelectedAddress({ detail: " 徐汇区漕河泾 " }),
    "徐汇区漕河泾",
  );
  assert.equal(normalizeHomeWeatherRefreshMinutes("25.9"), 25);
  assert.equal(normalizeHomeWeatherRefreshMinutes("bad", 12), 12);
  assert.equal(shouldRefreshHomeWeather(0, 10, 1000), true);
  assert.equal(shouldRefreshHomeWeather(1_000, 10, 2_000), false);
  assert.equal(shouldRefreshHomeWeather(1_000, 10, 1_000 + 10 * 60 * 1000), true);
});

test("home index helpers build location display and fallback messages", () => {
  assert.equal(
    buildHomeLocationDisplay({ address: "上海市静安区" }),
    "上海市静安区",
  );
  assert.equal(
    buildHomeLocationDisplay({ latitude: 31.2304, longitude: 121.4737 }),
    "31.230400,121.473700",
  );
  assert.equal(buildHomeLocationErrorCopy({ errMsg: "permission denied" }), "定位权限异常，请手动选址");
  assert.equal(buildHomeLocationErrorCopy({ message: "network error" }), "定位失败，请手动选址");
});

test("home index helpers resolve navigation and feed collections safely", () => {
  assert.deepEqual(
    buildHomeCategoryNavigation({ routeType: "feature", routeValue: "charity", name: "公益" }),
    { type: "navigate", url: "/pages/charity/index" },
  );
  assert.deepEqual(
    buildHomeCategoryNavigation({ routeType: "external", routeValue: "https://example.com", label: "官网" }),
    { type: "external", url: "https://example.com/" },
  );
  assert.deepEqual(
    buildHomeCategoryNavigation({ routeType: "external", routeValue: "javascript:alert(1)", label: "危险链接" }),
    {
      type: "navigate",
      url: "/pages/category/index/index?category=%E5%8D%B1%E9%99%A9%E9%93%BE%E6%8E%A5",
    },
  );
  assert.deepEqual(
    buildHomeCategoryNavigation({}),
    { type: "error", message: "分类信息错误" },
  );
  assert.deepEqual(
    buildHomeFeedCollections(
      {
        shops: [{ id: 1 }],
        products: [{ id: 2 }],
      },
      {
        normalizeShopProjection: (item) => ({ ...item, normalized: true }),
        normalizeFeaturedProductProjection: (item) => ({ ...item, featured: true }),
      },
    ),
    {
      shops: [{ id: 1, normalized: true }],
      featuredProducts: [{ id: 2, featured: true }],
    },
  );
});
