import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import {
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
  extractEnvelopeCode,
  extractEnvelopeData,
  extractEnvelopeMessage,
  extractEnvelopeRequestId,
  extractPaginatedItems,
  extractSMSResult,
  extractTemporaryCredential,
  extractUploadAsset,
  normalizeErrorCode,
} from "./http.js";

const require = createRequire(import.meta.url);
const cjsHttp = require("./http.cjs");

test("extractEnvelopeData prefers explicit data envelope", () => {
  assert.deepEqual(extractEnvelopeData({ data: { ok: true } }), { ok: true });
  assert.equal(extractEnvelopeData({ data: "" }), "");
});

test("extract envelope meta reads standardized request fields", () => {
  const payload = {
    request_id: "req-123",
    code: "INVITE_CREATED",
    message: "邀请链接创建成功",
  };
  assert.equal(extractEnvelopeRequestId(payload), "req-123");
  assert.equal(extractEnvelopeCode(payload), "INVITE_CREATED");
  assert.equal(extractEnvelopeMessage(payload), "邀请链接创建成功");
});

test("http contracts build standardized success and error envelopes", () => {
  const request = {
    requestId: "req-http-1",
    headers: {
      "x-request-id": "req-http-header",
    },
  };

  assert.deepEqual(
    buildSuccessEnvelopePayload(request, "操作成功", { ok: true }, {
      legacy: { status: "ok" },
    }),
    {
      request_id: "req-http-1",
      code: "OK",
      message: "操作成功",
      data: { ok: true },
      success: true,
      status: "ok",
    },
  );

  assert.deepEqual(
    buildErrorEnvelopePayload(request, 429, "请求过于频繁", {
      data: { retry_after: 60 },
      legacy: { status: "rate_limited" },
    }),
    {
      request_id: "req-http-1",
      code: "TOO_MANY_REQUESTS",
      message: "请求过于频繁",
      data: { retry_after: 60 },
      success: false,
      error: "请求过于频繁",
      status: "rate_limited",
    },
  );

  assert.equal(normalizeErrorCode(503), "UPSTREAM_UNAVAILABLE");
});

test("extractPaginatedItems supports enveloped and legacy list payloads", () => {
  assert.deepEqual(
    extractPaginatedItems({
      data: {
        items: [{ id: 1 }],
        total: 1,
        page: 2,
        limit: 20,
      },
    }),
    {
      items: [{ id: 1 }],
      total: 1,
      page: 2,
      limit: 20,
    },
  );

  assert.deepEqual(
    extractPaginatedItems({
      records: [{ id: 2 }],
      total: 3,
    }),
    {
      items: [{ id: 2 }],
      total: 3,
      page: 0,
      limit: 0,
    },
  );

  assert.deepEqual(
    extractPaginatedItems({
      data: {
        items: [{ id: 3 }],
        pagination: {
          total: 9,
          page: 4,
          limit: 15,
        },
      },
    }),
    {
      items: [{ id: 3 }],
      total: 9,
      page: 4,
      limit: 15,
    },
  );

  assert.deepEqual(
    extractPaginatedItems({
      list: [{ id: 4 }],
      total: 8,
      page: 3,
      pageSize: 25,
    }),
    {
      items: [{ id: 4 }],
      total: 8,
      page: 3,
      limit: 25,
    },
  );
});

test("extractTemporaryCredential only reads standardized temporary credential payloads", () => {
  assert.deepEqual(
    extractTemporaryCredential({
      data: {
        temporaryCredential: {
          temporaryPassword: "TempPass123!",
          deliveryMode: "operator_receipt",
        },
      },
    }),
    {
      temporaryPassword: "TempPass123!",
      deliveryMode: "operator_receipt",
      subjectHint: "",
    },
  );

  assert.equal(extractTemporaryCredential({ newPassword: "LegacyPass456!" }), null);
});

test("extractUploadAsset reads standardized asset payloads", () => {
  assert.deepEqual(
    extractUploadAsset({
      data: {
        asset_id: "asset_1",
        asset_url: "https://cdn.example.com/file.png",
        filename: "file.png",
      },
    }),
    {
      asset_id: "asset_1",
      asset_url: "https://cdn.example.com/file.png",
      filename: "file.png",
      url: "https://cdn.example.com/file.png",
    },
  );
});

test("extractSMSResult preserves sms debug code from enveloped payloads", () => {
  assert.deepEqual(
    extractSMSResult({
      request_id: "req_sms_1",
      code: "OK",
      message: "验证码已发送",
      success: true,
      data: {
        success: true,
        message: "验证码已发送",
        code: "123456",
        needCaptcha: false,
        sessionId: "session_1",
      },
    }),
    {
      request_id: "req_sms_1",
      code: "123456",
      message: "验证码已发送",
      success: true,
      data: {
        success: true,
        message: "验证码已发送",
        code: "123456",
        needCaptcha: false,
        sessionId: "session_1",
      },
      error: "",
      needCaptcha: false,
      sessionId: "session_1",
      smsCode: "123456",
    },
  );
});

test("http contracts keep CommonJS bridge aligned with ESM helpers", () => {
  const source = { requestId: "req-http-2" };
  assert.deepEqual(
    cjsHttp.buildSuccessEnvelopePayload(source, "ok", { id: 1 }),
    buildSuccessEnvelopePayload(source, "ok", { id: 1 }),
  );
  assert.deepEqual(
    cjsHttp.buildErrorEnvelopePayload(source, 404, "not found"),
    buildErrorEnvelopePayload(source, 404, "not found"),
  );
});
