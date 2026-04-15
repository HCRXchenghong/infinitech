import test from "node:test";
import assert from "node:assert/strict";

import {
  extractEnvelopeCode,
  extractEnvelopeData,
  extractEnvelopeMessage,
  extractEnvelopeRequestId,
  extractPaginatedItems,
  extractTemporaryCredential,
  extractUploadAsset,
} from "./http.js";

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
});

test("extractTemporaryCredential supports standardized and legacy password payloads", () => {
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

  assert.deepEqual(
    extractTemporaryCredential({ newPassword: "LegacyPass456!" }),
    {
      temporaryPassword: "LegacyPass456!",
      deliveryMode: "operator_receipt",
      subjectHint: "",
    },
  );
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
