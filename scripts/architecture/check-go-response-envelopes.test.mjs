import test from "node:test";
import assert from "node:assert/strict";

import {
  GO_RESPONSE_ENVELOPE_BLOCKED_PATTERNS,
  assertGoResponseEnvelopeUsage,
  findGoResponseEnvelopeViolations,
} from "./check-go-response-envelopes.mjs";

test("go response envelope checker ignores clean handler and middleware sources", async () => {
  const fileEntries = [
    {
      relativePath: "backend/go/internal/handler/example.go",
      source: `
        package handler
        func send(c *gin.Context) {
          respondEnvelope(c, 200, "OK", "loaded", nil, nil)
        }
      `,
    },
    {
      relativePath: "backend/go/internal/middleware/example.go",
      source: `
        package middleware
        func guard(c *gin.Context) {
          abortUnauthorized(c, "鉴权失败")
        }
      `,
    },
  ];

  const result = await assertGoResponseEnvelopeUsage({ fileEntries });
  assert.deepEqual(result, {
    scannedFileCount: 2,
    violationCount: 0,
  });
});

test("go response envelope checker reports raw JSON and AbortWithStatusJSON usage", () => {
  const fileEntries = [
    {
      relativePath: "backend/go/internal/handler/example.go",
      source: `
        package handler
        func send(c *gin.Context) {
          c.JSON(200, gin.H{"ok": true})
        }
      `,
    },
    {
      relativePath: "backend/go/internal/middleware/example.go",
      source: `
        package middleware
        func guard(c *gin.Context) {
          c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
        }
      `,
    },
  ];

  const violations = findGoResponseEnvelopeViolations(fileEntries);
  assert.equal(violations.length, 2);
  assert.deepEqual(
    violations.map((item) => item.type),
    GO_RESPONSE_ENVELOPE_BLOCKED_PATTERNS.map((item) => item.type),
  );
  assert.deepEqual(
    violations.map((item) => item.line),
    [4, 4],
  );
});

test("go response envelope checker rejects violations with actionable error copy", async () => {
  const fileEntries = [
    {
      relativePath: "backend/go/internal/middleware/bad.go",
      source: `
        package middleware
        func guard(ctx *gin.Context) {
          ctx.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
        }
      `,
    },
  ];

  await assert.rejects(
    () => assertGoResponseEnvelopeUsage({ fileEntries }),
    (error) => {
      assert.match(error.message, /go response envelope violations detected/);
      assert.match(error.message, /backend\/go\/internal\/middleware\/bad.go:4/);
      assert.match(error.message, /Context\.AbortWithStatusJSON/);
      assert.match(error.message, /共享 envelope helper/);
      return true;
    },
  );
});
