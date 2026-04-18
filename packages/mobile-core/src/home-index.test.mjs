import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHomeCategoryNavigation,
  buildHomeFeedCollections,
  buildHomeLocationDisplay,
  buildHomeLocationErrorCopy,
  createHomeIndexPage,
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

test("home index page loads categories, feed and weather through shared runtime", async () => {
  const navigation = [];
  const originalUni = globalThis.uni;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};
  globalThis.uni = {
    getStorageSync(key) {
      if (key === "selectedAddress") {
        return "上海市黄浦区";
      }
      return null;
    },
    setStorageSync() {},
    showToast() {},
    navigateTo({ url }) {
      navigation.push(url);
    },
    setClipboardData({ data, success }) {
      navigation.push(`clipboard:${data}`);
      success?.();
    },
    $off() {},
    $on() {},
  };

  try {
    const page = createHomeIndexPage({
      clientId: "consumer",
      fetchWeather: async () => ({
        temp: 20,
        condition: "晴",
        refreshIntervalMinutes: 15,
      }),
      fetchHomeFeed: async () => ({
        shops: [{ id: "shop-1" }],
        products: [{ id: "product-1" }],
      }),
      getCurrentLocation: async () => ({
        address: "上海市静安区",
        latitude: 31.2,
        longitude: 121.4,
      }),
      normalizeShopProjection: (item) => ({ ...item, normalized: true }),
      normalizeFeaturedProductProjection: (item) => ({ ...item, featured: true }),
      buildHomeCategories: (items = []) => items.length ? items : [{ label: "美食" }],
      buildHomeCategoriesForClient: () => [{ label: "团购" }],
      loadPlatformRuntimeSettings: async () => ({ enabled: true }),
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      weatherText: "",
    };

    await instance.loadCategories();
    await instance.loadHomeFeed();
    await instance.refreshWeather();
    instance.goSearch();

    assert.deepEqual(instance.categories, [{ label: "团购" }]);
    assert.deepEqual(instance.shops, [{ id: "shop-1", normalized: true }]);
    assert.deepEqual(instance.featuredProducts, [{ id: "product-1", featured: true }]);
    assert.deepEqual(instance.weather, { temp: 20, condition: "晴", refreshIntervalMinutes: 15 });
    assert.equal(instance.weatherRefreshMinutes, 15);
    assert.deepEqual(navigation, ["/pages/search/index/index"]);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});
