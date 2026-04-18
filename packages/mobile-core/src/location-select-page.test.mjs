import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocationSelectSnapshot,
  createLocationSelectPage,
} from "./location-select-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("location select helpers build stable storage snapshots", () => {
  assert.deepEqual(
    buildLocationSelectSnapshot({
      latitude: 31.2304,
      longitude: 121.4737,
      address: " 上海市黄浦区 ",
    }),
    {
      selectedAddress: "上海市黄浦区",
      currentLocation: {
        lat: 31.2304,
        lng: 121.4737,
      },
    },
  );
});

test("location select page stores relocate result and routes to address list", async () => {
  const storage = {};
  const navigation = [];
  const toasts = [];
  const previousUni = globalThis.uni;
  const previousSetTimeout = globalThis.setTimeout;

  try {
    globalThis.setTimeout = (handler) => {
      handler();
      return 0;
    };
    globalThis.uni = {
      setStorageSync(key, value) {
        storage[key] = value;
      },
      navigateTo(payload) {
        navigation.push(payload);
      },
      navigateBack() {
        navigation.push({ back: true });
      },
      showToast(payload) {
        toasts.push(payload);
      },
    };

    const component = createLocationSelectPage({
      getCurrentLocation: async () => ({
        latitude: 30.5728,
        longitude: 104.0668,
        address: "成都市锦江区",
      }),
    });
    const page = instantiatePage(component);

    await page.handleRelocate();
    page.handleSelectAddress();

    assert.deepEqual(storage, {
      selectedAddress: "成都市锦江区",
      currentLocation: {
        lat: 30.5728,
        lng: 104.0668,
      },
    });
    assert.deepEqual(toasts, [{ title: "定位成功", icon: "success" }]);
    assert.deepEqual(navigation, [
      { back: true },
      { url: "/pages/profile/address-list/index?select=1" },
    ]);
  } finally {
    globalThis.uni = previousUni;
    globalThis.setTimeout = previousSetTimeout;
  }
});
