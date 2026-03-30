import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function writeReport(reportFile, report) {
  const target = String(reportFile || '').trim();
  if (!target) return;

  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`RTC retention drill report written to ${target}`);
}

async function main() {
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  if (!adminToken) {
    throw new Error('ADMIN_TOKEN is required for rtc retention drill');
  }

  const baseUrl = String(process.env.BFF_BASE_URL || 'http://127.0.0.1:25500').trim().replace(/\/+$/, '');
  const limit = parseIntegerEnv(process.env.RTC_RETENTION_DRILL_LIMIT, 50);
  const timeoutMs = parseIntegerEnv(process.env.RTC_RETENTION_DRILL_TIMEOUT_MS, 10000);
  const startedAt = new Date().toISOString();
  const url = `${baseUrl}/api/admin/rtc-call-audits/cleanup-cycle?limit=${encodeURIComponent(String(limit))}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let body = null;
  let error = '';
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      signal: controller.signal
    });
    body = await response.json().catch(() => null);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }

  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    baseUrl,
    url,
    timeoutMs,
    limit,
    ok: Boolean(response && response.ok),
    status: response ? response.status : 0,
    error,
    body,
  };

  const after = body && body.data && body.data.after && typeof body.data.after === 'object'
    ? body.data.after
    : null;
  if (!report.ok) {
    await writeReport(process.env.RTC_RETENTION_DRILL_REPORT_FILE, report);
    throw new Error(error || `rtc retention drill failed with status ${report.status || 0}`);
  }
  if (after && String(after.lastCleanupStatus || '').trim().toLowerCase().includes('error')) {
    await writeReport(process.env.RTC_RETENTION_DRILL_REPORT_FILE, report);
    throw new Error(`rtc retention cleanup reported error status: ${after.lastCleanupStatus}`);
  }

  await writeReport(process.env.RTC_RETENTION_DRILL_REPORT_FILE, report);
}

main().catch((error) => {
  console.error('RTC retention drill failed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
