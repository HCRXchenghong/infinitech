import test from "node:test";
import assert from "node:assert/strict";

import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import {
  createAuthenticatedUploadOptions,
  uploadAuthenticatedAsset,
} from "./upload.js";

test("createAuthenticatedUploadOptions injects upload domain into form data", () => {
  const options = createAuthenticatedUploadOptions({
    baseUrl: "https://api.example.com/",
    token: "token-123",
    filePath: "/tmp/demo.png",
    uploadDomain: UPLOAD_DOMAINS.PROFILE_IMAGE,
    formData: { scene: "avatar" },
  });

  assert.equal(options.url, "https://api.example.com/api/upload");
  assert.equal(options.formData.scene, "avatar");
  assert.equal(options.formData.upload_domain, UPLOAD_DOMAINS.PROFILE_IMAGE);
  assert.equal(options.header.Authorization, "Bearer token-123");
});

test("uploadAuthenticatedAsset rejects unsupported upload domains before request dispatch", () => {
  let called = false;
  const uniApp = {
    uploadFile() {
      called = true;
    },
  };

  assert.throws(
    () =>
      uploadAuthenticatedAsset({
        uniApp,
        baseUrl: "https://api.example.com",
        filePath: "/tmp/demo.png",
        uploadDomain: "unknown_domain",
      }),
    /Unsupported upload domain/,
  );

  assert.equal(called, false);
});

test("uploadAuthenticatedAsset forwards normalized upload domain and merged payload", async () => {
  const uniApp = {
    uploadFile(options) {
      assert.equal(options.formData.upload_domain, UPLOAD_DOMAINS.CHAT_ATTACHMENT);
      assert.equal(options.formData.room_id, "room-1");
      options.success({
        statusCode: 200,
        data: JSON.stringify({
          data: {
            asset_url: "/uploads/chat_attachment/demo.png",
          },
        }),
      });
    },
  };

  const payload = await uploadAuthenticatedAsset({
    uniApp,
    baseUrl: "https://api.example.com",
    filePath: "/tmp/demo.png",
    uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
    formData: { room_id: "room-1" },
  });

  assert.equal(
    payload.url,
    "https://api.example.com/uploads/chat_attachment/demo.png",
  );
  assert.equal(
    payload.asset_url,
    "https://api.example.com/uploads/chat_attachment/demo.png",
  );
});
