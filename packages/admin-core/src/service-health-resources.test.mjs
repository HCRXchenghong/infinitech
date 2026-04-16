import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultServiceHealthStatus,
  extractServiceHealthStatus,
  formatServiceHealthDetail,
  normalizeServiceHealthStatus,
  serviceHealthJourneyStatusLabel,
  serviceHealthOverallStatusLabel,
  serviceHealthStatusLabel,
  serviceHealthStatusTag,
} from "./service-health-resources.js";

test("normalizeServiceHealthStatus provides stable defaults", () => {
  assert.deepEqual(normalizeServiceHealthStatus(), {
    checkedAt: "",
    overall: "unknown",
    services: [],
    journeys: [],
  });

  assert.deepEqual(
    normalizeServiceHealthStatus({
      checked_at: "2026-04-16 10:00:00",
      overall: "degraded",
      services: [{ key: "go", status: "ok" }],
      journeys: [{ key: "payment", status: "ready" }],
    }),
    {
      checkedAt: "2026-04-16 10:00:00",
      overall: "degraded",
      services: [{ key: "go", status: "ok" }],
      journeys: [{ key: "payment", status: "ready" }],
    },
  );
});

test("extractServiceHealthStatus unwraps envelopes and named paths", () => {
  assert.deepEqual(
    extractServiceHealthStatus({
      data: {
        serviceStatus: {
          checkedAt: "2026-04-16 11:00:00",
          overall: "ok",
          services: [{ key: "socket", status: "up" }],
        },
      },
    }, { path: "serviceStatus" }),
    {
      checkedAt: "2026-04-16 11:00:00",
      overall: "ok",
      services: [{ key: "socket", status: "up" }],
      journeys: [],
    },
  );
});

test("service health labels keep status semantics aligned", () => {
  assert.equal(serviceHealthStatusTag("ok"), "success");
  assert.equal(serviceHealthStatusTag("degraded"), "warning");
  assert.equal(serviceHealthStatusLabel("down"), "异常");
  assert.equal(serviceHealthOverallStatusLabel("degraded"), "核心正常，存在降级");
  assert.equal(serviceHealthJourneyStatusLabel("error"), "阻断");
});

test("formatServiceHealthDetail compacts pipe-separated detail", () => {
  assert.equal(
    formatServiceHealthDetail("redis=ok | push=warning | queue=12 | latency=88ms | extra=skip"),
    "redis=ok，push=warning，queue=12，latency=88ms",
  );
  assert.equal(formatServiceHealthDetail(""), "暂未返回扩展说明");
  assert.deepEqual(createDefaultServiceHealthStatus(), {
    checkedAt: "",
    overall: "unknown",
    services: [],
    journeys: [],
  });
});
