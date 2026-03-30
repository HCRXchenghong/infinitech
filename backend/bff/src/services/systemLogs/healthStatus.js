const net = require("net");
const axios = require("axios");
const config = require("../../config");
const {
  HEALTH_CHECK_TIMEOUT_MS,
} = require("./constants");
const { toPositiveInt } = require("./helpers");

function normalizeUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  return value.replace(/\/+$/, "");
}

function parseUrlHostPort(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const isHttps = url.protocol === "https:";
    return {
      host: url.hostname,
      port: Number.parseInt(url.port || (isHttps ? "443" : "80"), 10)
    };
  } catch (error) {
    return { host: "", port: 0 };
  }
}

function probeTcp(host, port, timeoutMs) {
  return new Promise((resolve) => {
    if (!host || !Number.isFinite(port) || port <= 0) {
      resolve({
        ok: false,
        latencyMs: null,
        error: "invalid_host_or_port"
      });
      return;
    }

    const startMs = Date.now();
    const socket = net.createConnection({ host, port });
    let done = false;

    const finish = (payload) => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      resolve(payload);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      finish({
        ok: true,
        latencyMs: Date.now() - startMs,
        error: ""
      });
    });
    socket.once("timeout", () => {
      finish({
        ok: false,
        latencyMs: Date.now() - startMs,
        error: `timeout_${timeoutMs}ms`
      });
    });
    socket.once("error", (error) => {
      finish({
        ok: false,
        latencyMs: Date.now() - startMs,
        error: error && error.code ? String(error.code) : String(error && error.message ? error.message : "tcp_error")
      });
    });
  });
}

async function probeHttp(url, timeoutMs) {
  if (!url) {
    return {
      ok: false,
      latencyMs: null,
      httpStatus: null,
      error: "empty_url",
      body: null
    };
  }

  const startMs = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      latencyMs: Date.now() - startMs,
      httpStatus: response.status,
      error: "",
      body: response.data || null
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startMs,
      httpStatus: null,
      error: error && error.code ? String(error.code) : String(error && error.message ? error.message : "http_error"),
      body: error && error.response ? error.response.data || null : null
    };
  }
}

