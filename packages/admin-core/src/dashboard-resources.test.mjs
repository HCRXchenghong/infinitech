import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardPushWorkerSummary,
  buildDashboardRuntimeHealthSummary,
  buildDashboardStatsCards,
  createDefaultImStats,
  createDefaultStatsCards,
  extractDashboardRankItems,
  extractHealthDetail,
  formatDashboardRuntimeHealthStatus,
  formatPresenceConnectedAt,
  formatUpdateTime,
  getAqiText,
  getRankName,
  getRankType,
  getRedisModeHint,
  getRedisModeLabel,
  getRedisModeTagType,
  normalizeOnlinePresenceSample,
  normalizeRedisHealth,
  normalizeRefreshMinutes,
} from "./dashboard-resources.js";

test("dashboard resources keep stats, rank and redis semantics stable", () => {
  assert.equal(createDefaultImStats().online, false);
  assert.equal(createDefaultStatsCards().length, 6);
  assert.deepEqual(
    buildDashboardStatsCards({
      customerCount: 15000,
      totalOrders: 102,
    }).slice(0, 2),
    [
      { key: "customerCount", label: "注册用户", value: "1.5万", tag: "用户", desc: "平台累计注册用户数" },
      { key: "totalOrders", label: "总订单数", value: "102", tag: "订单", desc: "历史订单总量" },
    ],
  );
  assert.equal(normalizeRefreshMinutes("0"), 1);
  assert.equal(getRankName(5), "王者骑士");
  assert.equal(getRankType(4), "success");
  assert.deepEqual(extractDashboardRankItems({ data: { items: [{ id: 1 }] } }), [{ id: 1 }]);
  assert.deepEqual(
    normalizeRedisHealth({
      enabled: true,
      connected: true,
      adapterEnabled: true,
      mode: "redis",
      port: "6379",
    }),
    {
      enabled: true,
      connected: true,
      connecting: false,
      adapterConnecting: false,
      adapterEnabled: true,
      mode: "redis",
      host: "",
      port: 6379,
      database: 0,
    },
  );
  assert.equal(getRedisModeLabel("redis-no-adapter"), "Redis 已连接，Adapter 未启用");
  assert.equal(getRedisModeTagType("local-fallback"), "danger");
  assert.equal(
    getRedisModeHint({ enabled: true, connected: true, adapterEnabled: true, mode: "redis" }),
    "Redis 和 Socket.IO Redis Adapter 都已启用，可支持多实例共享在线态与广播。",
  );
  assert.deepEqual(
    normalizeOnlinePresenceSample([
      { socketId: "socketabcdef1234", userId: "1001", role: "admin", connectedAt: "2026-04-16T10:00:00+08:00" },
    ]),
    [
      {
        key: "socketabcdef1234",
        socketId: "socketabcdef1234",
        socketLabel: "socket...1234",
        userId: "1001",
        userLabel: "1001",
        role: "admin",
        roleLabel: "管理员",
        connectedAt: Date.parse("2026-04-16T10:00:00+08:00"),
      },
    ],
  );
});

test("dashboard resources build runtime summaries from service health", () => {
  const runtimeHealth = {
    overall: "degraded",
    services: [
      {
        key: "go",
        status: "up",
        detail:
          "pushProvider=aliyun|pushRunning=true|pushCycle=30s|pushQueue=2|pushRetry=1|pushFailed=0|pushLastSuccessAt=2026-04-16T09:59:00+08:00",
      },
      { key: "socket", status: "down" },
      { key: "redis", status: "up" },
    ],
  };

  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-04-16T10:00:00+08:00");
  try {
    assert.equal(formatDashboardRuntimeHealthStatus(runtimeHealth.overall), "部分降级");
    assert.equal(
      buildDashboardRuntimeHealthSummary(runtimeHealth),
      "Go 已就绪 · Socket 异常 · Redis 已就绪",
    );
    assert.equal(
      buildDashboardPushWorkerSummary(runtimeHealth),
      "Provider aliyun · Worker 运行中 · 周期 30s · 队列 2 · 重试 1 · 失败 0 · 最近成功 1 分钟前",
    );
    assert.equal(extractHealthDetail(runtimeHealth.services[0].detail, "pushQueue"), "2");
    assert.equal(formatUpdateTime("2026-04-16T09:30:00+08:00"), "30 分钟前");
    assert.equal(formatPresenceConnectedAt("2026-04-16T09:00:00+08:00"), "1 小时前连接");
  } finally {
    Date.now = originalNow;
  }
});

test("dashboard resources preserve AQI wording and rank dictionary override", () => {
  assert.equal(getAqiText(120), "轻度污染");
  assert.equal(
    getRankName(2, [{ level: 2, name: "白银先锋" }]),
    "白银先锋",
  );
});
