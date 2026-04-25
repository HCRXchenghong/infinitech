import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  PrincipalTypes,
  UnifiedSessionClaimKeys,
  UnifiedTokenKinds,
} from "../../packages/contracts/src/identity.js";
import { UPLOAD_DOMAINS } from "../../packages/contracts/src/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const GO_TOKEN_CLAIMS_PATH = path.join(
  REPO_ROOT,
  "backend/go/internal/service/token_claims.go",
);
export const GO_UPLOAD_HANDLER_PATH = path.join(
  REPO_ROOT,
  "backend/go/internal/handler/file_upload_handler.go",
);
export const GO_UPLOAD_ASSET_PATH = path.join(
  REPO_ROOT,
  "backend/go/internal/uploadasset/uploadasset.go",
);
export const BFF_AUTH_IDENTITY_PATH = path.join(
  REPO_ROOT,
  "backend/bff/src/utils/authIdentity.js",
);
export const BFF_UPLOAD_CONTROLLER_PATH = path.join(
  REPO_ROOT,
  "backend/bff/src/controllers/uploadController.js",
);

function normalizeValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort();
}

export function extractGoStringConstants(source = "", options = {}) {
  const matcher = /^\s*([A-Za-z0-9_]+)\s*=\s*"([^"]+)"/gm;
  const constants = new Map();
  let match = matcher.exec(source);
  while (match) {
    const name = String(match[1] || "").trim();
    const value = String(match[2] || "").trim();
    if (!options.namePattern || options.namePattern.test(name)) {
      constants.set(name, value);
    }
    match = matcher.exec(source);
  }
  return constants;
}

export function extractGoStringSlice(source = "", variableName = "") {
  const matcher = new RegExp(
    `(?:var\\s+)?${variableName}\\s*=\\s*\\[\\]string\\s*\\{([\\s\\S]*?)\\}`,
    "m",
  );
  const match = source.match(matcher);
  if (!match) {
    return [];
  }
  return normalizeValues(Array.from(match[1].matchAll(/"([^"]+)"/g)).map((item) => item[1]));
}

function findMissingOrExtraValues(expectedValues, actualValues, label, failures) {
  const expected = new Set(normalizeValues(expectedValues));
  const actual = new Set(normalizeValues(actualValues));

  for (const value of expected) {
    if (!actual.has(value)) {
      failures.push(`${label} is missing shared value: ${value}`);
    }
  }
  for (const value of actual) {
    if (!expected.has(value)) {
      failures.push(`${label} defines extra value not present in contracts: ${value}`);
    }
  }
}

export function findIdentityContractDrift({ goSource = "", bffSource = "" } = {}) {
  const failures = [];
  const goPrincipalTypeValues = Array.from(
    extractGoStringConstants(goSource, { namePattern: /^principalType[A-Z]/ }).values(),
  );
  const goTokenKindValues = Array.from(
    extractGoStringConstants(goSource, { namePattern: /^tokenKind[A-Z]/ }).values(),
  );
  const goClaimKeys = extractGoStringSlice(goSource, "unifiedSessionClaimKeys");

  findMissingOrExtraValues(
    Object.values(PrincipalTypes),
    goPrincipalTypeValues,
    "go token claims principal types",
    failures,
  );
  findMissingOrExtraValues(
    Object.values(UnifiedTokenKinds),
    goTokenKindValues,
    "go token claims token kinds",
    failures,
  );
  findMissingOrExtraValues(
    UnifiedSessionClaimKeys,
    goClaimKeys,
    "go token claims required session keys",
    failures,
  );

  if (!/packages\/contracts\/src\/identity\.cjs/.test(bffSource)) {
    failures.push("bff auth identity helper is not wired to packages/contracts/src/identity.cjs");
  }
  for (const requiredToken of [
    "extractUnifiedPrincipalIdentity",
    "isUnifiedSessionClaimsShape",
    "normalizeBearerToken",
    "parseUnifiedTokenPayload",
  ]) {
    if (!new RegExp(`\\b${requiredToken}\\b`).test(bffSource)) {
      failures.push(`bff auth identity helper is missing shared identity import: ${requiredToken}`);
    }
  }
  if (!/allowLegacyFallback:\s*!isUnifiedSessionClaimsShape\(payload\)/.test(bffSource)) {
    failures.push("bff auth identity helper no longer derives legacy fallback from shared claim shape");
  }

  return failures;
}

export function findUploadContractDrift({
  goHandlerSource = "",
  goAssetSource = "",
  bffUploadControllerSource = "",
} = {}) {
  const failures = [];
  const goUploadDomainValues = Array.from(
    extractGoStringConstants(goHandlerSource, { namePattern: /^uploadDomain[A-Z]/ }).values(),
  );
  const goPrivateUploadDomains = Array.from(
    extractGoStringConstants(goAssetSource, { namePattern: /^Domain[A-Z]/ }).values(),
  );

  findMissingOrExtraValues(
    Object.values(UPLOAD_DOMAINS),
    goUploadDomainValues,
    "go upload domain policy",
    failures,
  );

  for (const domain of normalizeValues(goPrivateUploadDomains)) {
    if (!Object.values(UPLOAD_DOMAINS).includes(domain)) {
      failures.push(`go private upload domain is missing from shared contracts: ${domain}`);
    }
  }

  if (!/forwardFields:\s*\[\s*["']upload_domain["']\s*\]/.test(bffUploadControllerSource)) {
    failures.push("bff upload controller must keep forwarding upload_domain to the Go upload endpoint");
  }

  return failures;
}

export async function assertIdentityUploadContractDrift(options = {}) {
  const [
    goSource,
    goUploadHandlerSource,
    goAssetSource,
    bffSource,
    bffUploadControllerSource,
  ] = await Promise.all([
    typeof options.goSource === "string"
      ? options.goSource
      : readFile(options.goFilePath || GO_TOKEN_CLAIMS_PATH, "utf8"),
    typeof options.goUploadHandlerSource === "string"
      ? options.goUploadHandlerSource
      : readFile(options.goUploadHandlerFilePath || GO_UPLOAD_HANDLER_PATH, "utf8"),
    typeof options.goAssetSource === "string"
      ? options.goAssetSource
      : readFile(options.goAssetFilePath || GO_UPLOAD_ASSET_PATH, "utf8"),
    typeof options.bffSource === "string"
      ? options.bffSource
      : readFile(options.bffFilePath || BFF_AUTH_IDENTITY_PATH, "utf8"),
    typeof options.bffUploadControllerSource === "string"
      ? options.bffUploadControllerSource
      : readFile(options.bffUploadControllerFilePath || BFF_UPLOAD_CONTROLLER_PATH, "utf8"),
  ]);

  const failures = [
    ...findIdentityContractDrift({ goSource, bffSource }),
    ...findUploadContractDrift({
      goHandlerSource: goUploadHandlerSource,
      goAssetSource,
      bffUploadControllerSource,
    }),
  ];

  if (failures.length > 0) {
    throw new Error(
      [
        "identity/upload contract drift detected:",
        ...failures.map((failure) => `- ${failure}`),
        "请让 packages/contracts、Go 上传/鉴权实现和 BFF 契约适配层继续保持同一套 claims 与 upload domain 语义。",
      ].join("\n"),
    );
  }

  return {
    principalTypeCount: Object.values(PrincipalTypes).length,
    uploadDomainCount: Object.values(UPLOAD_DOMAINS).length,
  };
}

async function main() {
  const result = await assertIdentityUploadContractDrift();
  console.log(
    `identity/upload contract drift check passed (${result.principalTypeCount} principal types, ${result.uploadDomainCount} upload domains verified)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
