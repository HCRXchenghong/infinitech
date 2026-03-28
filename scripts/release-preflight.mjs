const DEFAULT_TIMEOUT_MS = 5000;

function normalizeBaseUrl(value, fallback) {
  const text = String(value || fallback || '').trim();
  return text.replace(/\/+$/, '');
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

async function main() {
  const timeoutMs = Number.parseInt(process.env.PREFLIGHT_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;
  const bffBaseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const goBaseUrl = normalizeBaseUrl(process.env.GO_BASE_URL, 'http://127.0.0.1:1029');
  const socketBaseUrl = normalizeBaseUrl(process.env.SOCKET_BASE_URL, 'http://127.0.0.1:9898');
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();

  const probes = [
    { label: 'BFF ready', url: `${bffBaseUrl}/ready`, summary: collectBffSummary },
    { label: 'Go ready', url: `${goBaseUrl}/ready`, summary: () => '' },
    { label: 'Socket ready', url: `${socketBaseUrl}/ready`, summary: collectSocketSummary },
    { label: 'Socket stats', url: `${socketBaseUrl}/api/stats`, summary: collectSocketSummary }
  ];

  if (adminToken) {
    probes.push({
      label: 'Admin system health',
      url: `${bffBaseUrl}/api/system-health`,
      headers: { Authorization: `Bearer ${adminToken}` },
      summary: collectSystemHealthSummary
    });
  }

  let hasFailure = false;
  console.log(`Release preflight started at ${new Date().toISOString()}`);
  console.log(`Targets: BFF=${bffBaseUrl} GO=${goBaseUrl} SOCKET=${socketBaseUrl}`);

  for (const probe of probes) {
    const result = await probeJson(probe.url, timeoutMs, probe.headers || {});
    console.log(formatResult(probe.label, result));
    const summary = probe.summary(result.body);
    if (summary) {
      console.log(`  ${summary}`);
    }
    if (!result.ok) {
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
