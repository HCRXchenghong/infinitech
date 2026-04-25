import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  HTTP_ENVELOPE_CODES,
  HTTP_STATUS_ERROR_CODE_OVERRIDES,
} from "../../packages/contracts/src/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const GO_APIRESPONSE_PATH = path.join(
  REPO_ROOT,
  "backend/go/internal/apiresponse/envelope.go",
);
export const REQUIRED_GO_STATUS_CASES = Object.freeze([
  ["http.StatusBadRequest", "CodeInvalidArgument"],
  ["http.StatusUnauthorized", "CodeUnauthorized"],
  ["http.StatusForbidden", "CodeForbidden"],
  ["http.StatusNotFound", "CodeNotFound"],
  ["http.StatusMethodNotAllowed", "CodeMethodNotAllowed"],
  ["http.StatusConflict", "CodeConflict"],
  ["http.StatusGone", "CodeGone"],
  ["http.StatusRequestEntityTooLarge", "CodePayloadTooLarge"],
  ["http.StatusTooManyRequests", "CodeTooManyRequests"],
  ["http.StatusBadGateway", "CodeUpstreamUnavailable"],
  ["http.StatusServiceUnavailable", "CodeUpstreamUnavailable"],
  ["http.StatusGatewayTimeout", "CodeUpstreamTimeout"],
]);

export function extractGoEnvelopeCodeConstants(source = "") {
  const constants = new Map();
  const matcher = /^\s*(Code[A-Za-z0-9]+)\s*=\s*"([^"]+)"/gm;
  let match = matcher.exec(source);
  while (match) {
    constants.set(match[1], match[2]);
    match = matcher.exec(source);
  }
  return constants;
}

export function findGoContractDrift(source = "") {
  const constants = extractGoEnvelopeCodeConstants(source);
  const failures = [];
  const jsCodes = new Set(HTTP_ENVELOPE_CODES);
  const goCodes = new Set(constants.values());

  for (const code of jsCodes) {
    if (!goCodes.has(code)) {
      failures.push(`go apiresponse is missing shared envelope code: ${code}`);
    }
  }

  for (const code of goCodes) {
    if (!jsCodes.has(code)) {
      failures.push(`go apiresponse defines extra envelope code not present in contracts: ${code}`);
    }
  }

  for (const [statusToken, codeToken] of REQUIRED_GO_STATUS_CASES) {
    const casePattern = new RegExp(`${statusToken}[\\s\\S]*?return ${codeToken}`);
    if (!casePattern.test(source)) {
      failures.push(`go NormalizeCode is missing mapping ${statusToken} -> ${codeToken}`);
    }
  }

  for (const [status, code] of Object.entries(HTTP_STATUS_ERROR_CODE_OVERRIDES)) {
    if (Number(status) === 200) {
      continue;
    }
    if (!Array.from(constants.values()).includes(code)) {
      failures.push(`shared status override ${status} -> ${code} is not exported by go apiresponse`);
    }
  }

  return failures;
}

export async function assertGoHttpContractDrift(options = {}) {
  const source = typeof options.source === "string"
    ? options.source
    : await readFile(options.filePath || GO_APIRESPONSE_PATH, "utf8");
  const failures = findGoContractDrift(source);
  if (failures.length > 0) {
    throw new Error(
      [
        "go/http contract drift detected:",
        ...failures.map((failure) => `- ${failure}`),
        "请让 backend/go/internal/apiresponse 与 packages/contracts/src/http.js 保持同一套外部错误码语义。",
      ].join("\n"),
    );
  }
  return {
    codeCount: HTTP_ENVELOPE_CODES.length,
  };
}

async function main() {
  const result = await assertGoHttpContractDrift();
  console.log(`go/http contract drift check passed (${result.codeCount} shared codes verified)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
