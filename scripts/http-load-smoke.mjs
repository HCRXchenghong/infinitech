export const DEFAULT_TIMEOUT_MS = 5000;
export const DEFAULT_CONCURRENCY = 16;
export const DEFAULT_REQUESTS_PER_TARGET = 120;
export const DEFAULT_MAX_ERROR_RATE = 0.02;
export const DEFAULT_MAX_P99_MS = 0;

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

export function createDefaultTargets({
  bffBaseUrl = 'http://127.0.0.1:25500',
  goBaseUrl = 'http://127.0.0.1:1029',
  socketBaseUrl = 'http://127.0.0.1:9898'
} = {}) {
  return [
    { name: 'bff_ready', url: `${normalizeBaseUrl(bffBaseUrl, 'http://127.0.0.1:25500')}/ready` },
    { name: 'go_ready', url: `${normalizeBaseUrl(goBaseUrl, 'http://127.0.0.1:1029')}/ready` },
    { name: 'socket_ready', url: `${normalizeBaseUrl(socketBaseUrl, 'http://127.0.0.1:9898')}/ready` },
    { name: 'socket_stats', url: `${normalizeBaseUrl(socketBaseUrl, 'http://127.0.0.1:9898')}/api/stats` }
  ];
}

export async function runLoadSmoke({
  targets = createDefaultTargets(),
  concurrency = DEFAULT_CONCURRENCY,
  requestsPerTarget = DEFAULT_REQUESTS_PER_TARGET,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxErrorRate = DEFAULT_MAX_ERROR_RATE,
  maxP95Ms = 0,
  maxP99Ms = DEFAULT_MAX_P99_MS,
  logger = console
} = {}) {
  logger.log(
    `Starting HTTP load smoke: concurrency=${concurrency} requestsPerTarget=${requestsPerTarget} timeoutMs=${timeoutMs}`
  );
  const summaries = [];
  for (const target of targets) {
    logger.log(`Running target ${target.name} -> ${target.url}`);
    const results = await runTarget(target, concurrency, requestsPerTarget, timeoutMs);
    const summary = summarize(target, results);
    summaries.push(summary);
    logger.log(
      `${summary.name}: total=${summary.total} success=${summary.success} errors=${summary.errors} errorRate=${summary.errorRate.toFixed(4)} p50=${summary.p50}ms p95=${summary.p95}ms p99=${summary.p99}ms max=${summary.max}ms`
    );
    if (summary.errorSamples.length) {
      logger.log(`  errorSamples=${summary.errorSamples.join(', ')}`);
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
    if (maxP99Ms > 0 && summary.p99 > maxP99Ms) {
      failures.push(`${summary.name}: p99 ${summary.p99}ms > ${maxP99Ms}ms`);
    }
  }

  if (failures.length) {
    logger.error('HTTP load smoke failed:');
    for (const failure of failures) {
      logger.error(`- ${failure}`);
    }
    return {
      ok: false,
      summaries,
      failures
    };
  }

  logger.log('HTTP load smoke passed.');
  return {
    ok: true,
    summaries,
    failures: []
  };
}

function readCliOptions() {
  const bffBaseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const goBaseUrl = normalizeBaseUrl(process.env.GO_API_URL, 'http://127.0.0.1:1029');
  const socketBaseUrl = normalizeBaseUrl(process.env.SOCKET_SERVER_URL, 'http://127.0.0.1:9898');
  return {
    targets: createDefaultTargets({ bffBaseUrl, goBaseUrl, socketBaseUrl }),
    concurrency: toPositiveInt(process.env.LOAD_CONCURRENCY, DEFAULT_CONCURRENCY),
    requestsPerTarget: toPositiveInt(process.env.LOAD_REQUESTS_PER_TARGET, DEFAULT_REQUESTS_PER_TARGET),
    timeoutMs: toPositiveInt(process.env.LOAD_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxErrorRate: toPositiveFloat(process.env.LOAD_MAX_ERROR_RATE, DEFAULT_MAX_ERROR_RATE),
    maxP95Ms: toPositiveInt(process.env.LOAD_MAX_P95_MS, 0),
    maxP99Ms: toPositiveInt(process.env.LOAD_MAX_P99_MS, DEFAULT_MAX_P99_MS)
  };
}

async function main() {
  const result = await runLoadSmoke(readCliOptions());
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('HTTP load smoke crashed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