function buildProbeDetail(result) {
  const body = result && result.body && typeof result.body === "object" ? result.body : null;
  if (!body) {
    return "";
  }

  const details = [];
  if (body.status) {
    details.push(`status=${body.status}`);
  }
  if (body.error) {
    details.push(`error=${body.error}`);
  }
  if (body.redis && typeof body.redis === "object") {
    if (typeof body.redis.connected === "boolean") {
      details.push(`redisConnected=${body.redis.connected}`);
    }
    if (body.redis.mode) {
      details.push(`redisMode=${body.redis.mode}`);
    }
  }
  if (body.dependencies && body.dependencies.goApi) {
    const goApi = body.dependencies.goApi;
    const goApiDetail = [
      `goApiOk=${goApi.ok === true}`,
      goApi.probe ? `goApiProbe=${goApi.probe}` : "",
      goApi.error ? `goApiError=${goApi.error}` : ""
    ].filter(Boolean).join(" ");
    if (goApiDetail) {
      details.push(goApiDetail);
    }
  }
  if (body.dependencies && body.dependencies.pushWorker) {
    const pushWorker = body.dependencies.pushWorker;
    const worker = pushWorker.worker && typeof pushWorker.worker === "object" ? pushWorker.worker : {};
    const queue = worker.queue && typeof worker.queue === "object" ? worker.queue : {};
    const pushDetail = [
      `pushWorkerOk=${pushWorker.ok === true}`,
      worker.enabled !== undefined ? `pushEnabled=${worker.enabled === true}` : "",
      worker.running !== undefined ? `pushRunning=${worker.running === true}` : "",
      worker.provider ? `pushProvider=${worker.provider}` : "",
      worker.productionReady !== undefined ? `pushProductionReady=${worker.productionReady === true}` : "",
      Array.isArray(worker.productionIssues) && worker.productionIssues.length
        ? `pushProductionIssues=${worker.productionIssues.join(",")}`
        : "",
      worker.webhookTarget ? `pushWebhookTarget=${worker.webhookTarget}` : "",
      worker.webhookSecureTransport !== undefined ? `pushWebhookSecure=${worker.webhookSecureTransport === true}` : "",
      worker.webhookPrivateTarget !== undefined ? `pushWebhookPrivate=${worker.webhookPrivateTarget === true}` : "",
      worker.webhookAuthConfigured !== undefined ? `pushWebhookAuth=${worker.webhookAuthConfigured === true}` : "",
      worker.webhookSignatureEnabled !== undefined ? `pushWebhookSignature=${worker.webhookSignatureEnabled === true}` : "",
      worker.fcmProjectId ? `pushFcmProject=${worker.fcmProjectId}` : "",
      worker.fcmConfigured !== undefined ? `pushFcmConfigured=${worker.fcmConfigured === true}` : "",
      worker.fcmTokenTarget ? `pushFcmTokenTarget=${worker.fcmTokenTarget}` : "",
      worker.fcmTokenSecureTransport !== undefined ? `pushFcmTokenSecure=${worker.fcmTokenSecureTransport === true}` : "",
      worker.fcmTokenPrivateTarget !== undefined ? `pushFcmTokenPrivate=${worker.fcmTokenPrivateTarget === true}` : "",
      worker.fcmApiBaseTarget ? `pushFcmApiTarget=${worker.fcmApiBaseTarget}` : "",
      worker.fcmApiBaseSecureTransport !== undefined ? `pushFcmApiSecure=${worker.fcmApiBaseSecureTransport === true}` : "",
      worker.fcmApiBasePrivateTarget !== undefined ? `pushFcmApiPrivate=${worker.fcmApiBasePrivateTarget === true}` : "",
      worker.lastCycleStatus ? `pushCycle=${worker.lastCycleStatus}` : "",
      worker.lastSuccessAt ? `pushLastSuccessAt=${worker.lastSuccessAt}` : "",
      worker.consecutiveFailures !== undefined ? `pushConsecutiveFailures=${worker.consecutiveFailures}` : "",
      worker.lastProcessedCount !== undefined ? `pushProcessed=${worker.lastProcessedCount}` : "",
      worker.lastError ? `pushError=${worker.lastError}` : "",
      queue.total !== undefined ? `pushQueue=${queue.total}` : "",
      queue.queued ? `pushQueued=${queue.queued}` : "",
      queue.retryPending ? `pushRetry=${queue.retryPending}` : "",
      queue.dispatching ? `pushDispatching=${queue.dispatching}` : "",
      queue.failed ? `pushFailed=${queue.failed}` : "",
      queue.oldestQueuedAt ? `pushOldestQueuedAt=${queue.oldestQueuedAt}` : "",
      queue.oldestQueuedAgeSeconds !== undefined ? `pushOldestQueuedAgeSeconds=${queue.oldestQueuedAgeSeconds}` : "",
      queue.oldestRetryPendingAt ? `pushOldestRetryPendingAt=${queue.oldestRetryPendingAt}` : "",
      queue.oldestRetryPendingAgeSeconds !== undefined ? `pushOldestRetryPendingAgeSeconds=${queue.oldestRetryPendingAgeSeconds}` : "",
      queue.oldestDispatchingAt ? `pushOldestDispatchingAt=${queue.oldestDispatchingAt}` : "",
      queue.oldestDispatchingAgeSeconds !== undefined ? `pushOldestDispatchingAgeSeconds=${queue.oldestDispatchingAgeSeconds}` : "",
      queue.latestSentAt ? `pushLatestSentAt=${queue.latestSentAt}` : "",
      queue.latestFailedAt ? `pushLatestFailedAt=${queue.latestFailedAt}` : "",
      queue.latestAcknowledgedAt ? `pushLatestAcknowledgedAt=${queue.latestAcknowledgedAt}` : ""
    ].filter(Boolean).join(" ");
    if (pushDetail) {
      details.push(pushDetail);
    }
  }
  if (body.dependencies && body.dependencies.rtcRetention) {
    const rtcRetention = body.dependencies.rtcRetention;
    const worker = rtcRetention.worker && typeof rtcRetention.worker === "object" ? rtcRetention.worker : {};
    const rtcDetail = [
      `rtcRetentionOk=${rtcRetention.ok === true}`,
      worker.enabled !== undefined ? `rtcRetentionEnabled=${worker.enabled === true}` : "",
      worker.running !== undefined ? `rtcRetentionRunning=${worker.running === true}` : "",
      worker.retentionHours !== undefined ? `rtcRetentionHours=${worker.retentionHours}` : "",
      worker.cleanupIntervalSeconds !== undefined ? `rtcRetentionCleanupIntervalSeconds=${worker.cleanupIntervalSeconds}` : "",
      worker.lastCleanupStatus ? `rtcRetentionStatus=${worker.lastCleanupStatus}` : "",
      worker.lastCleanupAt ? `rtcRetentionLastCleanupAt=${worker.lastCleanupAt}` : "",
      worker.lastCleanupCount !== undefined ? `rtcRetentionLastCleanupCount=${worker.lastCleanupCount}` : "",
      worker.lastCleanupError ? `rtcRetentionError=${worker.lastCleanupError}` : ""
    ].filter(Boolean).join(" ");
    if (rtcDetail) {
      details.push(rtcDetail);
    }
  }

  return details.join(" | ");
}

