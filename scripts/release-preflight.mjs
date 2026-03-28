import {
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_ERROR_RATE,
  DEFAULT_REQUESTS_PER_TARGET,
  DEFAULT_TIMEOUT_MS as DEFAULT_LOAD_TIMEOUT_MS,
  createDefaultTargets,
  runLoadSmoke
} from './http-load-smoke.mjs';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_FALLBACK_MESSAGES = 5000;
const DEFAULT_MAX_PUSH_QUEUE = 5000;
const DEFAULT_MAX_RECENT_SOCKET_FALLBACK_MS = 10 * 60 * 1000;
const DEFAULT_MAX_PUSH_CONSECUTIVE_FAILURES = 2;
const DEFAULT_MAX_PUSH_SUCCESS_STALE_MS = 15 * 60 * 1000;

function normalizeBaseUrl(value, fallback) {
  const text = String(value || fallback || '').trim();
  return text.replace(/\/+$/, '');
}

function parseBooleanEnv(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatEnv(value, fallback) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDurationMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0ms';
  if (numeric < 1000) return `${numeric}ms`;
  if (numeric < 60_000) return `${Math.round(numeric / 1000)}s`;
  const minutes = Math.floor(numeric / 60_000);
  const seconds = Math.round((numeric % 60_000) / 1000);
  return `${minutes}m${seconds}s`;
}

