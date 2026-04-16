import test from "node:test";
import assert from "node:assert/strict";

import {
  buildErrandHomeViewModel,
  buildErrandSettingsPayload,
  createDefaultErrandSettings,
  createErrandService,
  DEFAULT_ERRAND_SERVICE_ROUTE_MAP,
  getEnabledErrandServices,
  getSortedErrandServices,
  normalizeErrandSettings,
  resolveErrandServiceRoute,
  validateErrandSettings,
} from "./errand-settings.js";

test("errand settings expose stable defaults and normalization", () => {
  const defaults = createDefaultErrandSettings();
  defaults.services[0].label = "已改动";

  assert.equal(createDefaultErrandSettings().services[0].label, "帮我买");
  assert.equal(
    resolveErrandServiceRoute("deliver"),
    DEFAULT_ERRAND_SERVICE_ROUTE_MAP.deliver,
  );

  assert.deepEqual(
    createErrandService({
      key: "pickup",
      label: " 帮我取件 ",
      enabled: "0",
      sort_order: "88",
      serviceFeeHint: " 夜间加价 ",
    }),
    {
      key: "pickup",
      label: "帮我取件",
      desc: "快递代取",
      icon: "取",
      color: "#10b981",
      enabled: false,
      sort_order: 88,
      route: "/pages/errand/pickup/index",
      service_fee_hint: "夜间加价",
    },
  );

  assert.deepEqual(normalizeErrandSettings(), createDefaultErrandSettings());
  assert.deepEqual(
    normalizeErrandSettings({
      page_title: " 校园跑腿 ",
      hero_title: " 即时代办 ",
      hero_desc: " 当天送达 ",
      detail_tip: " 以实际配送为准 ",
      services: [{ key: "deliver", label: " 帮送 ", sort_order: "50" }],
    }),
    {
      page_title: "校园跑腿",
      hero_title: "即时代办",
      hero_desc: "当天送达",
      detail_tip: "以实际配送为准",
      services: [
        {
          key: "deliver",
          label: "帮送",
          desc: "同城配送",
          icon: "送",
          color: "#009bf5",
          enabled: true,
          sort_order: 50,
          route: "/pages/errand/deliver/index",
          service_fee_hint: "",
        },
      ],
    },
  );
});

test("errand settings validation and payload building stay deterministic", () => {
  assert.deepEqual(validateErrandSettings({ services: [{}] }), {
    valid: false,
    message: "跑腿主标题不能为空",
  });
  assert.deepEqual(
    validateErrandSettings({ hero_title: "同城跑腿", services: [] }),
    {
      valid: false,
      message: "至少需要保留一个跑腿服务",
    },
  );
  assert.deepEqual(
    validateErrandSettings({
      hero_title: "同城跑腿",
      services: [{ key: "buy", label: " " }],
    }),
    {
      valid: false,
      message: "跑腿服务 key 和名称不能为空",
    },
  );
  assert.deepEqual(
    validateErrandSettings({
      hero_title: "同城跑腿",
      services: [
        { key: "buy", label: "帮我买" },
        { key: "buy", label: "帮我买 2" },
      ],
    }),
    {
      valid: false,
      message: "跑腿服务 key 不能重复",
    },
  );
  assert.deepEqual(
    validateErrandSettings({
      hero_title: "同城跑腿",
      services: [{ key: "buy", label: "帮我买" }],
    }),
    { valid: true, message: "" },
  );

  assert.deepEqual(
    buildErrandSettingsPayload({
      page_title: " 跑腿服务 ",
      hero_title: " 同城跑腿 ",
      hero_desc: " 帮买帮送 ",
      detail_tip: " 夜间可能加价 ",
      services: [
        {
          key: "pickup",
          label: " 帮我取 ",
          enabled: "0",
          sort_order: "30",
          service_fee_hint: " 超远程额外计费 ",
        },
        {
          key: "buy",
          label: " 帮我买 ",
          sort_order: "10",
        },
      ],
    }),
    {
      page_title: "跑腿服务",
      hero_title: "同城跑腿",
      hero_desc: "帮买帮送",
      detail_tip: "夜间可能加价",
      services: [
        {
          key: "buy",
          label: "帮我买",
          desc: "代买商品",
          icon: "购",
          color: "#ff6b00",
          enabled: true,
          sort_order: 10,
          route: "/pages/errand/buy/index",
          service_fee_hint: "",
        },
        {
          key: "pickup",
          label: "帮我取",
          desc: "快递代取",
          icon: "取",
          color: "#10b981",
          enabled: false,
          sort_order: 30,
          route: "/pages/errand/pickup/index",
          service_fee_hint: "超远程额外计费",
        },
      ],
    },
  );
});

test("errand home view model keeps enabled service ordering stable", () => {
  const services = [
    { key: "do", label: "帮我办", enabled: true, sort_order: 40 },
    { key: "buy", label: "帮我买", enabled: true, sort_order: 10 },
    { key: "pickup", label: "帮我取", enabled: false, sort_order: 30 },
  ];

  assert.deepEqual(
    getSortedErrandServices(services).map((item) => item.key),
    ["buy", "pickup", "do"],
  );
  assert.deepEqual(
    getEnabledErrandServices(services).map((item) => item.key),
    ["buy", "do"],
  );

  assert.deepEqual(
    buildErrandHomeViewModel({
      page_title: " 校园跑腿 ",
      hero_title: " 同城即达 ",
      hero_desc: " 帮你办成每一单 ",
      detail_tip: " 以骑手接单情况为准 ",
      services: [
        {
          key: "deliver",
          label: " 帮我送 ",
          desc: " 同城闪送 ",
          service_fee_hint: " 预计加收 2 元 ",
          sort_order: 50,
        },
        {
          key: "buy",
          enabled: false,
          sort_order: 10,
        },
      ],
    }),
    {
      pageTitle: "校园跑腿",
      heroTitle: "同城即达",
      heroDesc: "帮你办成每一单",
      detailTip: "以骑手接单情况为准",
      services: [
        {
          id: "deliver",
          key: "deliver",
          name: "帮我送",
          desc: "同城闪送",
          icon: "送",
          color: "#009bf5",
          route: "/pages/errand/deliver/index",
          serviceFeeHint: "预计加收 2 元",
        },
      ],
    },
  );
});
