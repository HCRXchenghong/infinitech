import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toNonNegativeFloat(value, fallback) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeReport(reportFile, report) {
  const target = String(reportFile || '').trim();
  if (!target) return;
  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Failure verification report written to ${target}`);
}

function toMapByName(summaries) {
  const map = new Map();
  for (const item of Array.isArray(summaries) ? summaries : []) {
    if (!item || typeof item !== 'object') continue;
    const name = String(item.name || '').trim();
    if (!name) continue;
    map.set(name, item);
  }
  return map;
}

function compareLoadSummaries(failures, baseline, restored, maxP95RegressionMs, maxP99RegressionMs, maxErrorRateRegression) {
  const baselineMap = toMapByName(baseline);
  const restoredMap = toMapByName(restored);
  for (const [name, baselineItem] of baselineMap.entries()) {
    const restoredItem = restoredMap.get(name);
    if (!restoredItem) {
      failures.push(`restored_missing_target=${name}`);
      continue;
    }
    const baselineErrorRate = Number(baselineItem.errorRate || 0);
    const restoredErrorRate = Number(restoredItem.errorRate || 0);
    if ((restoredErrorRate - baselineErrorRate) > maxErrorRateRegression) {
      failures.push(
        `${name}: restored errorRate regression ${(restoredErrorRate - baselineErrorRate).toFixed(4)} > ${maxErrorRateRegression}`
      );
    }

    const baselineP95 = Number(baselineItem.p95 || 0);
    const restoredP95 = Number(restoredItem.p95 || 0);
    if ((restoredP95 - baselineP95) > maxP95RegressionMs) {
      failures.push(`${name}: restored p95 regression ${restoredP95 - baselineP95}ms > ${maxP95RegressionMs}ms`);
    }

    const baselineP99 = Number(baselineItem.p99 || 0);
    const restoredP99 = Number(restoredItem.p99 || 0);
    if ((restoredP99 - baselineP99) > maxP99RegressionMs) {
      failures.push(`${name}: restored p99 regression ${restoredP99 - baselineP99}ms > ${maxP99RegressionMs}ms`);
    }
  }
}

function resolveStatus(summary) {
  return String(summary && summary.status || '').trim();
}

function comparePushDrill(failures, baseline, restored) {
  const baselineStatus = resolveStatus(baseline);
  const restoredStatus = resolveStatus(restored);
  if (!baselineStatus && !restoredStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !restoredStatus.startsWith('passed')) {
    failures.push(`restored_push_delivery_drill=${restoredStatus || 'missing'}`);
  }
}

function compareRTCDrill(failures, baseline, restored) {
  const baselineStatus = resolveStatus(baseline);
  const restoredStatus = resolveStatus(restored);
  if (!baselineStatus && !restoredStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !restoredStatus.startsWith('passed')) {
    failures.push(`restored_rtc_call_drill=${restoredStatus || 'missing'}`);
  }
}

function compareRTCRetentionDrill(failures, baseline, restored) {
  const baselineStatus = resolveStatus(baseline);
  const restoredStatus = resolveStatus(restored);
  if (!baselineStatus && !restoredStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !restoredStatus.startsWith('passed')) {
    failures.push(`restored_rtc_retention_drill=${restoredStatus || 'missing'}`);
  }
}

async function main() {
  const baselineFile = String(process.env.FAILURE_BASELINE_REPORT || '').trim();
  const degradedFile = String(process.env.FAILURE_DEGRADED_REPORT || '').trim();
  const restoredFile = String(process.env.FAILURE_RESTORED_REPORT || '').trim();
  const reportFile = String(process.env.FAILURE_VERIFY_REPORT_FILE || '').trim();
  const maxP95RegressionMs = toNonNegativeInt(process.env.FAILURE_MAX_P95_REGRESSION_MS, 250);
  const maxP99RegressionMs = toNonNegativeInt(process.env.FAILURE_MAX_P99_REGRESSION_MS, 400);
  const maxErrorRateRegression = toNonNegativeFloat(process.env.FAILURE_MAX_ERROR_RATE_REGRESSION, 0.02);

  if (!baselineFile || !degradedFile || !restoredFile) {
    console.error('FAILURE_BASELINE_REPORT, FAILURE_DEGRADED_REPORT and FAILURE_RESTORED_REPORT are required');
    process.exitCode = 1;
    return;
  }

  const [baseline, degraded, restored] = await Promise.all([
    readJson(baselineFile),
    readJson(degradedFile),
    readJson(restoredFile),
  ]);

  const failures = [];
  const baselinePreflightStatus = resolveStatus(baseline.preflight);
  const degradedPreflightStatus = resolveStatus(degraded.preflight);
  const restoredPreflightStatus = resolveStatus(restored.preflight);

  if (baselinePreflightStatus !== 'passed') {
    failures.push(`baseline_preflight=${baselinePreflightStatus || 'missing'}`);
  }
  if (!degradedPreflightStatus || degradedPreflightStatus === 'passed') {
    failures.push(`degraded_preflight_expected_not_passed=${degradedPreflightStatus || 'missing'}`);
  }
  if (restoredPreflightStatus !== 'passed') {
    failures.push(`restored_preflight=${restoredPreflightStatus || 'missing'}`);
  }

  compareLoadSummaries(
    failures,
    baseline.httpLoadSmoke && baseline.httpLoadSmoke.result && baseline.httpLoadSmoke.result.summaries,
    restored.httpLoadSmoke && restored.httpLoadSmoke.result && restored.httpLoadSmoke.result.summaries,
    maxP95RegressionMs,
    maxP99RegressionMs,
    maxErrorRateRegression
  );

  comparePushDrill(failures, baseline.pushDeliveryDrill, restored.pushDeliveryDrill);
  compareRTCDrill(failures, baseline.rtcCallDrill, restored.rtcCallDrill);
  compareRTCRetentionDrill(failures, baseline.rtcRetentionDrill, restored.rtcRetentionDrill);

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    baselineReport: baselineFile,
    degradedReport: degradedFile,
    restoredReport: restoredFile,
    thresholds: {
      maxP95RegressionMs,
      maxP99RegressionMs,
      maxErrorRateRegression,
    },
    failures,
  };

  await writeReport(reportFile, report);

  if (failures.length > 0) {
    console.error('Failure verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Failure verification passed.');
}

main().catch((error) => {
  console.error('Failure verification crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
