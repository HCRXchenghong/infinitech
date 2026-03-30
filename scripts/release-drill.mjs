import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toPositiveFloat(value, fallback) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanEnv(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function timestampLabel(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runNodeScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      resolve(Number(code || 0));
    });
  });
}

async function main() {
  const startedAt = new Date();
  const label = process.env.DRILL_LABEL || timestampLabel(startedAt);
  const outputDir = path.resolve(
    process.cwd(),
    process.env.RELEASE_DRILL_DIR || path.join('artifacts', 'release-drills', label)
  );
  await ensureDir(outputDir);

  const preflightReport = path.join(outputDir, 'preflight.json');
  const smokeReport = path.join(outputDir, 'http-load-smoke.json');
  const pushDrillReport = path.join(outputDir, 'push-delivery-drill.json');
  const rtcDrillReport = path.join(outputDir, 'rtc-call-drill.json');
  const rtcRetentionDrillReport = path.join(outputDir, 'rtc-retention-drill.json');
  const summaryReport = path.join(outputDir, 'summary.json');
  const runPushDrill = parseBooleanEnv(process.env.RELEASE_DRILL_RUN_PUSH_DRILL, Boolean(String(process.env.ADMIN_TOKEN || '').trim()));
  const runRTCDrill = parseBooleanEnv(
    process.env.RELEASE_DRILL_RUN_RTC_DRILL,
    Boolean(
      String(process.env.RTC_DRILL_AUTH_TOKEN || '').trim() &&
      String(process.env.RTC_DRILL_CALLEE_ROLE || '').trim() &&
      String(process.env.RTC_DRILL_CALLEE_ID || '').trim()
    )
  );
  const runRTCRetentionDrill = parseBooleanEnv(
    process.env.RELEASE_DRILL_RUN_RTC_RETENTION_DRILL,
    Boolean(String(process.env.ADMIN_TOKEN || '').trim())
  );

  const preflightCode = await runNodeScript(path.join('scripts', 'release-preflight.mjs'), {
    PREFLIGHT_REPORT_FILE: preflightReport,
    PREFLIGHT_RUN_HTTP_LOAD_SMOKE: 'false'
  });

  const smokeCode = await runNodeScript(path.join('scripts', 'http-load-smoke.mjs'), {
    LOAD_REPORT_FILE: smokeReport,
    LOAD_CONCURRENCY: String(toPositiveInt(process.env.LOAD_CONCURRENCY, 16)),
    LOAD_REQUESTS_PER_TARGET: String(toPositiveInt(process.env.LOAD_REQUESTS_PER_TARGET, 120)),
    LOAD_TIMEOUT_MS: String(toPositiveInt(process.env.LOAD_TIMEOUT_MS, 5000)),
    LOAD_MAX_ERROR_RATE: String(toPositiveFloat(process.env.LOAD_MAX_ERROR_RATE, 0.02)),
    LOAD_MAX_P95_MS: String(toPositiveInt(process.env.LOAD_MAX_P95_MS, 0)),
    LOAD_MAX_P99_MS: String(toPositiveInt(process.env.LOAD_MAX_P99_MS, 0))
  });

  let pushDrillCode = 0;
  if (runPushDrill) {
    pushDrillCode = await runNodeScript(path.join('scripts', 'push-delivery-drill.mjs'), {
      PUSH_DRILL_REPORT_FILE: pushDrillReport,
    });
  }

  let rtcDrillCode = 0;
  if (runRTCDrill) {
    rtcDrillCode = await runNodeScript(path.join('scripts', 'rtc-call-drill.mjs'), {
      RTC_DRILL_REPORT_FILE: rtcDrillReport,
    });
  }

  let rtcRetentionDrillCode = 0;
  if (runRTCRetentionDrill) {
    rtcRetentionDrillCode = await runNodeScript(path.join('scripts', 'rtc-retention-drill.mjs'), {
      RTC_RETENTION_DRILL_REPORT_FILE: rtcRetentionDrillReport,
    });
  }

  const summary = {
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    status: preflightCode === 0
      && smokeCode === 0
      && pushDrillCode === 0
      && rtcDrillCode === 0
      && rtcRetentionDrillCode === 0
      ? 'passed'
      : 'failed',
    label,
    outputDir,
    reports: {
      preflight: preflightReport,
      httpLoadSmoke: smokeReport,
      pushDeliveryDrill: runPushDrill ? pushDrillReport : '',
      rtcCallDrill: runRTCDrill ? rtcDrillReport : '',
      rtcRetentionDrill: runRTCRetentionDrill ? rtcRetentionDrillReport : ''
    },
    exitCodes: {
      preflight: preflightCode,
      httpLoadSmoke: smokeCode,
      pushDeliveryDrill: runPushDrill ? pushDrillCode : null,
      rtcCallDrill: runRTCDrill ? rtcDrillCode : null,
      rtcRetentionDrill: runRTCRetentionDrill ? rtcRetentionDrillCode : null
    },
    rollbackChecklist: [
      'Confirm the previous production release tag or commit is known and reachable.',
      'Keep the generated preflight and smoke reports with the launch ticket.',
      'Verify /ready, /api/system-health, and socket /api/stats before and after rollback.',
      'Verify push worker health and queue age after rollback.',
      'Verify admin chat console, merchant chat, rider support chat, and consumer message list after rollback.',
      'If you run manual fault drills, compare baseline/degraded/restored reports with scripts/release-failure-verify.mjs.'
    ]
  };

  try {
    summary.preflight = await readJson(preflightReport);
  } catch (error) {
    summary.preflight = { status: 'missing', error: error instanceof Error ? error.message : String(error) };
  }

  try {
    summary.httpLoadSmoke = await readJson(smokeReport);
  } catch (error) {
    summary.httpLoadSmoke = { status: 'missing', error: error instanceof Error ? error.message : String(error) };
  }

  if (runPushDrill) {
    try {
      summary.pushDeliveryDrill = await readJson(pushDrillReport);
    } catch (error) {
      summary.pushDeliveryDrill = { status: 'missing', error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    summary.pushDeliveryDrill = { status: 'skipped', reason: 'ADMIN_TOKEN missing or RELEASE_DRILL_RUN_PUSH_DRILL=false' };
  }

  if (runRTCDrill) {
    try {
      summary.rtcCallDrill = await readJson(rtcDrillReport);
    } catch (error) {
      summary.rtcCallDrill = { status: 'missing', error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    summary.rtcCallDrill = {
      status: 'skipped',
      reason: 'RTC_DRILL_AUTH_TOKEN / RTC_DRILL_CALLEE_ROLE / RTC_DRILL_CALLEE_ID missing or RELEASE_DRILL_RUN_RTC_DRILL=false'
    };
  }

  if (runRTCRetentionDrill) {
    try {
      summary.rtcRetentionDrill = await readJson(rtcRetentionDrillReport);
    } catch (error) {
      summary.rtcRetentionDrill = { status: 'missing', error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    summary.rtcRetentionDrill = {
      status: 'skipped',
      reason: 'ADMIN_TOKEN missing or RELEASE_DRILL_RUN_RTC_RETENTION_DRILL=false'
    };
  }

  await writeJson(summaryReport, summary);
  console.log(`Release drill summary written to ${summaryReport}`);

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Release drill crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
