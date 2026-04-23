import test from "node:test";
import assert from "node:assert/strict";

import { collectCommittedSecretIssues } from "./check-committed-secrets.mjs";
import {
  runBackendAuditProject,
  summarizeAuditMetadata,
} from "./verify-backend-audits.mjs";

test("committed secret scanner flags tracked runtime env files and private keys", () => {
  const issues = collectCommittedSecretIssues(
    [
      "backend/bff/.env",
      "docs/id_rsa",
      "backend/bff/.env.example",
      "README.md",
    ],
    {
      resolveFileBuffer(relativePath) {
        if (relativePath === "README.md") {
          return Buffer.from("no secrets here", "utf8");
        }
        return Buffer.from("", "utf8");
      },
    },
  );

  assert.deepEqual(
    issues.map((issue) => `${issue.path}:${issue.reason}`),
    [
      "backend/bff/.env:tracked runtime env file",
      "docs/id_rsa:tracked private ssh key",
    ],
  );
});

test("committed secret scanner flags high-confidence secret content", () => {
  const issues = collectCommittedSecretIssues(
    ["README.md", "docs/example.txt"],
    {
      resolveFileBuffer(relativePath) {
        if (relativePath === "README.md") {
          return Buffer.from(
            ["token=", "ghp_", "abcdefghijklmnopqrstuvwxyz1234567890"].join(""),
            "utf8",
          );
        }
        return Buffer.from("-----BEGIN PRIVATE KEY-----", "utf8");
      },
    },
  );

  assert.deepEqual(
    issues.map((issue) => issue.reason),
    ["GitHub personal access token", "private key material"],
  );
});

test("committed secret scanner ignores example and test private key placeholders", () => {
  const issues = collectCommittedSecretIssues(
    [
      "backend/go/.env.example",
      "backend/go/internal/config/config_test.go",
      "backend/go/internal/service/mobile_push_service_status_test.go",
    ],
    {
      resolveFileBuffer() {
        return Buffer.from("-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----", "utf8");
      },
    },
  );

  assert.deepEqual(issues, []);
});

test("backend audit metadata summary normalizes missing counters", () => {
  assert.deepEqual(summarizeAuditMetadata({}), {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  });
  assert.deepEqual(
    summarizeAuditMetadata({
      metadata: {
        vulnerabilities: {
          high: 2,
          critical: 1,
          total: 3,
        },
      },
    }),
    {
      info: 0,
      low: 0,
      moderate: 0,
      high: 2,
      critical: 1,
      total: 3,
    },
  );
});

test("backend audit runner skips projects without package lock", () => {
  const result = runBackendAuditProject({
    name: "backend/bank-payout-sidecar",
    path: "backend/bank-payout-sidecar",
  });

  assert.deepEqual(result, {
    name: "backend/bank-payout-sidecar",
    path: "backend/bank-payout-sidecar",
    skipped: true,
    reason: "missing package-lock.json",
  });
});
