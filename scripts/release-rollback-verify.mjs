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
  console.log(`Rollback verification report written to ${target}`);
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

function compareLoadSummaries(failures, baseline, candidate, maxP95RegressionMs, maxP99RegressionMs, maxErrorRateRegression) {
  const baselineMap = toMapByName(baseline);
  const candidateMap = toMapByName(candidate);
  for (const [name, baselineItem] of baselineMap.entries()) {
    const candidateItem = candidateMap.get(name);
    if (!candidateItem) {
      failures.push(`missing_target=${name}`);
      continue;
    }
    const baselineErrorRate = Number(baselineItem.errorRate || 0);
    const candidateErrorRate = Number(candidateItem.errorRate || 0);
    if ((candidateErrorRate - baselineErrorRate) > maxErrorRateRegression) {
      failures.push(
        `${name}: errorRate regression ${(candidateErrorRate - baselineErrorRate).toFixed(4)} > ${maxErrorRateRegression}`
      );
    }

    const baselineP95 = Number(baselineItem.p95 || 0);
    const candidateP95 = Number(candidateItem.p95 || 0);
    if ((candidateP95 - baselineP95) > maxP95RegressionMs) {
      failures.push(`${name}: p95 regression ${candidateP95 - baselineP95}ms > ${maxP95RegressionMs}ms`);
    }

    const baselineP99 = Number(baselineItem.p99 || 0);
    const candidateP99 = Number(candidateItem.p99 || 0);
    if ((candidateP99 - baselineP99) > maxP99RegressionMs) {
      failures.push(`${name}: p99 regression ${candidateP99 - baselineP99}ms > ${maxP99RegressionMs}ms`);
    }
  }
}

function comparePushDrill(failures, baseline, candidate) {
  const baselineStatus = String(baseline && baseline.status || '').trim();
  const candidateStatus = String(candidate && candidate.status || '').trim();
  if (!baselineStatus && !candidateStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !candidateStatus.startsWith('passed')) {
    failures.push(`push_delivery_drill=${candidateStatus || 'missing'}`);
  }
}

function compareRTCDrill(failures, baseline, candidate) {
  const baselineStatus = String(baseline && baseline.status || '').trim();
  const candidateStatus = String(candidate && candidate.status || '').trim();
  if (!baselineStatus && !candidateStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !candidateStatus.startsWith('passed')) {
    failures.push(`rtc_call_drill=${candidateStatus || 'missing'}`);
  }
}

function compareRTCRetentionDrill(failures, baseline, candidate) {
  const baselineStatus = String(baseline && baseline.status || '').trim();
  const candidateStatus = String(candidate && candidate.status || '').trim();
  if (!baselineStatus && !candidateStatus) {
    return;
  }
  if (baselineStatus.startsWith('passed') && !candidateStatus.startsWith('passed')) {
    failures.push(`rtc_retention_drill=${candidateStatus || 'missing'}`);
  }
}

function comparePreflight(failures, baseline, candidate) {
  const baselineStatus = String(baseline && baseline.status || '').trim();
  const candidateStatus = String(candidate && candidate.status || '').trim();
  if (baselineStatus === 'passed' && candidateStatus !== 'passed') {
    failures.push(`candidate_preflight=${candidateStatus || 'missing'}`);
  }
}

async function main() {
  const baselineFile = String(process.env.ROLLBACK_BASELINE_REPORT || '').trim();
  const candidateFile = String(process.env.ROLLBACK_CANDIDATE_REPORT || '').trim();
  const reportFile = String(process.env.ROLLBACK_VERIFY_REPORT_FILE || '').trim();
  const maxP95RegressionMs = toNonNegativeInt(process.env.ROLLBACK_MAX_P95_REGRESSION_MS, 200);
  const maxP99RegressionMs = toNonNegativeInt(process.env.ROLLBACK_MAX_P99_REGRESSION_MS, 300);
  const maxErrorRateRegression = toNonNegativeFloat(process.env.ROLLBACK_MAX_ERROR_RATE_REGRESSION, 0.01);

  if (!baselineFile || !candidateFile) {
    console.error('ROLLBACK_BASELINE_REPORT and ROLLBACK_CANDIDATE_REPORT are required');
    process.exitCode = 1;
    return;
  }

  const [baseline, candidate] = await Promise.all([readJson(baselineFile), readJson(candidateFile)]);
  const failures = [];

  comparePreflight(failures, baseline.preflight, candidate.preflight);
  compareLoadSummaries(
    failures,
    baseline.httpLoadSmoke && baseline.httpLoadSmoke.result && baseline.httpLoadSmoke.result.summaries,
    candidate.httpLoadSmoke && candidate.httpLoadSmoke.result && candidate.httpLoadSmoke.result.summaries,
    maxP95RegressionMs,
    maxP99RegressionMs,
    maxErrorRateRegression
  );
  comparePushDrill(failures, baseline.pushDeliveryDrill, candidate.pushDeliveryDrill);
  compareRTCDrill(failures, baseline.rtcCallDrill, candidate.rtcCallDrill);
  compareRTCRetentionDrill(failures, baseline.rtcRetentionDrill, candidate.rtcRetentionDrill);

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    baselineReport: baselineFile,
    candidateReport: candidateFile,
    thresholds: {
      maxP95RegressionMs,
      maxP99RegressionMs,
      maxErrorRateRegression,
    },
    failures,
  };

  await writeReport(reportFile, report);

  if (failures.length > 0) {
    console.error('Rollback verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Rollback verification passed.');
}

main().catch((error) => {
  console.error('Rollback verification crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
