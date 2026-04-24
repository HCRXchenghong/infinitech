import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { collectCommittedSecretIssues } from "./check-committed-secrets.mjs";
import {
  runBackendAuditProject,
  resolveBackendAuditProjectState,
  summarizeAuditMetadata,
  summarizeManifestDependencyCounts,
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

test("committed secret scanner skips tracked files missing from the working tree", () => {
  const issues = collectCommittedSecretIssues(
    ["rider-app/pages/service/service-data-methods.ts", "README.md"],
    {
      resolveFileBuffer(relativePath) {
        if (relativePath === "README.md") {
          return Buffer.from("workspace cleanup is in progress", "utf8");
        }

        const error = new Error("missing file");
        error.code = "ENOENT";
        throw error;
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

test("backend audit dependency summary normalizes missing manifest fields", () => {
  assert.deepEqual(summarizeManifestDependencyCounts({}), {
    dependencies: 0,
    devDependencies: 0,
    optionalDependencies: 0,
    total: 0,
  });
  assert.deepEqual(
    summarizeManifestDependencyCounts({
      dependencies: {
        express: "^4.21.0",
      },
      devDependencies: {
        jest: "^29.7.0",
      },
    }),
    {
      dependencies: 1,
      devDependencies: 1,
      optionalDependencies: 0,
      total: 2,
    },
  );
});

test("backend audit runner skips projects without external dependencies", () => {
  const result = runBackendAuditProject({
    name: "backend/bank-payout-sidecar",
    path: "backend/bank-payout-sidecar",
  });

  assert.deepEqual(result, {
    name: "backend/bank-payout-sidecar",
    path: "backend/bank-payout-sidecar",
    skipped: true,
    reason: "no external dependencies",
  });
});

test("backend audit runner rejects dependency manifests without package lock", () => {
  const tempDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-backend-audit-project-"),
  );
  const relativePath = path.relative(process.cwd(), tempDir);

  try {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-backend-audit-project",
          private: true,
          dependencies: {
            express: "^4.21.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    assert.throws(
      () =>
        runBackendAuditProject({
          name: "tmp-backend-audit-project",
          path: relativePath,
        }),
      /package-lock\.json is required/,
    );

    assert.deepEqual(
      resolveBackendAuditProjectState({
        name: "tmp-backend-audit-project",
        path: relativePath,
      }).dependencyCounts,
      {
        dependencies: 1,
        devDependencies: 0,
        optionalDependencies: 0,
        total: 1,
      },
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
