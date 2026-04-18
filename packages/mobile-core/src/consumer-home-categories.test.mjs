import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHomeCategories,
  CATEGORIES,
  DYNAMIC_HOME_CATEGORY_NAMES,
  HOME_CATEGORY_ORDER,
} from "./consumer-home-categories.js";

test("consumer home categories expose stable defaults", () => {
  assert.equal(CATEGORIES[0].name, "美食");
  assert.deepEqual(HOME_CATEGORY_ORDER.slice(0, 4), [
    "美食",
    "团购",
    "甜点饮品",
    "超市便利",
  ]);
  assert.deepEqual(DYNAMIC_HOME_CATEGORY_NAMES, [
    "美食",
    "团购",
    "甜点饮品",
    "超市便利",
  ]);
});

test("consumer home categories normalize remote overrides and key-based fallbacks", () => {
  const categories = buildHomeCategories([
    { key: "food", count: "8", badge_text: "热卖" },
    {
      key: "leisure_entertainment",
      route_type: "page",
      route_value: "/custom",
    },
  ]);

  const food = categories.find((item) => item.key === "food");
  const leisure = categories.find(
    (item) => item.key === "leisure_entertainment",
  );

  assert.equal(food.count, 8);
  assert.equal(food.badgeText, "热卖");
  assert.equal(leisure.name, "休闲娱乐");
  assert.equal(leisure.routeType, "page");
  assert.equal(leisure.routeValue, "/custom");
});

test("consumer home categories append non-default remote entries", () => {
  const categories = buildHomeCategories([
    {
      key: "campus_services",
      name: "校园服务",
      routeType: "external",
      routeValue: "https://example.com",
      iconType: "image",
      icon: "https://cdn.example.com/icon.png",
      count: "3",
    },
  ]);

  const extra = categories.at(-1);

  assert.equal(extra.key, "campus_services");
  assert.equal(extra.name, "校园服务");
  assert.equal(extra.image, "https://cdn.example.com/icon.png");
  assert.equal(extra.count, 3);
});
