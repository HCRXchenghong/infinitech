import test from "node:test";
import assert from "node:assert/strict";

import {
  debounce,
  deepClone,
  formatMoney,
  formatPrice,
  formatRelativeTime,
  formatRoleId,
  formatTime,
  formatUserId,
  getOrderStatusColor,
  getOrderStatusText,
  hideLoading,
  showConfirm,
  showLoading,
  showToast,
  throttle,
} from "./mobile-utils.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("mobile utils format identifiers and time values consistently", () => {
  assert.equal(formatUserId(" 12345678901234 ", 6), "12345678901234");
  assert.equal(formatRoleId("9988", "rider"), "9988");
  assert.equal(formatTime(new Date(2026, 3, 17, 9, 8, 7)), "2026-04-17 09:08:07");
  assert.equal(formatMoney("12.3"), "12.30");
  assert.equal(formatPrice(8), "8.00");
});

test("mobile utils build relative time text against the provided clock", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 10 * day;

  assert.equal(formatRelativeTime(now - 10 * 1000, { now }), "刚刚");
  assert.equal(formatRelativeTime(now - 5 * 60 * 1000, { now }), "5分钟前");
  assert.equal(formatRelativeTime(now - 3 * 60 * 60 * 1000, { now }), "3小时前");
  assert.equal(formatRelativeTime(now - 2 * day, { now }), "2天前");
  assert.equal(formatRelativeTime(now - 10 * day, { now }), "1-1");
});

test("mobile utils debounce and throttle repeated calls", async () => {
  const debounceCalls = [];
  const throttledCalls = [];
  const debounced = debounce((value) => debounceCalls.push(value), 20);
  const throttled = throttle((value) => throttledCalls.push(value), 20);

  debounced("first");
  debounced("second");
  throttled("first");
  throttled("second");

  await wait(35);

  throttled("third");
  await wait(35);

  assert.deepEqual(debounceCalls, ["second"]);
  assert.deepEqual(throttledCalls, ["first", "third"]);
});

test("mobile utils deep clone keeps nested structures detached", () => {
  const source = {
    nested: {
      items: [1, { ok: true }],
    },
    createdAt: new Date(2026, 3, 17, 9, 8, 7),
  };

  const clone = deepClone(source);
  clone.nested.items[1].ok = false;

  assert.notEqual(clone, source);
  assert.notEqual(clone.nested, source.nested);
  assert.notEqual(clone.createdAt, source.createdAt);
  assert.equal(source.nested.items[1].ok, true);
});

test("mobile utils proxy toast, loading and modal feedback through uni runtime", async () => {
  const previousUni = globalThis.uni;
  const events = [];

  globalThis.uni = {
    showToast(payload) {
      events.push(["toast", payload]);
    },
    showLoading(payload) {
      events.push(["showLoading", payload]);
    },
    hideLoading() {
      events.push(["hideLoading"]);
    },
    showModal(payload) {
      events.push(["modal", payload.title, payload.content]);
      payload.success({ confirm: true });
    },
  };

  try {
    assert.equal(showToast("提示", "success"), true);
    assert.equal(showLoading("加载中"), true);
    assert.equal(hideLoading(), true);
    assert.equal(await showConfirm("确认继续吗？", "提示"), true);
  } finally {
    globalThis.uni = previousUni;
  }

  assert.deepEqual(events, [
    ["toast", { title: "提示", icon: "success", duration: 2000 }],
    ["showLoading", { title: "加载中", mask: true }],
    ["hideLoading"],
    ["modal", "提示", "确认继续吗？"],
  ]);
});

test("mobile utils expose stable order status mappings", () => {
  assert.equal(getOrderStatusText("accepted"), "待出餐");
  assert.equal(getOrderStatusText("missing"), "未知");
  assert.equal(getOrderStatusColor("completed"), "#10b981");
  assert.equal(getOrderStatusColor("missing"), "#6b7280");
});
