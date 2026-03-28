const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 16;
const DEFAULT_REQUESTS_PER_TARGET = 120;
const DEFAULT_MAX_ERROR_RATE = 0.02;

function normalizeBaseUrl(value, fallback) {
  const text = String(value || fallback || '').trim().replace(/\/+$/, '');
  return text;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toPositiveFloat(value, fallback) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index];
}

async function hitTarget(target, timeoutMs) {
  const startedAt = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(new Error(`timeout_${timeoutMs}ms`)), timeoutMs)
    : null;

  try {
    const response = await fetch(target.url, {
      method: 'GET',
      headers: {
        'X-Request-ID': `load-smoke-${target.name}-${startedAt}`
      },
      signal: controller ? controller.signal : undefined
    });
    const latencyMs = Date.now() - startedAt;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      latencyMs,
      error: '',
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    return {
      ok: false,
      status: 0,
      latencyMs,
      error: error && error.message ? String(error.message) : 'request_failed',
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function runTarget(target, concurrency, requestsPerTarget, timeoutMs) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= requestsPerTarget) {
        return;
      }
      results.push(await hitTarget(target, timeoutMs));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function summarize(target, results) {
  const total = results.length;
  const success = results.filter((item) => item.ok).length;
  const errors = total - success;
  const latencies = results.map((item) => item.latencyMs).sort((a, b) => a - b);
  const errorSamples = Array.from(new Set(results.filter((item) => !item.ok).map((item) => item.error || `status_${item.status}`))).slice(0, 5);

  return {
    name: target.name,
    url: target.url,
    total,
    success,
    errors,
    errorRate: total > 0 ? errors / total : 0,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
    max: latencies.length ? latencies[latencies.length - 1] : 0,
    errorSamples
  };
}

async function main() {
  const bffBaseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const goBaseUrl = normalizeBaseUrl(process.env.GO_API_URL, 'http://127.0.0.1:1029');
  const socketBaseUrl = normalizeBaseUrl(process.env.SOCKET_SERVER_URL, 'http://127.0.0.1:9898');
  const concurrency = toPositiveInt(process.env.LOAD_CONCURRENCY, DEFAULT_CONCURRENCY);
  const requestsPerTarget = toPositiveInt(process.env.LOAD_REQUESTS_PER_TARGET, DEFAULT_REQUESTS_PER_TARGET);
  const timeoutMs = toPositiveInt(process.env.LOAD_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const maxErrorRate = toPositiveFloat(process.env.LOAD_MAX_ERROR_RATE, DEFAULT_MAX_ERROR_RATE);
  const maxP95Ms = toPositiveInt(process.env.LOAD_MAX_P95_MS, 0);

  const targets = [
    { name: 'bff_ready', url: `${bffBaseUrl}/ready` },
    { name: 'go_ready', url: `${goBaseUrl}/ready` },
    { name: 'socket_ready', url: `${socketBaseUrl}/ready` },
    { name: 'socket_stats', url: `${socketBaseUrl}/api/stats` }
  ];

  console.log(`Starting HTTP load smoke: concurrency=${concurrency} requestsPerTarget=${requestsPerTarget} timeoutMs=${timeoutMs}`);

  const summaries = [];
  for (const target of targets) {
    console.log(`Running target ${target.name} -> ${target.url}`);
    const results = await runTarget(target, concurrency, requestsPerTarget, timeoutMs);
    const summary = summarize(target, results);
    summaries.push(summary);
    console.log(
      `${summary.name}: total=${summary.total} success=${summary.success} errors=${summary.errors} errorRate=${summary.errorRate.toFixed(4)} p50=${summary.p50}ms p95=${summary.p95}ms p99=${summary.p99}ms max=${summary.max}ms`
    );
    if (summary.errorSamples.length) {
      console.log(`  errorSamples=${summary.errorSamples.join(', ')}`);
    }
  }

  const failures = [];
  for (const summary of summaries) {
    if (summary.errorRate > maxErrorRate) {
      failures.push(`${summary.name}: errorRate ${summary.errorRate.toFixed(4)} > ${maxErrorRate}`);
    }
    if (maxP95Ms > 0 && summary.p95 > maxP95Ms) {
      failures.push(`${summary.name}: p95 ${summary.p95}ms > ${maxP95Ms}ms`);
    }
  }

  if (failures.length) {
    console.error('HTTP load smoke failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('HTTP load smoke passed.');
}

main().catch((error) => {
  console.error('HTTP load smoke crashed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
