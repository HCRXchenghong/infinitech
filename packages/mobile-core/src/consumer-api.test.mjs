import test from "node:test";
import assert from "node:assert/strict";

import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import { createConsumerApi } from "./consumer-api.js";

function createRequestClientStub(handler, capturedOptions) {
  return function createUniRequestClientImpl(options) {
    capturedOptions.push(options);
    return async function request(requestOptions = {}) {
      return handler(requestOptions);
    };
  };
}

test("consumer api wires shared request client with runtime config accessors", async () => {
  const clientOptions = [];
  const config = {
    API_BASE_URL: "https://api.example.com",
    TIMEOUT: 6000,
    isDev: false,
  };
  const api = createConsumerApi({
    config,
    uniApp: {},
    logger: { error() {} },
    createUniRequestClientImpl: createRequestClientStub(
      async (requestOptions) => ({ ok: true, requestOptions }),
      clientOptions,
    ),
  });

  assert.equal(api.getBaseUrl(), "https://api.example.com");
  assert.equal(api.BASE_URL, api.getBaseUrl);
  assert.equal(clientOptions.length, 1);
  assert.equal(clientOptions[0].getBaseUrl(), "https://api.example.com");
  assert.equal(clientOptions[0].getTimeout(), 6000);
  assert.equal(
    clientOptions[0].shouldLogNetworkError({
      message: "network request failed",
    }),
    false,
  );
  assert.equal(
    clientOptions[0].shouldLogNetworkError({ message: "fatal parse error" }),
    true,
  );

  config.API_BASE_URL = "https://api-v2.example.com";
  const response = await api.request({ url: "/health" });

  assert.equal(api.getBaseUrl(), "https://api-v2.example.com");
  assert.equal(response.requestOptions.url, "/health");
});

