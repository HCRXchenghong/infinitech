import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminHomeCampaignListQuery,
  buildAdminHomeCampaignPayload,
  buildAdminHomeSlotQuery,
  canAdminHomeCampaignPerformAction,
  createAdminHomeCampaignFilters,
  createAdminHomeCampaignForm,
  createAdminHomeCampaignTargetOptions,
  extractAdminHomeCampaignNamedList,
  extractAdminHomeCampaignPage,
  extractAdminHomeSlotCollections,
  formatAdminHomeCampaignDateTime,
  getAdminHomeCampaignDialogTitle,
  getAdminHomeCampaignLockLabel,
  getAdminHomeCampaignLockTagType,
  getAdminHomeCampaignObjectTypeLabel,
  getAdminHomeCampaignObjectTypeTagType,
  getAdminHomeCampaignPositionSourceLabel,
  getAdminHomeCampaignPositionSourceTagType,
  getAdminHomeCampaignPromoteLabel,
  getAdminHomeCampaignStatusLabel,
  getAdminHomeCampaignStatusTagType,
  validateAdminHomeCampaignForm,
} from "./home-campaign-resources.js";

test("home campaign resources normalize filters, forms and target options", () => {
  assert.deepEqual(createAdminHomeCampaignFilters({ city: " 上海 " }), {
    objectType: "",
    status: "",
    city: "上海",
    businessCategory: "",
  });

  const now = new Date(2026, 3, 16, 8, 9, 10);
  assert.equal(formatAdminHomeCampaignDateTime(now), "2026-04-16 08:09:10");

  assert.deepEqual(createAdminHomeCampaignForm({}, { now }), {
    objectType: "shop",
    targetId: "",
    slotPosition: 1,
    city: "",
    businessCategory: "",
    status: "draft",
    isPositionLocked: false,
    promoteLabel: "推广",
    contractNo: "",
    serviceRecordNo: "",
    remark: "",
    startAt: "2026-04-16 08:09:10",
    endAt: "2026-04-23 08:09:10",
  });

  assert.deepEqual(
    createAdminHomeCampaignForm(
      {
        objectType: "product",
        targetId: "p-9",
        slotPosition: "3",
        city: " 杭州 ",
        businessCategory: " 美食 ",
        status: "approved",
        isPositionLocked: 1,
        promoteLabel: "",
        contractNo: " HT-9 ",
        serviceRecordNo: " SR-9 ",
        remark: " 头部档期 ",
        startAt: "2026-04-18 09:00:00",
        endAt: "2026-04-20 10:00:00",
      },
      { now },
    ),
    {
      objectType: "product",
      targetId: "p-9",
      slotPosition: 3,
      city: "杭州",
      businessCategory: "美食",
      status: "approved",
      isPositionLocked: true,
      promoteLabel: "推广",
      contractNo: "HT-9",
      serviceRecordNo: "SR-9",
      remark: "头部档期",
      startAt: "2026-04-18 09:00:00",
      endAt: "2026-04-20 10:00:00",
    },
  );

  assert.equal(getAdminHomeCampaignDialogTitle("campaign-1", {}), "编辑首页推广计划");
  assert.equal(getAdminHomeCampaignDialogTitle("", { isPositionLocked: true }), "锁定位次");
  assert.equal(getAdminHomeCampaignDialogTitle("", { isPositionLocked: false }), "新建首页推广计划");

  assert.deepEqual(
    createAdminHomeCampaignTargetOptions([
      { id: 9, name: " 品牌商户 " },
      { uid: "p-1", name: "" },
    ]),
    [
      { id: "9", name: "品牌商户" },
      { id: "p-1", name: "ID p-1" },
    ],
  );
});

