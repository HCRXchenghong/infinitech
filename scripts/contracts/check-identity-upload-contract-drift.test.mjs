import test from "node:test";
import assert from "node:assert/strict";

import {
  extractGoStringConstants,
  extractGoStringSlice,
  findIdentityContractDrift,
  findUploadContractDrift,
} from "./check-identity-upload-contract-drift.mjs";

const VALID_GO_IDENTITY_SOURCE = `package service

const (
  tokenKindAccess = "access"
  tokenKindRefresh = "refresh"
  principalTypeUser = "user"
  principalTypeMerchant = "merchant"
  principalTypeRider = "rider"
  principalTypeAdmin = "admin"
)

var unifiedSessionClaimKeys = []string{
  "sub",
  "principal_type",
  "principal_id",
  "role",
  "session_id",
  "scope",
  "exp",
  "iat",
}
`;

const VALID_BFF_IDENTITY_SOURCE = `const {
  extractUnifiedPrincipalIdentity,
  isUnifiedSessionClaimsShape,
  normalizeBearerToken,
  parseUnifiedTokenPayload,
} = require("../../../../packages/contracts/src/identity.cjs");

function extractPayloadIdentity(payload) {
  return extractUnifiedPrincipalIdentity(payload, {
    allowLegacyFallback: !isUnifiedSessionClaimsShape(payload),
  });
}
`;

const VALID_GO_UPLOAD_HANDLER_SOURCE = `package handler

const (
  uploadDomainAfterSalesEvidence = "after_sales_evidence"
  uploadDomainProfileImage = "profile_image"
  uploadDomainChatAttachment = "chat_attachment"
  uploadDomainShopMedia = "shop_media"
  uploadDomainReviewMedia = "review_media"
  uploadDomainServiceSound = "service_sound"
  uploadDomainAppDownloadQR = "app_download_qr"
  uploadDomainAppPackage = "app_package"
  uploadDomainMerchantDocument = "merchant_document"
  uploadDomainMedicalDocument = "medical_document"
  uploadDomainOnboardingDocument = "onboarding_document"
  uploadDomainAdminAsset = "admin_asset"
)
`;

const VALID_GO_UPLOAD_ASSET_SOURCE = `package uploadasset

const (
  DomainMerchantDocument = "merchant_document"
  DomainMedicalDocument = "medical_document"
  DomainOnboardingDocument = "onboarding_document"
)
`;

const VALID_BFF_UPLOAD_CONTROLLER_SOURCE = `module.exports = {
  path: "/upload",
  forwardFields: ["upload_domain"],
};
`;

test("extractGoStringConstants and extractGoStringSlice read contract literals", () => {
  const constants = extractGoStringConstants(VALID_GO_UPLOAD_HANDLER_SOURCE, {
    namePattern: /^uploadDomain[A-Z]/,
  });
  assert.equal(constants.get("uploadDomainOnboardingDocument"), "onboarding_document");
  assert.deepEqual(extractGoStringSlice(VALID_GO_IDENTITY_SOURCE, "unifiedSessionClaimKeys"), [
    "exp",
    "iat",
    "principal_id",
    "principal_type",
    "role",
    "scope",
    "session_id",
    "sub",
  ]);
});

test("findIdentityContractDrift passes aligned fixtures and flags contract drift", () => {
  assert.deepEqual(
    findIdentityContractDrift({
      goSource: VALID_GO_IDENTITY_SOURCE,
      bffSource: VALID_BFF_IDENTITY_SOURCE,
    }),
    [],
  );

  const failures = findIdentityContractDrift({
    goSource: VALID_GO_IDENTITY_SOURCE.replace('principalTypeAdmin = "admin"\n', ""),
    bffSource: VALID_BFF_IDENTITY_SOURCE.replace("normalizeBearerToken,\n", ""),
  });
  assert.ok(failures.some((failure) => /principal types/.test(failure)));
  assert.ok(failures.some((failure) => /normalizeBearerToken/.test(failure)));
});

test("findUploadContractDrift passes aligned fixtures and flags upload domain drift", () => {
  assert.deepEqual(
    findUploadContractDrift({
      goHandlerSource: VALID_GO_UPLOAD_HANDLER_SOURCE,
      goAssetSource: VALID_GO_UPLOAD_ASSET_SOURCE,
      bffUploadControllerSource: VALID_BFF_UPLOAD_CONTROLLER_SOURCE,
    }),
    [],
  );

  const failures = findUploadContractDrift({
    goHandlerSource: VALID_GO_UPLOAD_HANDLER_SOURCE.replace(
      '  uploadDomainOnboardingDocument = "onboarding_document"\n',
      "",
    ),
    goAssetSource: VALID_GO_UPLOAD_ASSET_SOURCE.replace(
      '  DomainOnboardingDocument = "onboarding_document"\n',
      "",
    ),
    bffUploadControllerSource: VALID_BFF_UPLOAD_CONTROLLER_SOURCE.replace("upload_domain", "file"),
  });
  assert.ok(failures.some((failure) => /onboarding_document/.test(failure)));
  assert.ok(failures.some((failure) => /upload_domain/.test(failure)));
});
