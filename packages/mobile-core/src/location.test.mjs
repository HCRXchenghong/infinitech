import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocationAddressFromParts,
  createLocationService,
  normalizeLocationAddressPayload,
  normalizeUniLocationResult,
} from "./location.js";

test("location helpers normalize uni payloads and address parts consistently", () => {
  assert.deepEqual(
    normalizeUniLocationResult({
      address: {
        city: "上海市",
        district: "徐汇区",
      },
      province: "上海市",
      street: "漕溪北路",
      streetNum: "18号",
      name: "地铁站",
    }),
    {
      address: "",
      addresses: undefined,
      city: "上海市",
      district: "徐汇区",
      province: "上海市",
      street: "漕溪北路",
      streetNum: "18号",
      poiName: "地铁站",
    },
  );

  const normalizedAddress = normalizeLocationAddressPayload({
    formatted_addresses: "上海市徐汇区漕溪北路18号",
    city: "上海市",
    district: "徐汇区",
    street: "漕溪北路",
    street_number: "18号",
    name: "地铁站",
  });
  assert.equal(
    buildLocationAddressFromParts(normalizedAddress),
    "上海市徐汇区漕溪北路18号地铁站",
  );
});

test("location service falls back to uni.getLocation when plus geolocation is unavailable", async () => {
  const calls = [];
  const service = createLocationService({
    uniApp: {
      getLocation(options) {
        calls.push("getLocation");
        options.success({
          latitude: "31.2",
          longitude: "121.4",
          address: "上海市徐汇区漕溪北路18号",
          city: "上海市",
          district: "徐汇区",
          province: "上海市",
        });
      },
    },
    plusApp: null,
  });

  assert.deepEqual(await service.getCurrentLocation(), {
    latitude: 31.2,
    longitude: 121.4,
    address: "上海市徐汇区漕溪北路18号",
    city: "上海市",
    district: "徐汇区",
    province: "上海市",
  });
  assert.deepEqual(calls, ["getLocation"]);
});

test("location service chooses locations after permission checks", async () => {
  const service = createLocationService({
    uniApp: {
      getSetting(options) {
        options.success({
          authSetting: {
            "scope.userLocation": true,
          },
        });
      },
      chooseLocation(options) {
        options.success({
          latitude: 31.2,
          longitude: 121.4,
          address: "",
          name: "人民广场",
        });
      },
    },
    plusApp: null,
  });

  assert.deepEqual(await service.chooseLocation(), {
    latitude: 31.2,
    longitude: 121.4,
    address: "人民广场",
    name: "人民广场",
  });
});

test("location service rejects denied Android runtime permissions", async () => {
  const service = createLocationService({
    uniApp: {},
    plusApp: {
      os: {
        name: "Android",
      },
      android: {
        requestPermissions(_permissions, success) {
          success({
            deniedAlways: ["android.permission.ACCESS_FINE_LOCATION"],
            deniedPresent: [],
          });
        },
      },
    },
  });

  await assert.rejects(
    () => service.getCurrentLocation(),
    /android permission denied/,
  );
});