function parseTimestamp(value) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`timeout_${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

async function probeJson(url, timeoutMs, headers = {}) {
  const startedAt = Date.now();
  try {
    const response = await withTimeout(fetch(url, { headers }), timeoutMs);
    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      body,
      error: ''
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      body: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatResult(label, result) {
  const status = result.ok ? 'OK' : 'FAIL';
  const code = result.status ? `HTTP ${result.status}` : result.error || 'no_response';
  return `[${status}] ${label} - ${code} - ${result.latencyMs}ms`;
}

function collectBffSummary(body) {
  if (!body || typeof body !== 'object') return '';
  const goApi = body.dependencies && body.dependencies.goApi;
  if (!goApi || typeof goApi !== 'object') return '';
  return [
    goApi.ok === true ? 'goApi=ok' : 'goApi=down',
    goApi.probe ? `probe=${goApi.probe}` : '',
    goApi.error ? `error=${goApi.error}` : ''
  ].filter(Boolean).join(' ');
}

function collectSocketSummary(body) {
  if (!body || typeof body !== 'object') return '';
  const redis = body.redis && typeof body.redis === 'object' ? body.redis : null;
  const fallback = body.fallbackBuffer && typeof body.fallbackBuffer === 'object' ? body.fallbackBuffer : null;
  const fallbackRuntime = body.fallbackRuntime && typeof body.fallbackRuntime === 'object' ? body.fallbackRuntime : null;
  const lastFallbackAt = fallbackRuntime
    ? Math.max(
      Number(fallbackRuntime.lastConversationListFallbackAt || 0),
      Number(fallbackRuntime.lastMessageHistoryFallbackAt || 0)
    )
    : 0;
  const lastFallbackAgeMs = lastFallbackAt > 0 ? Math.max(Date.now() - lastFallbackAt, 0) : 0;
  return [
    redis ? `redisMode=${redis.mode || 'unknown'}` : '',
    redis && typeof redis.connected === 'boolean' ? `redisConnected=${redis.connected}` : '',
    redis && typeof redis.adapterEnabled === 'boolean' ? `adapter=${redis.adapterEnabled}` : '',
    fallback && fallback.messageCount !== undefined ? `fallbackMessages=${fallback.messageCount}` : '',
    fallback && fallback.chatCount !== undefined ? `fallbackChats=${fallback.chatCount}` : '',
    fallbackRuntime && fallbackRuntime.conversationListFallbackCount !== undefined ? `fallbackListHits=${fallbackRuntime.conversationListFallbackCount}` : '',
    fallbackRuntime && fallbackRuntime.messageHistoryFallbackCount !== undefined ? `fallbackHistoryHits=${fallbackRuntime.messageHistoryFallbackCount}` : '',
    fallbackRuntime && fallbackRuntime.historyRefreshWriteCount !== undefined ? `fallbackRefreshWrites=${fallbackRuntime.historyRefreshWriteCount}` : '',
    lastFallbackAgeMs > 0 ? `lastFallbackAgo=${formatDurationMs(lastFallbackAgeMs)}` : ''
  ].filter(Boolean).join(' ');
}

function collectSystemHealthSummary(body) {
  if (!body || typeof body !== 'object') return '';
  const serviceStatus = body.serviceStatus && typeof body.serviceStatus === 'object' ? body.serviceStatus : null;
  if (!serviceStatus) return '';
  const services = Array.isArray(serviceStatus.services) ? serviceStatus.services : [];
  const summary = services
    .map((service) => `${service.key || 'unknown'}=${service.status || 'unknown'}`)
    .join(' ');
  return [`overall=${serviceStatus.overall || 'unknown'}`, summary].filter(Boolean).join(' ');
}

function evaluateBffReady(body) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_bff_ready_body');
    return failures;
  }
  if (body.status !== 'ready') {
    failures.push(`bff_status=${body.status || 'unknown'}`);
  }
  const goApi = body.dependencies && body.dependencies.goApi;
  if (!goApi || goApi.ok !== true) {
    failures.push('bff_go_api_not_ready');
  }
  return failures;
}

function evaluateGoReady(body, maxPushQueue) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_go_ready_body');
    return failures;
  }
  if (body.status !== 'ready') {
    failures.push(`go_status=${body.status || 'unknown'}`);
  }
  const database = body.dependencies && body.dependencies.database;
  if (!database || database.ok !== true) {
    failures.push('go_database_not_ready');
  }
  const redis = body.dependencies && body.dependencies.redis;
  if (redis && redis.required === true && redis.ok !== true) {
    failures.push('go_redis_required_but_not_ready');
  }
  const pushWorker = body.dependencies && body.dependencies.pushWorker;
  const worker = pushWorker && pushWorker.worker && typeof pushWorker.worker === 'object' ? pushWorker.worker : null;
  const queue = worker && worker.queue && typeof worker.queue === 'object' ? worker.queue : null;
  if (worker && worker.enabled === true) {
    if (worker.running !== true) {
      failures.push('push_worker_not_running');
    }
    const cycle = String(worker.lastCycleStatus || '').trim().toLowerCase();
    if (cycle && (cycle.includes('failed') || cycle.includes('error'))) {
      failures.push(`push_cycle=${cycle}`);
    }
    if (queue && Number.isFinite(Number(queue.total)) && Number(queue.total) > maxPushQueue) {
      failures.push(`push_queue=${queue.total}>${maxPushQueue}`);
    }
  }
  return failures;
}

function evaluatePushWorkerSignals(body, maxConsecutiveFailures, maxSuccessStaleMs) {
  const failures = [];
  const pushWorker = body && body.dependencies && body.dependencies.pushWorker;
  const worker = pushWorker && pushWorker.worker && typeof pushWorker.worker === "object" ? pushWorker.worker : null;
  const queue = worker && worker.queue && typeof worker.queue === "object" ? worker.queue : null;
  if (!worker || worker.enabled !== true) {
    return failures;
  }

  const consecutiveFailures = parseIntegerEnv(worker.consecutiveFailures, 0);
  if (maxConsecutiveFailures >= 0 && consecutiveFailures > maxConsecutiveFailures) {
    failures.push(`push_consecutive_failures=${consecutiveFailures}>${maxConsecutiveFailures}`);
  }

  const queueTotal = queue ? parseIntegerEnv(queue.total, 0) : 0;
  if (queueTotal <= 0 || maxSuccessStaleMs <= 0) {
    return failures;
  }

  const lastSuccessAt = parseTimestamp(worker.lastSuccessAt);
  if (!lastSuccessAt) {
    failures.push("push_last_success=missing_with_nonempty_queue");
    return failures;
  }

  const staleMs = Math.max(Date.now() - lastSuccessAt, 0);
  if (staleMs > maxSuccessStaleMs) {
    failures.push(`push_last_success_age=${formatDurationMs(staleMs)}>${formatDurationMs(maxSuccessStaleMs)}`);
  }
  return failures;
}

function evaluateSocketReady(body, requiredRedisMode) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_socket_ready_body');
    return failures;
  }
  if (body.status !== 'ready') {
    failures.push(`socket_status=${body.status || 'unknown'}`);
  }
  const redis = body.redis;
  if (redis && redis.enabled) {
    if (redis.connected !== true) {
      failures.push('socket_redis_not_connected');
    }
    if (redis.adapterEnabled !== true) {
      failures.push('socket_adapter_not_enabled');
    }
  }
  const normalizedRequiredMode = String(requiredRedisMode || '').trim();
  if (normalizedRequiredMode && redis) {
    const actualMode = String(redis.mode || '').trim();
    if (actualMode !== normalizedRequiredMode) {
      failures.push(`socket_redis_mode=${actualMode || 'unknown'}!=${normalizedRequiredMode}`);
    }
  }
  return failures;
}

function evaluateSocketStats(body, maxFallbackMessages, maxRecentSocketFallbackMs) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_socket_stats_body');
    return failures;
  }
  const fallback = body.fallbackBuffer && typeof body.fallbackBuffer === 'object' ? body.fallbackBuffer : null;
  if (fallback && Number.isFinite(Number(fallback.messageCount)) && Number(fallback.messageCount) > maxFallbackMessages) {
    failures.push(`fallback_messages=${fallback.messageCount}>${maxFallbackMessages}`);
  }
  const fallbackRuntime = body.fallbackRuntime && typeof body.fallbackRuntime === 'object' ? body.fallbackRuntime : null;
  const recentThreshold = Number(maxRecentSocketFallbackMs);
  if (fallbackRuntime && Number.isFinite(recentThreshold) && recentThreshold > 0) {
    const lastFallbackAt = Math.max(
      Number(fallbackRuntime.lastConversationListFallbackAt || 0),
      Number(fallbackRuntime.lastMessageHistoryFallbackAt || 0)
    );
    if (lastFallbackAt > 0) {
      const ageMs = Math.max(Date.now() - lastFallbackAt, 0);
      if (ageMs <= recentThreshold) {
        failures.push(`recent_socket_fallback=${formatDurationMs(ageMs)}<=${formatDurationMs(recentThreshold)}`);
      }
    }
  }
  return failures;
}

function evaluateSystemHealth(body, allowDegraded) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_system_health_body');
    return failures;
  }
  const serviceStatus = body.serviceStatus && typeof body.serviceStatus === 'object' ? body.serviceStatus : null;
  if (!serviceStatus) {
    failures.push('missing_service_status');
    return failures;
  }
  const overall = String(serviceStatus.overall || '').trim().toLowerCase();
  if (!overall) {
    failures.push('missing_overall_status');
    return failures;
  }
  if (overall === 'down') {
    failures.push('system_health_down');
    return failures;
  }
  if (!allowDegraded && overall !== 'ok') {
    failures.push(`system_health=${overall}`);
  }
  return failures;
}

async function main() {
  const timeoutMs = Number.parseInt(process.env.PREFLIGHT_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;
  const bffBaseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const goBaseUrl = normalizeBaseUrl(process.env.GO_BASE_URL, 'http://127.0.0.1:1029');
  const socketBaseUrl = normalizeBaseUrl(process.env.SOCKET_BASE_URL, 'http://127.0.0.1:9898');
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const maxFallbackMessages = parseIntegerEnv(process.env.PREFLIGHT_MAX_FALLBACK_MESSAGES, DEFAULT_MAX_FALLBACK_MESSAGES);
  const maxPushQueue = parseIntegerEnv(process.env.PREFLIGHT_MAX_PUSH_QUEUE, DEFAULT_MAX_PUSH_QUEUE);
  const maxRecentSocketFallbackMs = parseIntegerEnv(
    process.env.PREFLIGHT_MAX_RECENT_SOCKET_FALLBACK_MS,
    DEFAULT_MAX_RECENT_SOCKET_FALLBACK_MS
  );
  const requiredSocketRedisMode = String(process.env.PREFLIGHT_REQUIRE_SOCKET_REDIS_MODE || 'redis').trim();
  const allowDegradedSystemHealth = parseBooleanEnv(process.env.PREFLIGHT_ALLOW_DEGRADED_SYSTEM_HEALTH, false);
  const runHttpLoadSmoke = parseBooleanEnv(process.env.PREFLIGHT_RUN_HTTP_LOAD_SMOKE, false);
  const maxPushConsecutiveFailures = parseIntegerEnv(
    process.env.PREFLIGHT_MAX_PUSH_CONSECUTIVE_FAILURES,
    DEFAULT_MAX_PUSH_CONSECUTIVE_FAILURES
  );
  const maxPushSuccessStaleMs = parseIntegerEnv(
    process.env.PREFLIGHT_MAX_PUSH_SUCCESS_STALE_MS,
    DEFAULT_MAX_PUSH_SUCCESS_STALE_MS
  );
  const loadConcurrency = parseIntegerEnv(process.env.LOAD_CONCURRENCY, DEFAULT_CONCURRENCY);
  const loadRequestsPerTarget = parseIntegerEnv(
    process.env.LOAD_REQUESTS_PER_TARGET,
    DEFAULT_REQUESTS_PER_TARGET
  );
  const loadTimeoutMs = parseIntegerEnv(process.env.LOAD_TIMEOUT_MS, DEFAULT_LOAD_TIMEOUT_MS);
  const loadMaxErrorRate = parseFloatEnv(process.env.LOAD_MAX_ERROR_RATE, DEFAULT_MAX_ERROR_RATE);
  const loadMaxP95Ms = parseIntegerEnv(process.env.LOAD_MAX_P95_MS, 0);

  const probes = [
    {
      label: 'BFF ready',
      url: `${bffBaseUrl}/ready`,
      summary: collectBffSummary,
      validate: evaluateBffReady
    },
    {
      label: 'Go ready',
      url: `${goBaseUrl}/ready`,
      summary: () => '',
      validate: (body) => evaluateGoReady(body, maxPushQueue)
    },
    {
      label: 'Socket ready',
      url: `${socketBaseUrl}/ready`,
      summary: collectSocketSummary,
      validate: (body) => evaluateSocketReady(body, requiredSocketRedisMode)
    },
    {
      label: 'Socket stats',
      url: `${socketBaseUrl}/api/stats`,
      summary: collectSocketSummary,
      validate: (body) => evaluateSocketStats(body, maxFallbackMessages, maxRecentSocketFallbackMs)
    }
  ];

  if (adminToken) {
    probes.push({
      label: 'Admin system health',
      url: `${bffBaseUrl}/api/system-health`,
      headers: { Authorization: `Bearer ${adminToken}` },
      summary: collectSystemHealthSummary,
      validate: (body) => evaluateSystemHealth(body, allowDegradedSystemHealth)
    });
  }

  let hasFailure = false;
  console.log(`Release preflight started at ${new Date().toISOString()}`);
  console.log(`Targets: BFF=${bffBaseUrl} GO=${goBaseUrl} SOCKET=${socketBaseUrl}`);
  console.log(
    `Thresholds: maxFallbackMessages=${maxFallbackMessages} maxPushQueue=${maxPushQueue} `
    + `maxPushConsecutiveFailures=${maxPushConsecutiveFailures} `
    + `maxPushSuccessStale=${formatDurationMs(maxPushSuccessStaleMs)} `
    + `requiredSocketRedisMode=${requiredSocketRedisMode || 'none'} `
    + `maxRecentSocketFallback=${formatDurationMs(maxRecentSocketFallbackMs)} `
    + `allowDegradedSystemHealth=${allowDegradedSystemHealth}`
  );
  if (runHttpLoadSmoke) {
    console.log(
      `HTTP smoke: enabled concurrency=${loadConcurrency} requestsPerTarget=${loadRequestsPerTarget} `
      + `timeoutMs=${loadTimeoutMs} maxErrorRate=${loadMaxErrorRate} maxP95Ms=${loadMaxP95Ms || 'disabled'}`
    );
  } else {
    console.log('HTTP smoke: skipped (set PREFLIGHT_RUN_HTTP_LOAD_SMOKE=true to enable)');
  }
  if (!adminToken) {
    console.log('Admin system health probe skipped: ADMIN_TOKEN not provided');
  }

  for (const probe of probes) {
    const result = await probeJson(probe.url, timeoutMs, probe.headers || {});
    console.log(formatResult(probe.label, result));
    const summary = probe.summary(result.body);
    if (summary) {
      console.log(`  ${summary}`);
    }
    const validationFailures = typeof probe.validate === 'function' ? probe.validate(result.body) : [];
    const extraFailures = probe.label === "Go ready"
      ? evaluatePushWorkerSignals(result.body, maxPushConsecutiveFailures, maxPushSuccessStaleMs)
      : [];
    const allFailures = [...validationFailures, ...extraFailures];
    if (allFailures.length > 0) {
      console.log(`  assertions: ${allFailures.join(' | ')}`);
    }
    if (!result.ok || allFailures.length > 0) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    console.error('Release preflight failed.');
    process.exitCode = 1;
    return;
  }

  if (runHttpLoadSmoke) {
    const smokeResult = await runLoadSmoke({
      targets: createDefaultTargets({
        bffBaseUrl,
        goBaseUrl,
        socketBaseUrl
      }),
      concurrency: loadConcurrency,
      requestsPerTarget: loadRequestsPerTarget,
      timeoutMs: loadTimeoutMs,
      maxErrorRate: loadMaxErrorRate,
      maxP95Ms: loadMaxP95Ms,
      logger: console
    });
    if (!smokeResult.ok) {
      console.error('Release preflight failed: HTTP load smoke did not pass.');
      process.exitCode = 1;
      return;
    }
  }

  console.log('Release preflight passed.');
}

main().catch((error) => {
  console.error('Release preflight crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
