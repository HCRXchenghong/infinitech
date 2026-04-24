import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderDataStatsPageLogic,
  DEFAULT_RIDER_DATA_STATS_PRESETS,
  DEFAULT_RIDER_DATA_STATS_TABS,
  resolveRiderDataStatsPreset,
} from "./rider-data-stats-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider data stats helpers return stable tab presets", () => {
  assert.deepEqual(DEFAULT_RIDER_DATA_STATS_TABS, ["今日", "本周", "本月"]);
  assert.equal(DEFAULT_RIDER_DATA_STATS_PRESETS.length, 3);
  assert.equal(resolveRiderDataStatsPreset(1).label, "本周");
  assert.equal(resolveRiderDataStatsPreset(999).label, "今日");
});

test("rider data stats page switches between presets through shared tab logic", () => {
  const component = createRiderDataStatsPageLogic();
  const page = instantiatePage(component);

  assert.equal(page.currentTab, 0);
  assert.equal(page.stats.totalOrders, 18);
  assert.equal(page.chartData[0].label, "09");

  page.selectTab(1);
  assert.equal(page.currentTab, 1);
  assert.equal(page.stats.totalOrders, 186);
  assert.equal(page.chartData[0].label, "周一");

  page.selectTab(2);
  assert.equal(page.currentTab, 2);
  assert.equal(page.stats.totalOrders, 742);
  assert.equal(page.chartData[0].label, "第1周");
});

test("rider data stats page ignores invalid tab indexes", () => {
  const component = createRiderDataStatsPageLogic();
  const page = instantiatePage(component);
  const originalStats = page.stats;
  const originalChartData = page.chartData;

  page.selectTab(-1);
  page.selectTab("bad-index");

  assert.equal(page.currentTab, 0);
  assert.equal(page.stats, originalStats);
  assert.equal(page.chartData, originalChartData);
});
