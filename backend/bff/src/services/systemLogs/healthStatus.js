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
  if (body.fallbackBuffer && typeof body.fallbackBuffer === "object") {
    const fallback = body.fallbackBuffer;
    const fallbackDetail = [
      fallback.messageCount !== undefined ? `fallbackMessages=${fallback.messageCount}` : "",
      fallback.chatCount !== undefined ? `fallbackChats=${fallback.chatCount}` : "",
      fallback.oldestAgeMs !== undefined ? `fallbackOldestAge=${fallback.oldestAgeMs}` : "",
      fallback.startupExpiredPruned !== undefined ? `fallbackExpiredPruned=${fallback.startupExpiredPruned}` : "",
      fallback.startupOverflowPruned !== undefined ? `fallbackOverflowPruned=${fallback.startupOverflowPruned}` : ""
    ].filter(Boolean).join(" ");
    if (fallbackDetail) {
      details.push(fallbackDetail);
    }
  }
  if (body.fallbackRuntime && typeof body.fallbackRuntime === "object") {
    const runtime = body.fallbackRuntime;
    const runtimeDetail = [
      runtime.conversationListFallbackCount !== undefined ? `fallbackListHits=${runtime.conversationListFallbackCount}` : "",
      runtime.messageHistoryFallbackCount !== undefined ? `fallbackHistoryHits=${runtime.messageHistoryFallbackCount}` : "",
      runtime.historyRefreshWriteCount !== undefined ? `fallbackRefreshWrites=${runtime.historyRefreshWriteCount}` : "",
      runtime.historyRefreshMessageCount !== undefined ? `fallbackRefreshMessages=${runtime.historyRefreshMessageCount}` : ""
    ].filter(Boolean).join(" ");
    if (runtimeDetail) {
      details.push(runtimeDetail);
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
      queue.oldestDispatchingAt ? `pushOldestDispatchingAt=${queue.oldestDispatchingAt}` : "",
      queue.oldestDispatchingAgeSeconds !== undefined ? `pushOldestDispatchingAgeSeconds=${queue.oldestDispatchingAgeSeconds}` : ""
    ].filter(Boolean).join(" ");
    if (pushDetail) {
      details.push(pushDetail);
    }
  }

  return details.join(" | ");
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
    services
  };
}

module.exports = {
  collectServiceStatus,
};