test("home campaign resources keep list extraction and label semantics stable", () => {
  assert.deepEqual(
    extractAdminHomeCampaignNamedList({ data: { shops: [{ id: "s-1" }] } }, "shops"),
    [{ id: "s-1" }],
  );
  assert.deepEqual(
    extractAdminHomeCampaignPage({ data: { campaigns: [{ id: "c-1" }] } }),
    { items: [{ id: "c-1" }] },
  );
  assert.deepEqual(
    extractAdminHomeSlotCollections({
      data: {
        products: [{ id: "p-1" }],
        shops: [{ id: "s-1" }],
      },
    }),
    {
      products: [{ id: "p-1" }],
      shops: [{ id: "s-1" }],
    },
  );

  assert.equal(getAdminHomeCampaignObjectTypeLabel("shop"), "商户");
  assert.equal(getAdminHomeCampaignObjectTypeTagType("product"), "warning");
  assert.equal(getAdminHomeCampaignStatusLabel("scheduled"), "已排期");
  assert.equal(getAdminHomeCampaignStatusTagType("active"), "success");
  assert.equal(getAdminHomeCampaignPositionSourceLabel("manual_locked"), "手工锁位");
  assert.equal(getAdminHomeCampaignPositionSourceTagType("featured"), "success");
  assert.equal(getAdminHomeCampaignLockLabel(true), "是");
  assert.equal(getAdminHomeCampaignLockTagType(false), "info");
  assert.equal(
    getAdminHomeCampaignPromoteLabel({ isPromoted: true, promoteLabel: "" }),
    "推广",
  );
  assert.equal(
    getAdminHomeCampaignPromoteLabel({ isPromoted: false, promoteLabel: "品牌推广" }),
    "-",
  );
});

test("home campaign resources keep action guards, queries and payloads stable", () => {
  assert.equal(
    canAdminHomeCampaignPerformAction({ effectiveStatus: "draft" }, "approve"),
    true,
  );
  assert.equal(
    canAdminHomeCampaignPerformAction({ effectiveStatus: "scheduled" }, "pause"),
    true,
  );
  assert.equal(
    canAdminHomeCampaignPerformAction({ effectiveStatus: "approved" }, "resume"),
    false,
  );

  assert.deepEqual(
    buildAdminHomeCampaignListQuery({
      objectType: " shop ",
      status: " active ",
      city: " 上海 ",
      businessCategory: " 美食 ",
    }),
    {
      objectType: "shop",
      status: "active",
      city: "上海",
      businessCategory: "美食",
    },
  );
  assert.deepEqual(
    buildAdminHomeSlotQuery({ city: " 上海 ", businessCategory: "" }),
    { city: "上海" },
  );
  assert.equal(validateAdminHomeCampaignForm({}), "请选择对象类型");
  assert.equal(
    validateAdminHomeCampaignForm({ objectType: "shop", targetId: "", slotPosition: 1 }),
    "请选择投放对象",
  );
  assert.equal(
    validateAdminHomeCampaignForm({
      objectType: "shop",
      targetId: "s-1",
      slotPosition: 0,
      startAt: "2026-04-16 08:09:10",
      endAt: "2026-04-17 08:09:10",
    }),
    "目标位次必须大于 0",
  );
  assert.equal(
    validateAdminHomeCampaignForm({
      objectType: "shop",
      targetId: "s-1",
      slotPosition: 1,
      startAt: "",
      endAt: "",
    }),
    "请选择投放时间范围",
  );
  assert.equal(
    validateAdminHomeCampaignForm({
      objectType: "product",
      targetId: "p-1",
      slotPosition: 2,
      startAt: "2026-04-16 08:09:10",
      endAt: "2026-04-18 08:09:10",
    }),
    "",
  );

  assert.deepEqual(
    buildAdminHomeCampaignPayload({
      objectType: "product",
      targetId: "p-1",
      slotPosition: "2",
      city: " 上海 ",
      businessCategory: " 美食 ",
      status: "approved",
      isPositionLocked: 1,
      promoteLabel: "",
      contractNo: " HT-1 ",
      serviceRecordNo: " SR-1 ",
      remark: " 黄金档 ",
      startAt: "2026-04-16 08:09:10",
      endAt: "2026-04-18 08:09:10",
    }),
    {
      objectType: "product",
      targetId: "p-1",
      slotPosition: 2,
      city: "上海",
      businessCategory: "美食",
      status: "approved",
      isPositionLocked: true,
      promoteLabel: "推广",
      contractNo: "HT-1",
      serviceRecordNo: "SR-1",
      remark: "黄金档",
      startAt: "2026-04-16 08:09:10",
      endAt: "2026-04-18 08:09:10",
    },
  );
});
