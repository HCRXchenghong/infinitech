import test from "node:test";
import assert from "node:assert/strict";

import {
  extractGoEnvelopeCodeConstants,
  findGoContractDrift,
} from "./check-http-contract-drift.mjs";

const VALID_SOURCE = `package apiresponse

const (
  CodeOK                  = "OK"
  CodeInvalidArgument     = "INVALID_ARGUMENT"
  CodeUnauthorized        = "UNAUTHORIZED"
  CodeForbidden           = "FORBIDDEN"
  CodeNotFound            = "NOT_FOUND"
  CodeMethodNotAllowed    = "METHOD_NOT_ALLOWED"
  CodeConflict            = "CONFLICT"
  CodeGone                = "GONE"
  CodePayloadTooLarge     = "PAYLOAD_TOO_LARGE"
  CodeTooManyRequests     = "TOO_MANY_REQUESTS"
  CodeUpstreamUnavailable = "UPSTREAM_UNAVAILABLE"
  CodeUpstreamTimeout     = "UPSTREAM_TIMEOUT"
  CodeInternalError       = "INTERNAL_ERROR"
  CodeRequestFailed       = "REQUEST_FAILED"
)

func NormalizeCode(code string, status int) string {
  switch status {
  case http.StatusBadRequest:
    return CodeInvalidArgument
  case http.StatusUnauthorized:
    return CodeUnauthorized
  case http.StatusForbidden:
    return CodeForbidden
  case http.StatusNotFound:
    return CodeNotFound
  case http.StatusMethodNotAllowed:
    return CodeMethodNotAllowed
  case http.StatusConflict:
    return CodeConflict
  case http.StatusGone:
    return CodeGone
  case http.StatusRequestEntityTooLarge:
    return CodePayloadTooLarge
  case http.StatusTooManyRequests:
    return CodeTooManyRequests
  case http.StatusBadGateway:
    return CodeUpstreamUnavailable
  case http.StatusServiceUnavailable:
    return CodeUpstreamUnavailable
  case http.StatusGatewayTimeout:
    return CodeUpstreamTimeout
  default:
    return CodeRequestFailed
  }
}
`;

test("extractGoEnvelopeCodeConstants reads exported code constants", () => {
  const constants = extractGoEnvelopeCodeConstants(VALID_SOURCE);
  assert.equal(constants.get("CodeTooManyRequests"), "TOO_MANY_REQUESTS");
  assert.equal(constants.get("CodeMethodNotAllowed"), "METHOD_NOT_ALLOWED");
});

test("findGoContractDrift passes aligned sources and flags missing mappings", () => {
  assert.deepEqual(findGoContractDrift(VALID_SOURCE), []);

  const failures = findGoContractDrift(
    VALID_SOURCE
      .replace('CodeUpstreamTimeout     = "UPSTREAM_TIMEOUT"\n', "")
      .replace("case http.StatusGatewayTimeout:\n    return CodeUpstreamTimeout\n", ""),
  );
  assert.ok(failures.some((failure) => /UPSTREAM_TIMEOUT/.test(failure)));
  assert.ok(failures.some((failure) => /GatewayTimeout/.test(failure)));
});
