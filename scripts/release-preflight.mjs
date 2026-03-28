const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_FALLBACK_MESSAGES = 5000;

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
  return [
    redis ? `redisMode=${redis.mode || 'unknown'}` : '',
    redis && typeof redis.connected === 'boolean' ? `redisConnected=${redis.connected}` : '',
    redis && typeof redis.adapterEnabled === 'boolean' ? `adapter=${redis.adapterEnabled}` : '',
    fallback && fallback.messageCount !== undefined ? `fallbackMessages=${fallback.messageCount}` : '',
    fallback && fallback.chatCount !== undefined ? `fallbackChats=${fallback.chatCount}` : ''
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

function evaluateGoReady(body) {
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
  return failures;
}

function evaluateSocketReady(body) {
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
  return failures;
}

function evaluateSocketStats(body, maxFallbackMessages) {
  const failures = [];
  if (!body || typeof body !== 'object') {
    failures.push('missing_socket_stats_body');
    return failures;
  }
  const fallback = body.fallbackBuffer && typeof body.fallbackBuffer === 'object' ? body.fallbackBuffer : null;
  if (fallback && Number.isFinite(Number(fallback.messageCount)) && Number(fallback.messageCount) > maxFallbackMessages) {
    failures.push(`fallback_messages=${fallback.messageCount}>${maxFallbackMessages}`);
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
  const allowDegradedSystemHealth = parseBooleanEnv(process.env.PREFLIGHT_ALLOW_DEGRADED_SYSTEM_HEALTH, false);

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
      validate: evaluateGoReady
    },
    {
      label: 'Socket ready',
      url: `${socketBaseUrl}/ready`,
      summary: collectSocketSummary,
      validate: evaluateSocketReady
    },
    {
      label: 'Socket stats',
      url: `${socketBaseUrl}/api/stats`,
      summary: collectSocketSummary,
      validate: (body) => evaluateSocketStats(body, maxFallbackMessages)
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
  console.log(`Thresholds: maxFallbackMessages=${maxFallbackMessages} allowDegradedSystemHealth=${allowDegradedSystemHealth}`);
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
    if (Array.isArray(validationFailures) && validationFailures.length > 0) {
      console.log(`  assertions: ${validationFailures.join(' | ')}`);
    }
    if (!result.ok || (Array.isArray(validationFailures) && validationFailures.length > 0)) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    console.error('Release preflight failed.');
    process.exitCode = 1;
    return;
  }

  console.log('Release preflight passed.');
}

main().catch((error) => {
  console.error('Release preflight crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
