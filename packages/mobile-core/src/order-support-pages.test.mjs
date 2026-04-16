import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSUMER_HOME_TAB_URL,
  CONSUMER_ORDER_LIST_TAB_URL,
  createDefaultConsumerOrderTablewareOptions,
  DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH,
  normalizeConsumerOrderRemark,
  normalizeConsumerOrderTableware,
} from "./order-support-pages.js";

test("order support page helpers normalize remark length and routes", () => {
  assert.equal(
    normalizeConsumerOrderRemark("a".repeat(250)).length,
    DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH,
  );
  assert.equal(CONSUMER_ORDER_LIST_TAB_URL, "/pages/order/list/index");
  assert.equal(CONSUMER_HOME_TAB_URL, "/pages/index/index");
});

test("order support page helpers keep tableware options and value normalization stable", () => {
  const options = createDefaultConsumerOrderTablewareOptions();
  assert.equal(Array.isArray(options), true);
  assert.notEqual(options[0], createDefaultConsumerOrderTablewareOptions()[0]);
  assert.equal(normalizeConsumerOrderTableware(2), 2);
  assert.equal(normalizeConsumerOrderTableware("3"), 3);
  assert.equal(normalizeConsumerOrderTableware(99), 0);
});
