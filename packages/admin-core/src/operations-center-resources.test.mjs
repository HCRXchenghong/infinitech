import test from "node:test";
import assert from "node:assert/strict";

import {
  createOperationsGoodForm,
  createOperationsGoodFormState,
  extractOperationsCooperationPage,
  extractOperationsGoodsPage,
  extractOperationsInviteCodePage,
  extractOperationsInviteRecordPage,
  extractOperationsRedemptionPage,
  formatCooperationType,
  getCooperationTypeTagType,
  normalizeOperationsCooperationRecord,
  normalizeOperationsGoodRecord,
} from "./operations-center-resources.js";

test("operations center resources normalize cooperation and points goods models", () => {
  assert.deepEqual(
    normalizeOperationsCooperationRecord({
      id: 7,
      company: " 平台建议 ",
      cooperation_type: "feedback",
      contact_name: " 张三 ",
      contact_phone: " 13800000000 ",
      description: " 需要优化 ",
      status: "",
    }),
    {
      id: 7,
      company: "平台建议",
      cooperation_type: "feedback",
      contact_name: "张三",
      contact_phone: "13800000000",
      description: "需要优化",
      created_at: "",
      status: "pending",
      admin_remark: "",
    },
  );

  assert.equal(formatCooperationType("cooperation"), "商务合作");
  assert.equal(getCooperationTypeTagType("feedback"), "info");

  assert.deepEqual(createOperationsGoodForm(), {
    id: null,
    name: "",
    points: 0,
    ship_fee: 0,
    tag: "",
    type: "goods",
    desc: "",
    is_active: true,
  });

  assert.deepEqual(
    normalizeOperationsGoodRecord({
      id: 3,
      name: " 会员卡 ",
      points: "199",
      ship_fee: "0",
      tag: " VIP ",
      type: "vip",
      description: " 年卡 ",
      is_active: 0,
    }),
    {
      id: 3,
      name: "会员卡",
      points: 199,
      ship_fee: 0,
      tag: "VIP",
      type: "vip",
      desc: "年卡",
      is_active: false,
      description: " 年卡 ",
    },
  );
});

test("operations center resources extract admin pages with stable defaults", () => {
  assert.deepEqual(
    extractOperationsCooperationPage({
      data: {
        cooperations: [{ id: 1, company: "反馈单", cooperation_type: "feedback" }],
        total: 1,
      },
    }),
    {
      items: [
        {
          id: 1,
          company: "反馈单",
          cooperation_type: "feedback",
          contact_name: "",
          contact_phone: "",
          description: "",
          created_at: "",
          status: "pending",
          admin_remark: "",
        },
      ],
      total: 1,
      page: 0,
      limit: 0,
    },
  );

  assert.deepEqual(
    extractOperationsInviteCodePage({ data: { codes: [{ id: 1 }, { id: 2 }] } }).items,
    [{ id: 1 }, { id: 2 }],
  );
  assert.deepEqual(
    extractOperationsInviteRecordPage({ data: { invite_records: [{ id: 3 }] } }).items,
    [{ id: 3 }],
  );
  assert.deepEqual(
    extractOperationsRedemptionPage({ data: { redemptions: [{ id: 4 }] } }).items,
    [{ id: 4 }],
  );
  assert.deepEqual(
    extractOperationsGoodsPage({ data: { goods: [{ id: 5, name: "兑换券", points: 88 }] } }).items,
    [
      {
        id: 5,
        name: "兑换券",
        points: 88,
        ship_fee: 0,
        tag: "",
        type: "goods",
        desc: "",
        is_active: true,
      },
    ],
  );
  assert.deepEqual(
    createOperationsGoodFormState({ id: 9, name: "实物周边", is_active: 1 }),
    {
      id: 9,
      name: "实物周边",
      points: 0,
      ship_fee: 0,
      tag: "",
      type: "goods",
      desc: "",
      is_active: true,
    },
  );
});
