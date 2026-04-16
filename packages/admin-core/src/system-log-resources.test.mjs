import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemLogClearPayload,
  buildSystemLogDeletePayload,
  buildSystemLogListQuery,
  createDefaultSystemLogSummary,
  createSystemLogFilters,
  createSystemLogPagination,
  createSystemLogVerifyForm,
  extractSystemLogPage,
  formatSystemLogAgeMs,
  formatSystemLogAgeSeconds,
  formatSystemLogMethodPath,
  formatSystemLogProbeType,
  formatSystemLogTime,
  getSystemLogActionTagType,
  getSystemLogClearSourceLabel,
  getSystemLogServiceSignals,
  normalizeSystemLogSignalValue,
  parseSystemLogServiceDetail,
  resolveSystemLogServiceSummary,
  resolveSystemLogSignalType,
  SYSTEM_LOG_ACTION_OPTIONS,
  SYSTEM_LOG_SOURCE_OPTIONS,
} from "./system-log-resources.js";

test("extractSystemLogPage unwraps enveloped system log payloads", () => {
  assert.deepEqual(
    extractSystemLogPage({
      data: {
        items: [{ id: "log-1", actionType: "create" }],
        pagination: {
          page: 2,
          limit: 50,
          total: 120,
        },
        summary: {
          create: 40,
          delete: 10,
          update: 30,
          read: 20,
          system: 15,
          error: 5,
        },
        serviceStatus: {
          checkedAt: "2026-04-16T00:00:00Z",
          overall: "healthy",
          services: [{ key: "go", status: "healthy" }],
        },
      },
    }),
    {
      items: [{ id: "log-1", actionType: "create" }],
      total: 120,
      page: 2,
      limit: 50,
      summary: {
        create: 40,
        delete: 10,
        update: 30,
        read: 20,
        system: 15,
        error: 5,
      },
      serviceStatus: {
        checkedAt: "2026-04-16T00:00:00Z",
        overall: "healthy",
        services: [{ key: "go", status: "healthy" }],
        journeys: [],
      },
      files: {},
      pagination: {
        total: 120,
        page: 2,
        limit: 50,
      },
    },
  );
});

test("extractSystemLogPage supports legacy root payloads and fills defaults", () => {
  assert.deepEqual(
    extractSystemLogPage({
      items: [{ id: "log-2", actionType: "error" }],
      total: 1,
      serviceStatus: {
        checked_at: "2026-04-16 08:00:00",
      },
      files: {
        goExists: true,
      },
    }),
    {
      items: [{ id: "log-2", actionType: "error" }],
      total: 1,
      page: 0,
      limit: 0,
      summary: {
        create: 0,
        delete: 0,
        update: 0,
        read: 0,
        system: 0,
        error: 0,
      },
      serviceStatus: {
        checkedAt: "2026-04-16 08:00:00",
        overall: "unknown",
        services: [],
        journeys: [],
      },
      files: {
        goExists: true,
      },
      pagination: {
        total: 1,
        page: 0,
        limit: 0,
      },
    },
  );
});

test("system log helpers keep filters, payloads and labels stable", () => {
  assert.equal(SYSTEM_LOG_SOURCE_OPTIONS.length, 3);
  assert.equal(SYSTEM_LOG_ACTION_OPTIONS.length, 7);
  assert.deepEqual(createDefaultSystemLogSummary(), {
    create: 0,
    delete: 0,
    update: 0,
    read: 0,
    system: 0,
    error: 0,
  });
  assert.deepEqual(createSystemLogFilters(), {
    source: "all",
    action: "all",
    keyword: "",
  });
  assert.deepEqual(createSystemLogPagination(), {
    page: 1,
    limit: 50,
    total: 0,
  });
  assert.deepEqual(createSystemLogVerifyForm(), {
    verifyAccount: "",
    verifyPassword: "",
  });
  assert.deepEqual(
    buildSystemLogListQuery(
      { source: "bff", action: "error", keyword: "  notify  " },
      { page: 2, limit: 20 },
    ),
    {
      page: 2,
      limit: 20,
      source: "bff",
      action: "error",
      keyword: "notify",
    },
  );
  assert.equal(getSystemLogClearSourceLabel("go"), "Go 来源");
  assert.equal(getSystemLogActionTagType("delete"), "danger");
  assert.equal(formatSystemLogProbeType("health"), "/health");
  assert.equal(formatSystemLogMethodPath({ method: "POST", path: "/api/a" }), "POST /api/a");
  assert.deepEqual(
    buildSystemLogDeletePayload(
      { source: "bff", raw: "raw-log" },
      { verifyAccount: " admin ", verifyPassword: " secret " },
    ),
    {
      source: "bff",
      raw: "raw-log",
      verifyAccount: "admin",
      verifyPassword: "secret",
    },
  );
  assert.deepEqual(
    buildSystemLogClearPayload("all", { verifyAccount: "root", verifyPassword: "pw" }),
    {
      source: "all",
      verifyAccount: "root",
      verifyPassword: "pw",
    },
  );
});

test("system log service detail helpers keep signal formatting stable", () => {
  assert.equal(formatSystemLogAgeSeconds(30), "30 秒");
  assert.equal(formatSystemLogAgeSeconds(61), "1 分钟");
  assert.equal(formatSystemLogAgeMs(3000), "3 秒");
  assert.equal(normalizeSystemLogSignalValue("redisConnected", "true"), "正常");
  assert.equal(resolveSystemLogSignalType("redisConnected", "false"), "danger");
  assert.equal(resolveSystemLogSignalType("pushFailed", "4"), "danger");
  assert.equal(
    formatSystemLogTime("2026-04-16T10:11:12Z").includes("10:11:12")
      || formatSystemLogTime("2026-04-16T10:11:12Z").includes("18:11:12"),
    true,
  );

  const parsed = parseSystemLogServiceDetail(
    "redisConnected=true|pushOldestQueuedAgeSeconds=120|pushLatestSentAt=2026-04-16T10:11:12Z|pushError=boom",
  );
  assert.deepEqual(parsed.map((item) => item.key), [
    "redisConnected",
    "pushOldestQueuedAgeSeconds",
    "pushLatestSentAt",
    "pushError",
  ]);
  assert.equal(parsed[0].value, "正常");
  assert.equal(parsed[1].value, "2 分钟");
  assert.equal(parsed[3].type, "danger");

  const signals = getSystemLogServiceSignals({
    detail: "status=up|redisConnected=true|pushError=boom",
  });
  assert.deepEqual(signals.map((item) => item.key), ["redisConnected", "pushError"]);
  assert.equal(
    resolveSystemLogServiceSummary({
      detail: "redisConnected=true|pushError=boom",
    }),
    "Redis 连接：正常，推送错误：boom",
  );
});
