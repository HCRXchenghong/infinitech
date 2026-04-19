import test from "node:test";
import assert from "node:assert/strict";

import { isHtmlDocumentPayload, normalizeErrorMessage } from "./error-utils.js";

test("error utils normalize nested error messages with stable fallback priority", () => {
  assert.equal(
    normalizeErrorMessage({
      data: {
        error: "  下单失败  ",
        message: "忽略这个",
      },
    }),
    "下单失败",
  );
  assert.equal(
    normalizeErrorMessage({
      errMsg: "  网络异常  ",
    }),
    "网络异常",
  );
  assert.equal(normalizeErrorMessage({}, "自定义兜底"), "自定义兜底");
});

test("error utils detect html fallback payloads", () => {
  assert.equal(isHtmlDocumentPayload("<!DOCTYPE html><html></html>"), true);
  assert.equal(isHtmlDocumentPayload("{\"ok\":true}"), false);
});
