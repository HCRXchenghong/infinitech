import test from "node:test";
import assert from "node:assert/strict";

import {
  createCategoryGridComponent,
  createFeaturedSectionComponent,
  createHomeHeaderComponent,
  createHomeLocationModalComponent,
  createHomeShopCardComponent,
  formatFeaturedSectionPrice,
  formatHomeShopCardPrice,
  formatHomeShopCardRating,
  relocateHomeLocation,
} from "./home-shell-components.js";

test("home shell helpers format featured and shop values consistently", () => {
  assert.equal(formatFeaturedSectionPrice(10), "10");
  assert.equal(formatFeaturedSectionPrice("10.5"), "10.5");
  assert.equal(formatHomeShopCardPrice(8.8), "8.8");
  assert.equal(formatHomeShopCardRating(4.26), "★ 4.3");
  assert.equal(formatHomeShopCardRating(0), "暂无评分");
  assert.equal(formatHomeShopCardRating("bad"), "暂无评分");
});

test("home shell component factories expose stable emit semantics", () => {
  const events = [];
  const homeHeader = createHomeHeaderComponent({
    name: "TestHomeHeader",
  });
  const categoryGrid = createCategoryGridComponent();
  const featuredSection = createFeaturedSectionComponent();
  const homeShopCard = createHomeShopCardComponent();

  assert.equal(homeHeader.name, "TestHomeHeader");
  homeHeader.methods.handleLocation.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  homeHeader.methods.handleWeather.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  homeHeader.methods.handleSearch.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  categoryGrid.methods.handleTap.call(
    {
      $emit(eventName, payload) {
        events.push(`${eventName}:${payload.name}`);
      },
    },
    { name: "美食" },
  );
  featuredSection.methods.handleTap.call(
    {
      $emit(eventName, payload) {
        events.push(`${eventName}:${payload.id}`);
      },
    },
    { id: "product-1" },
  );
  featuredSection.methods.handleMore.call({
    $emit(eventName) {
      events.push(eventName);
    },
  });
  homeShopCard.methods.handleTap.call({
    shop: { id: "shop-1" },
    $emit(eventName, payload) {
      events.push(`${eventName}:${payload}`);
    },
  });

  assert.deepEqual(events, [
    "location",
    "weather",
    "search",
    "category-tap:美食",
    "product-tap:product-1",
    "more",
    "shop-tap:shop-1",
  ]);
});

test("home shell helpers relocate consumer location and persist normalized state", async () => {
  const storageWrites = [];
  const toastCalls = [];

  const result = await relocateHomeLocation({
    async getCurrentLocation() {
      return {
        latitude: 31.2304,
        longitude: 121.4737,
        address: "",
      };
    },
    uniApp: {
      setStorageSync(key, value) {
        storageWrites.push([key, value]);
      },
      showToast(payload) {
        toastCalls.push(payload);
      },
    },
  });

  assert.equal(result.displayAddress, "31.230400,121.473700");
  assert.deepEqual(storageWrites, [
    ["selectedAddress", "31.230400,121.473700"],
    ["currentLocation", { lat: 31.2304, lng: 121.4737 }],
  ]);
  assert.deepEqual(toastCalls, [{ title: "定位成功", icon: "success" }]);
});

test("home location modal component handles relocate, failure, and address selection flow", async () => {
  const navigations = [];
  const toasts = [];
  const emits = [];
  const timers = [];
  const component = createHomeLocationModalComponent({
    uniApp: {
      setStorageSync() {},
      showToast(payload) {
        toasts.push(payload);
      },
      navigateTo(payload) {
        navigations.push(payload);
      },
    },
    async getCurrentLocation() {
      return {
        latitude: 39.9,
        longitude: 116.4,
        address: "北京市朝阳区",
      };
    },
    setTimeoutImpl(callback, delay) {
      timers.push(delay);
      callback();
      return 1;
    },
  });

  const instance = {
    loading: false,
    $emit(eventName, payload) {
      emits.push([eventName, payload]);
    },
  };
  instance.handleClose = component.methods.handleClose.bind(instance);

  await component.methods.handleRelocate.call(instance);
  component.methods.handleSelectAddress.call(instance);

  assert.equal(instance.loading, false);
  assert.deepEqual(emits, [
    ["relocated", "北京市朝阳区"],
    ["close", undefined],
    ["close", undefined],
  ]);
  assert.deepEqual(timers, [80]);
  assert.deepEqual(navigations, [
    { url: "/pages/profile/address-list/index?select=1" },
  ]);

  const failingInstance = {
    loading: false,
    $emit() {},
    handleClose() {},
  };
  const failingComponent = createHomeLocationModalComponent({
    uniApp: {
      setStorageSync() {},
      showToast(payload) {
        toasts.push(payload);
      },
      navigateTo() {},
    },
    async getCurrentLocation() {
      throw new Error("denied");
    },
  });

  await failingComponent.methods.handleRelocate.call(failingInstance);

  assert.deepEqual(toasts, [
    { title: "定位成功", icon: "success" },
    { title: "定位失败", icon: "none" },
  ]);
  assert.equal(failingInstance.loading, false);
});
