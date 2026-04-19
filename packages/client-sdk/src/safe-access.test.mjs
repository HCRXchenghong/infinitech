import test from "node:test";
import assert from "node:assert/strict";

import {
  hasOwn,
  pickFirstDefined,
  readStringValue,
  readValue,
  resolveEventValue,
} from "./safe-access.js";

test("safe access helpers read nested values and preserve falsey payloads", () => {
  const payload = {
    data: {
      count: 0,
      enabled: false,
      message: "  hello  ",
    },
  };

  assert.equal(hasOwn(payload.data, "count"), true);
  assert.equal(readValue(payload, ["data", "count"], 1), 0);
  assert.equal(readValue(payload, ["data", "enabled"], true), false);
  assert.equal(readValue(payload, ["data", "missing"], "fallback"), "fallback");
  assert.equal(readStringValue(payload, ["data", "message"], "fallback"), "hello");
});

test("safe access helpers pick first defined values and resolve event payloads", () => {
  assert.equal(pickFirstDefined(undefined, null, 0, 1), 0);
  assert.equal(pickFirstDefined(undefined, null, "value"), "value");
  assert.equal(resolveEventValue({ detail: { value: "selected" } }, "fallback"), "selected");
  assert.equal(resolveEventValue({}, "fallback"), "fallback");
});