test("consumer api reuses one sync service instance and normalizes consumer catalog data", async () => {
  const requestCalls = [];
  let syncServiceCalls = 0;

  const api = createConsumerApi({
    config: {},
    uniApp: {},
    getSyncService() {
      syncServiceCalls += 1;
      return {
        async getData(dataset) {
          if (dataset === "shops") {
            return {
              data: {
                items: [{ id: "shop-1" }, { id: "shop-2" }],
              },
            };
          }
          if (dataset === "products") {
            return [
              { id: "1", category_id: 2, sort_order: 3 },
              { id: "2", category_id: 1, sort_order: 5 },
              { id: "3", category_id: 1, sort_order: 1 },
            ];
          }
          return null;
        },
      };
    },
    createUniRequestClientImpl: createRequestClientStub(
      async (requestOptions) => {
        requestCalls.push(requestOptions);
        return {};
      },
      [],
    ),
  });

  const shops = await api.fetchShops({ keyword: "奶茶" });
  const products = await api.fetchProducts("shop-1");
  const categoryProducts = await api.fetchProducts("shop-1", 1);

  assert.deepEqual(shops, [{ id: "shop-1" }, { id: "shop-2" }]);
  assert.deepEqual(
    products.map((item) => item.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    categoryProducts.map((item) => item.id),
    ["3", "2"],
  );
  assert.equal(syncServiceCalls, 1);
  assert.deepEqual(requestCalls, []);
});

test("consumer api falls back to local sync records when order detail requests fail", async () => {
  const api = createConsumerApi({
    config: {},
    uniApp: {},
    getSyncService() {
      return {
        async getData(dataset, conditions) {
          if (dataset === "orders" && conditions?.id === "order-1") {
            return [{ id: "order-1", source: "local-cache" }];
          }
          if (dataset === "shops") {
            return null;
          }
          return null;
        },
      };
    },
    createUniRequestClientImpl: createRequestClientStub(
      async (requestOptions) => {
        if (requestOptions.url === "/api/orders/order-1") {
          throw new Error("upstream unavailable");
        }
        if (requestOptions.url === "/api/shops/shop-1") {
          return {
            data: {
              id: "shop-1",
              source: "remote",
            },
          };
        }
        return {};
      },
      [],
    ),
  });

  const order = await api.fetchOrderDetail("order-1");
  const shop = await api.fetchShopDetail("shop-1");

  assert.deepEqual(order, { id: "order-1", source: "local-cache" });
  assert.deepEqual(shop, { id: "shop-1", source: "remote" });
});

test("consumer api shares upload, auth, push, and rtc request wiring", async () => {
  const requestCalls = [];
  const uploadCalls = [];
  const api = createConsumerApi({
    config: {
      API_BASE_URL: "https://assets.example.com",
    },
    uniApp: {
      getStorageSync(key) {
        if (key === "token" || key === "access_token") {
          return "token-123";
        }
        return "";
      },
    },
    uploadAuthenticatedAssetImpl(options) {
      uploadCalls.push(options);
      return Promise.resolve({ ok: true, uploadDomain: options.uploadDomain });
    },
    createUniRequestClientImpl: createRequestClientStub(
      async (requestOptions) => {
        requestCalls.push(requestOptions);
        if (requestOptions.url === "/api/rtc/calls") {
          return { data: { id: "call-1" } };
        }
        return { ok: true };
      },
      [],
    ),
  });

  const authHeader = api.readAuthorizationHeader();
  const uploadResult = await api.uploadCommonImage("/tmp/avatar.png");
  const pushResult = await api.registerPushDevice({ deviceToken: "abc" });
  const rtcCall = await api.createRTCCall({ peerId: "user-2" });

  assert.deepEqual(authHeader, { Authorization: "Bearer token-123" });
  assert.deepEqual(uploadResult, {
    ok: true,
    uploadDomain: UPLOAD_DOMAINS.PROFILE_IMAGE,
  });
  assert.equal(uploadCalls[0].token, "Bearer token-123");
  assert.equal(uploadCalls[0].uploadDomain, UPLOAD_DOMAINS.PROFILE_IMAGE);
  assert.equal(uploadCalls[0].baseUrl, "https://assets.example.com");
  assert.deepEqual(pushResult, { ok: true });
  assert.deepEqual(rtcCall, { id: "call-1" });
  assert.deepEqual(
    requestCalls.map((item) => [item.url, item.method || "GET"]),
    [
      ["/api/mobile/push/devices/register", "POST"],
      ["/api/rtc/calls", "POST"],
    ],
  );
});

test("consumer api normalizes notifications, home feed, weather, and reverse geocoding", async () => {
  const api = createConsumerApi({
    config: {},
    uniApp: {},
    createUniRequestClientImpl: createRequestClientStub(
      async (requestOptions) => {
        if (requestOptions.url === "/api/notifications?page=2&pageSize=5") {
          return {
            success: true,
            data: {
              items: [{ id: "notification-1" }],
              total: 9,
              page: 2,
              pageSize: 5,
              unread_count: 3,
              latest_title: "最新通知",
              latest_summary: "摘要",
            },
            latest_at: "2026-04-18T10:00:00Z",
          };
        }
        if (requestOptions.url === "/api/home/feed") {
          return {
            shops: [{ id: "shop-1" }],
            products: [{ id: "product-1" }],
            campaigns: "4",
          };
        }
        if (requestOptions.url === "/api/public/weather") {
          return {
            temperature: "22.4",
            feels_like: "20.5",
            weather: "小雨",
            weather_icon: "rain",
            aqi: 60,
            city_name: "上海",
            province: "上海",
            life_indices: {
              umbrella: {
                advice: "记得带伞",
              },
            },
          };
        }
        if (requestOptions.url === "/api/mobile/maps/reverse-geocode") {
          return {
            displayName: "上海市浦东新区世纪大道",
            address: {
              city_district: "浦东新区",
              city: "上海市",
            },
          };
        }
        return {};
      },
      [],
    ),
  });

  const notifications = await api.fetchNotificationList(2, 5);
  const homeFeed = await api.fetchHomeFeed({ city: "shanghai" });
  const weather = await api.fetchWeather(31.2, 121.5, { lang: "zh" });
  const geocode = await api.reverseGeocode(31.2, 121.5);

  assert.deepEqual(notifications.items, [{ id: "notification-1" }]);
  assert.equal(notifications.total, 9);
  assert.equal(notifications.unreadCount, 3);
  assert.equal(notifications.latest_title, "最新通知");
  assert.equal(homeFeed.campaigns, 4);
  assert.deepEqual(homeFeed.shops, [{ id: "shop-1" }]);
  assert.equal(weather.temp, 22);
  assert.equal(weather.feelsLike, 21);
  assert.equal(weather.airQuality, "良");
  assert.equal(weather.tips, "记得带伞");
  assert.equal(geocode.address, "上海市浦东新区世纪大道");
  assert.equal(geocode.district, "浦东新区");
  assert.equal(geocode.city, "上海市");
});