function buildJourneyStatus(ok, degraded) {
  if (ok) return "ok";
  if (degraded) return "degraded";
  return "down";
}

function buildJourneySummary({ bffCheck, goCheck, socketCheck, redisCheck }) {
  const goBody = goCheck && goCheck.body && typeof goCheck.body === "object" ? goCheck.body : {};
  const pushWorker = goBody.dependencies && goBody.dependencies.pushWorker && goBody.dependencies.pushWorker.worker
    ? goBody.dependencies.pushWorker.worker
    : {};
  const rtcRetentionWorker = goBody.dependencies && goBody.dependencies.rtcRetention && goBody.dependencies.rtcRetention.worker
    ? goBody.dependencies.rtcRetention.worker
    : {};

  const authOk = bffCheck.ok && goCheck.ok && redisCheck.ok;
  const authDegraded = bffCheck.ok && goCheck.ok && !redisCheck.ok;

  const orderingOk = bffCheck.ok && goCheck.ok;
  const orderingDegraded = false;

  const messagingOk = goCheck.ok && socketCheck.ok && redisCheck.ok;
  const messagingDegraded = goCheck.ok && socketCheck.ok && !redisCheck.ok;

  const pushOk = goCheck.ok &&
    pushWorker.enabled === true &&
    pushWorker.running === true &&
    pushWorker.productionReady === true;
  const pushDegraded = goCheck.ok && (pushWorker.enabled === true || pushWorker.provider);

  const rtcOk = goCheck.ok && socketCheck.ok && rtcRetentionWorker.enabled === true;
  const rtcDegraded = goCheck.ok && socketCheck.ok;

  const homeFeedOk = bffCheck.ok && goCheck.ok;

  return [
    {
      key: "auth",
      label: "注册登录",
      status: buildJourneyStatus(authOk, authDegraded),
      detail: authOk
        ? "BFF、Go、Redis 均正常，登录与会话链路完整。"
        : authDegraded
          ? "Redis 不可用，登录主链仍可运行，但会话能力进入降级模式。"
          : "BFF 或 Go 不可用，注册登录链路存在阻断风险。"
    },
    {
      key: "ordering",
      label: "点餐下单",
      status: buildJourneyStatus(orderingOk, orderingDegraded),
      detail: orderingOk
        ? "BFF 与 Go 正常，可继续验证外卖、团购和跑腿下单链。"
        : "BFF 或 Go 不可用，下单链路存在阻断风险。"
    },
    {
      key: "messaging",
      label: "消息会话",
      status: buildJourneyStatus(messagingOk, messagingDegraded),
      detail: messagingOk
        ? "Go、Socket、Redis 正常，消息与在线态链路完整。"
        : messagingDegraded
          ? "Socket 可用但 Redis 异常，消息链路进入单机降级风险。"
          : "Socket 或 Go 不可用，消息与客服链路存在阻断风险。"
    },
    {
      key: "push",
      label: "消息推送",
      status: buildJourneyStatus(pushOk, pushDegraded),
      detail: pushOk
        ? `Push worker 正常，provider=${pushWorker.provider || "-"}` 
        : pushDegraded
          ? `Push worker 未达到生产就绪，issues=${Array.isArray(pushWorker.productionIssues) ? pushWorker.productionIssues.join(",") : "未就绪"}`
          : "Go 或推送 worker 未准备好，推送链路尚未就绪。"
    },
    {
      key: "rtc",
      label: "RTC 音频",
      status: buildJourneyStatus(rtcOk, rtcDegraded),
      detail: rtcOk
        ? "Go、Socket 和 RTC 留存清理 worker 正常，RTC 运行链可进入联调。"
        : rtcDegraded
          ? "RTC 信令主链可用，但留存清理或审计保障未完全就绪。"
          : "Go 或 Socket 不可用，RTC 信令链路存在阻断风险。"
    },
    {
      key: "homeFeed",
      label: "首页编排",
      status: buildJourneyStatus(homeFeedOk, false),
      detail: homeFeedOk
        ? "首页 feed 由 BFF/Go 统一编排，可继续验证推广位和自然排序。"
        : "首页编排依赖未就绪，首页展示存在阻断风险。"
    }
  ];
}

