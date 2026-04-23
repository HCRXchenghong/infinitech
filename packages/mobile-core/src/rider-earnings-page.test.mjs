import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderEarningsList,
  createRiderEarningsMonthValue,
  createRiderEarningsPageLogic,
  extractRiderEarningsItems,
  extractRiderEarningsSummary,
  formatRiderEarningsCents,
  formatRiderEarningsDateHeader,
  formatRiderEarningsMonthLabel,
  formatRiderEarningsTime,
  normalizeRiderEarningsPagePayload,
  parseRiderEarningsDate,
} from "./rider-earnings-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rider earnings helpers normalize cents, dates and month labels", () => {
  const date = parseRiderEarningsDate("2026-04-23 12:34:00");
  assert.ok(date instanceof Date);
  assert.equal(formatRiderEarningsCents(1234), "12.34");
  assert.equal(formatRiderEarningsTime("2026-04-23 09:05:00"), "09:05");
  assert.equal(formatRiderEarningsDateHeader(new Date("2026-04-23T00:00:00Z")).includes("04月23日"), true);
  assert.equal(formatRiderEarningsMonthLabel("2026-04"), "2026年04月");
  assert.equal(createRiderEarningsMonthValue(new Date("2026-04-03T08:00:00")), "2026-04");
});

test("rider earnings helpers extract summary, items and grouped list", () => {
  const payload = {
    data: {
      summary: {
        total_income: 8888,
        order_count: 3,
      },
      items: [
        {
          created_at: "2026-04-23 10:30:00",
          amount: 500,
          status: "pending",
          shop_name: "商家A",
        },
        {
          created_at: "2026-04-23 09:00:00",
          amount: 800,
          status: "settled",
          title: "夜间补贴",
        },
        {
          created_at: "2026-04-22 18:20:00",
          amount: 1200,
          status: "settled",
          shopName: "商家B",
        },
      ],
    },
  };

  assert.deepEqual(extractRiderEarningsSummary(payload), {
    totalIncome: 8888,
    orderCount: 3,
  });
  assert.equal(extractRiderEarningsItems(payload).length, 3);

  const list = buildRiderEarningsList(extractRiderEarningsItems(payload));
  assert.equal(list.length, 2);
  assert.equal(list[0].logs[0].title, "配送费 - 商家A");
  assert.equal(list[0].logs[0].subtitle.includes("冻结中"), true);
  assert.equal(list[0].logs[1].title, "夜间补贴");
  assert.equal(list[1].total, "12.00");

  assert.deepEqual(normalizeRiderEarningsPagePayload(payload), {
    monthlyTotal: "88.88",
    monthlyOrders: 3,
    earningsList: list,
  });
});

test("rider earnings page loads payloads and resets cleanly on errors", async () => {
  const component = createRiderEarningsPageLogic({
    nowFn() {
      return new Date("2026-04-01T08:00:00");
    },
    async fetchEarnings(params) {
      assert.deepEqual(params, {
        month: "2026-04",
        page: 1,
        limit: 300,
      });
      return {
        summary: {
          totalIncome: 3200,
          orderCount: 2,
        },
        items: [
          {
            createdAt: "2026-04-23 10:00:00",
            amount: 1200,
            status: "pending",
          },
          {
            createdAt: "2026-04-22 09:00:00",
            amount: 2000,
            status: "settled",
            shopName: "商家C",
          },
        ],
      };
    },
  });
  const page = instantiatePage(component);

  assert.equal(page.monthValue, "2026-04");
  assert.equal(page.monthLabel, "2026年04月");

  await page.loadEarnings();
  assert.equal(page.monthlyTotal, "32.00");
  assert.equal(page.monthlyOrders, 2);
  assert.equal(page.earningsList.length, 2);

  page.onMonthChange({ detail: { value: "2026-05" } });
  assert.equal(page.monthValue, "2026-05");

  const failedComponent = createRiderEarningsPageLogic({
    async fetchEarnings() {
      throw { error: "接口失败" };
    },
  });
  const failedPage = instantiatePage(failedComponent);
  await failedPage.loadEarnings();
  assert.equal(failedPage.monthlyTotal, "0.00");
  assert.equal(failedPage.monthlyOrders, 0);
  assert.deepEqual(failedPage.earningsList, []);
  assert.equal(failedPage.errorText, "接口失败");
});
