import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import {
  extractAuthVerifyResult,
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
  extractEnvelopeCode,
  extractEnvelopeData,
  extractEnvelopeMessage,
  extractEnvelopeRequestId,
  extractPaginatedItems,
  isProtectedUploadUrl,
  extractSMSResult,
  extractTemporaryCredential,
  extractUploadAsset,
  normalizeErrorCode,
  resolveUploadAssetUrl,
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
  assert.equal(normalizeErrorCode(405), "METHOD_NOT_ALLOWED");
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

  assert.deepEqual(
    extractUploadAsset({
      data: {
        assetId: "asset_legacy",
        imageUrl: "https://cdn.example.com/legacy.png",
      },
    }),
    {
      assetId: "asset_legacy",
      imageUrl: "https://cdn.example.com/legacy.png",
      asset_id: "asset_legacy",
      filename: "",
      url: "https://cdn.example.com/legacy.png",
    },
  );
});

test("resolveUploadAssetUrl prefers preview urls for private or protected assets", () => {
  assert.equal(
    resolveUploadAssetUrl({
      data: {
        access_policy: "private",
        asset_url: "/uploads/merchant_document/license.png",
        previewUrl: "/api/private-assets/preview?asset_id=private://document/merchant_document/merchant/18/license.png",
      },
    }),
    "/api/private-assets/preview?asset_id=private://document/merchant_document/merchant/18/license.png",
  );

  assert.equal(
    resolveUploadAssetUrl({
      data: {
        asset_url: "https://cdn.example.com/uploads/profile_image/avatar.png",
      },
    }),
    "https://cdn.example.com/uploads/profile_image/avatar.png",
  );

  assert.equal(
    resolveUploadAssetUrl({
      data: {
        image_url: "https://cdn.example.com/legacy-image.png",
      },
    }),
    "https://cdn.example.com/legacy-image.png",
  );

  assert.equal(
    resolveUploadAssetUrl("https://cdn.example.com/direct-string.png"),
    "https://cdn.example.com/direct-string.png",
  );

  assert.equal(isProtectedUploadUrl("/uploads/medical_document/rx.png"), true);
  assert.equal(isProtectedUploadUrl("/uploads/profile_image/avatar.png"), false);
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

test("extractAuthVerifyResult prefers standardized identity envelopes and falls back safely", () => {
  assert.deepEqual(
    extractAuthVerifyResult({
      request_id: "req_auth_1",
      code: "OK",
      message: "令牌校验成功",
      success: true,
      data: {
        valid: true,
        identity: {
          principalType: "user",
          principalId: "25072402000011",
          legacyId: "18",
          role: "customer",
          sessionId: "user_session_1",
          phone: "13800001001",
          scope: ["api", "principal:user"],
        },
      },
    }),
    {
      request_id: "req_auth_1",
      code: "OK",
      message: "令牌校验成功",
      valid: true,
      identity: {
        id: "25072402000011",
        principalId: "25072402000011",
        principalType: "user",
        legacyId: "18",
        userId: "18",
        phone: "13800001001",
        role: "customer",
        sessionId: "user_session_1",
        scope: ["api", "principal:user"],
        name: "",
      },
    },
  );

  assert.deepEqual(
    extractAuthVerifyResult({
      valid: true,
      userId: 21,
      id: "25072402000021",
      principalType: "user",
      role: "customer",
      sessionId: "legacy_verify_21",
    }),
    {
      request_id: "",
      code: "OK",
      message: "",
      valid: true,
      identity: {
        id: "25072402000021",
        principalId: "25072402000021",
        principalType: "user",
        legacyId: "21",
        userId: "21",
        phone: "",
        role: "customer",
        sessionId: "legacy_verify_21",
        scope: [],
        name: "",
      },
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
  assert.deepEqual(
    cjsHttp.extractAuthVerifyResult({
      data: {
        valid: true,
        identity: {
          principalType: "user",
          principalId: "user_uid_1",
          legacyId: "1",
        },
      },
    }),
    extractAuthVerifyResult({
      data: {
        valid: true,
        identity: {
          principalType: "user",
          principalId: "user_uid_1",
          legacyId: "1",
        },
      },
    }),
  );
});
