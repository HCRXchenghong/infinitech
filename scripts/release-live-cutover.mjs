import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

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
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(Number(code || 0)));
  });
}

function isPassedStatus(value) {
  return String(value || '').trim().toLowerCase().startsWith('passed');
}

function hasAnyValue(values = []) {
  return values.some((value) => String(value || '').trim());
}

async function main() {
  const startedAt = new Date();
  const label = String(process.env.LIVE_CUTOVER_LABEL || timestampLabel(startedAt)).trim();
  const outputDir = path.resolve(
    process.cwd(),
    process.env.LIVE_CUTOVER_DIR || path.join('artifacts', 'release-live-cutover', label)
  );
  await ensureDir(outputDir);

  const requirePushTarget = parseBooleanEnv(process.env.LIVE_CUTOVER_REQUIRE_PUSH_TARGET, true);
  const requirePushProvider = parseBooleanEnv(process.env.LIVE_CUTOVER_REQUIRE_PUSH_PROVIDER, true);
  const requireRTCTarget = parseBooleanEnv(process.env.LIVE_CUTOVER_REQUIRE_RTC_TARGET, true);
  const requireRTCTurnServer = parseBooleanEnv(process.env.RTC_DRILL_REQUIRE_TURN_SERVER, false);

  const reportFile = path.join(outputDir, 'live-cutover.json');
  const releaseDrillDir = path.join(outputDir, 'release-drill');
  const summaryFile = path.join(releaseDrillDir, 'summary.json');

  const failures = [];
  const warnings = [];

  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const pushProvider = String(process.env.PUSH_DRILL_REQUIRE_PROVIDER || '').trim().toLowerCase();
  const pushTargetConfigured = hasAnyValue([
    process.env.PUSH_DRILL_REQUIRE_USER_TYPE,
    process.env.PUSH_DRILL_REQUIRE_USER_ID,
    process.env.PUSH_DRILL_REQUIRE_APP_ENV,
    process.env.PUSH_DRILL_REQUIRE_DEVICE_TOKEN_SUFFIX,
  ]);
  const rtcAuthToken = String(process.env.RTC_DRILL_AUTH_TOKEN || '').trim();
  const rtcCalleeRole = String(process.env.RTC_DRILL_CALLEE_ROLE || '').trim();
  const rtcCalleeId = String(process.env.RTC_DRILL_CALLEE_ID || '').trim();

  if (!adminToken) {
    failures.push('missing_admin_token');
  }
  if (requirePushProvider && !pushProvider) {
    failures.push('missing_push_drill_require_provider');
  }
  if (requirePushTarget && !pushTargetConfigured) {
    failures.push('missing_push_target_constraints');
  }
  if (requireRTCTarget) {
    if (!rtcAuthToken) failures.push('missing_rtc_drill_auth_token');
    if (!rtcCalleeRole) failures.push('missing_rtc_drill_callee_role');
    if (!rtcCalleeId) failures.push('missing_rtc_drill_callee_id');
  }
  if (!requireRTCTurnServer) {
    warnings.push('rtc_turn_server_not_required');
  }

  const report = {
    startedAt: startedAt.toISOString(),
    completedAt: '',
    status: 'running',
    label,
    outputDir,
    config: {
      requirePushTarget,
      requirePushProvider,
      requireRTCTarget,
      requireRTCTurnServer,
      pushProvider,
      pushTargetConfigured,
    },
    failures: [...failures],
    warnings,
    releaseDrill: {
      dir: releaseDrillDir,
      summaryFile,
      exitCode: null,
      summary: null,
    },
  };

  if (failures.length > 0) {
    report.status = 'failed';
    report.completedAt = new Date().toISOString();
    await writeJson(reportFile, report);
    console.error('Live cutover gate failed before running drills:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  const releaseDrillEnv = {
    RELEASE_DRILL_DIR: releaseDrillDir,
    RELEASE_DRILL_RUN_PUSH_DRILL: 'true',
    RELEASE_DRILL_RUN_RTC_DRILL: 'true',
    RELEASE_DRILL_RUN_RTC_RETENTION_DRILL: 'true',
    RTC_DRILL_REQUIRE_RUNTIME_ENABLED: 'true',
    RTC_DRILL_REQUIRE_ICE_SERVER_COUNT: String(process.env.RTC_DRILL_REQUIRE_ICE_SERVER_COUNT || '1'),
    RTC_DRILL_REQUIRE_TIMEOUT_MIN_SECONDS: String(process.env.RTC_DRILL_REQUIRE_TIMEOUT_MIN_SECONDS || '10'),
    RTC_DRILL_REQUIRE_TURN_SERVER: requireRTCTurnServer ? 'true' : 'false',
    PUSH_DRILL_REQUIRE_PRODUCTION_READY: 'true',
    PUSH_DRILL_REQUIRE_WORKER_RUNNING: 'true',
  };

  report.releaseDrill.exitCode = await runNodeScript(path.join('scripts', 'release-drill.mjs'), releaseDrillEnv);

  try {
    report.releaseDrill.summary = await readJson(summaryFile);
  } catch (error) {
    failures.push(`release_drill_summary_missing:${error instanceof Error ? error.message : String(error)}`);
  }

  if (report.releaseDrill.exitCode !== 0) {
    failures.push(`release_drill_exit=${report.releaseDrill.exitCode}`);
  }

  const summary = report.releaseDrill.summary;
  if (!summary || typeof summary !== 'object') {
    failures.push('release_drill_summary_invalid');
  } else {
    if (!isPassedStatus(summary.status)) {
      failures.push(`release_drill_status=${summary.status || 'missing'}`);
    }
    if (!isPassedStatus(summary.preflight && summary.preflight.status)) {
      failures.push(`preflight_status=${summary.preflight && summary.preflight.status || 'missing'}`);
    }
    if (!isPassedStatus(summary.httpLoadSmoke && summary.httpLoadSmoke.status)) {
      failures.push(`http_load_smoke_status=${summary.httpLoadSmoke && summary.httpLoadSmoke.status || 'missing'}`);
    }
    if (!isPassedStatus(summary.pushDeliveryDrill && summary.pushDeliveryDrill.status)) {
      failures.push(`push_delivery_drill_status=${summary.pushDeliveryDrill && summary.pushDeliveryDrill.status || 'missing'}`);
    }
    if (!isPassedStatus(summary.rtcCallDrill && summary.rtcCallDrill.status)) {
      failures.push(`rtc_call_drill_status=${summary.rtcCallDrill && summary.rtcCallDrill.status || 'missing'}`);
    }
    if (!isPassedStatus(summary.rtcRetentionDrill && summary.rtcRetentionDrill.status)) {
      failures.push(`rtc_retention_drill_status=${summary.rtcRetentionDrill && summary.rtcRetentionDrill.status || 'missing'}`);
    }
  }

  report.failures = [...new Set(failures)];
  report.status = report.failures.length === 0 ? 'passed' : 'failed';
  report.completedAt = new Date().toISOString();
  await writeJson(reportFile, report);

  if (report.status !== 'passed') {
    console.error('Live cutover gate failed:');
    for (const failure of report.failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Live cutover gate passed. Report written to ${reportFile}`);
}

main().catch((error) => {
  console.error('Live cutover gate crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
