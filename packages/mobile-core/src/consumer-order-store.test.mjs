import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerOrderStore,
  createDefaultConsumerOrderStoreState,
} from "./consumer-order-store.js";

test("consumer order store exposes shared mutable state through useUserOrderStore", () => {
  const store = createConsumerOrderStore();

  assert.deepEqual(store.state, createDefaultConsumerOrderStoreState());

  const session = store.useUserOrderStore();
  session.setRemark("备注");
  session.setTableware(2);

  assert.deepEqual(store.state, {
    remark: "备注",
    tableware: 2,
  });
});

test("consumer order store supports initialization and reset", () => {
  const store = createConsumerOrderStore({
    remark: "初始备注",
    tableware: 1,
  });

  assert.deepEqual(store.state, {
    remark: "初始备注",
    tableware: 1,
  });

  store.reset();
  assert.deepEqual(store.state, createDefaultConsumerOrderStoreState());
});
