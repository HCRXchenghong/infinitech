import test from "node:test";
import assert from "node:assert/strict";

import {
  UPLOAD_DOMAINS,
  isUploadDomain,
  normalizeUploadDomain,
} from "./upload.js";

test("upload domains expose shared normalized values", () => {
  assert.equal(UPLOAD_DOMAINS.AFTER_SALES_EVIDENCE, "after_sales_evidence");
  assert.equal(UPLOAD_DOMAINS.CHAT_ATTACHMENT, "chat_attachment");
  assert.equal(UPLOAD_DOMAINS.APP_PACKAGE, "app_package");
  assert.equal(UPLOAD_DOMAINS.ADMIN_ASSET, "admin_asset");
});

test("upload domain normalization trims and lowercases supported values", () => {
  assert.equal(
    normalizeUploadDomain("  PROFILE_IMAGE  "),
    UPLOAD_DOMAINS.PROFILE_IMAGE,
  );
  assert.equal(
    normalizeUploadDomain("", UPLOAD_DOMAINS.REVIEW_MEDIA),
    UPLOAD_DOMAINS.REVIEW_MEDIA,
  );
});

test("upload domain helpers reject unsupported values", () => {
  assert.equal(isUploadDomain("chat_attachment"), true);
  assert.equal(isUploadDomain("CHAT_ATTACHMENT"), true);
  assert.equal(isUploadDomain("unknown_domain"), false);
  assert.throws(
    () => normalizeUploadDomain("unknown_domain"),
    /Unsupported upload domain/,
  );
});