async function probeHttpWithFallback(urls, timeoutMs) {
  const targets = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  if (targets.length === 0) {
    return {
      ok: false,
      latencyMs: null,
      httpStatus: null,
      error: "empty_url",
      target: "",
      probe: ""
    };
  }

  let lastResult = null;
  for (const target of targets) {
    const result = await probeHttp(target, timeoutMs);
    const probe = /\/ready(?:\?|$)/.test(target) ? "ready" : "health";
    lastResult = { ...result, target, probe };
    if (result.ok) {
      return lastResult;
    }
  }

  return lastResult;
}

async function collectServiceStatus() {
  const timeoutMs = toPositiveInt(process.env.SYSTEM_LOG_HEALTH_TIMEOUT_MS, HEALTH_CHECK_TIMEOUT_MS);
  const bffPort = toPositiveInt(config.port, 25500);
  const bffReadyUrl = `http://127.0.0.1:${bffPort}/ready`;
  const bffHealthUrl = `http://127.0.0.1:${bffPort}/health`;
  const goBaseUrl = normalizeUrl(config.goApiUrl);
  const goReadyUrl = goBaseUrl ? `${goBaseUrl}/ready` : "";
  const goHealthUrl = goBaseUrl ? `${goBaseUrl}/health` : "";
  const goAddress = parseUrlHostPort(goBaseUrl);
  const socketBaseUrl = normalizeUrl(config.socketServerUrl);
  const socketReadyUrl = socketBaseUrl ? `${socketBaseUrl}/ready` : "";
  const socketHealthUrl = socketBaseUrl ? `${socketBaseUrl}/health` : "";
  const socketAddress = parseUrlHostPort(socketBaseUrl);

  const redisHost = String(config.redis?.host || "").trim();
  const redisPort = toPositiveInt(config.redis?.port, 2550);

  const [bffCheck, goCheck, socketCheck, redisCheck] = await Promise.all([
    probeHttpWithFallback([bffReadyUrl, bffHealthUrl], timeoutMs),
    probeHttpWithFallback([goReadyUrl, goHealthUrl], timeoutMs),
    probeHttpWithFallback([socketReadyUrl, socketHealthUrl], timeoutMs),
    probeTcp(redisHost, redisPort, timeoutMs)
  ]);

  const services = [
    {
      key: "bff",
      label: "BFF",
      type: "http",
      target: bffCheck.target || bffReadyUrl,
      probe: bffCheck.probe || "ready",
      host: "127.0.0.1",
      port: bffPort,
      status: bffCheck.ok ? "up" : "down",
      healthy: bffCheck.ok,
      latencyMs: bffCheck.latencyMs,
      httpStatus: bffCheck.httpStatus,
      error: bffCheck.error,
      detail: buildProbeDetail(bffCheck)
    },
    {
      key: "go",
      label: "Go API",
      type: "http",
      target: goCheck.target || goReadyUrl || goHealthUrl || "-",
      probe: goCheck.probe || "ready",
      host: goAddress.host,
      port: goAddress.port,
      status: goCheck.ok ? "up" : "down",
      healthy: goCheck.ok,
      latencyMs: goCheck.latencyMs,
      httpStatus: goCheck.httpStatus,
      error: goCheck.error,
      detail: buildProbeDetail(goCheck)
    },
    {
      key: "socket",
      label: "Socket Server",
      type: "http",
      target: socketCheck.target || socketReadyUrl || socketHealthUrl || "-",
      probe: socketCheck.probe || "ready",
      host: socketAddress.host,
      port: socketAddress.port,
      status: socketCheck.ok ? "up" : "down",
      healthy: socketCheck.ok,
      latencyMs: socketCheck.latencyMs,
      httpStatus: socketCheck.httpStatus,
      error: socketCheck.error,
      detail: buildProbeDetail(socketCheck)
    },
    {
      key: "redis",
      label: "Redis",
      type: "tcp",
      target: redisHost ? `${redisHost}:${redisPort}` : "-",
      probe: "tcp",
      host: redisHost,
      port: redisPort,
      status: redisCheck.ok ? "up" : "down",
      healthy: redisCheck.ok,
      latencyMs: redisCheck.latencyMs,
      httpStatus: null,
      error: redisCheck.error,
      detail: ""
    }
  ];

  const bffUp = services[0].healthy;
  const goUp = services[1].healthy;
  const socketUp = services[2].healthy;
  const redisUp = services[3].healthy;

  let overall = "ok";
  if (!bffUp || !goUp) {
    overall = "down";
  } else if (!socketUp || !redisUp) {
    overall = "degraded";
  }

  return {
    checkedAt: new Date().toISOString(),
    overall,
    services,
    journeys: buildJourneySummary({ bffCheck, goCheck, socketCheck, redisCheck })
  };
}

module.exports = {
  collectServiceStatus,
};
