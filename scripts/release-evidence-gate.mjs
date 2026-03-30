import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveStatus(summary) {
  return String(summary && summary.status || '').trim();
}

function isPassedStatus(summary) {
  return resolveStatus(summary).startsWith('passed');
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
  console.log(`Release evidence report written to ${target}`);
}

function collectLiveCutoverFailures(failures, liveCutover) {
  if (!liveCutover || typeof liveCutover !== 'object') {
    failures.push('live_cutover_report_invalid');
    return;
  }

  if (!isPassedStatus(liveCutover)) {
    failures.push(`live_cutover_status=${resolveStatus(liveCutover) || 'missing'}`);
  }

  if (Array.isArray(liveCutover.failures) && liveCutover.failures.length > 0) {
    failures.push(`live_cutover_failures=${liveCutover.failures.join(',')}`);
  }

  const releaseDrill = liveCutover.releaseDrill && liveCutover.releaseDrill.summary;
  if (!releaseDrill || typeof releaseDrill !== 'object') {
    failures.push('live_cutover_release_drill_summary_missing');
    return;
  }

  if (!isPassedStatus(releaseDrill)) {
    failures.push(`live_cutover_release_drill=${resolveStatus(releaseDrill) || 'missing'}`);
  }
  if (!isPassedStatus(releaseDrill.preflight)) {
    failures.push(`live_cutover_preflight=${resolveStatus(releaseDrill.preflight) || 'missing'}`);
  }
  if (!isPassedStatus(releaseDrill.httpLoadSmoke)) {
    failures.push(`live_cutover_http_load_smoke=${resolveStatus(releaseDrill.httpLoadSmoke) || 'missing'}`);
  }
  if (!isPassedStatus(releaseDrill.pushDeliveryDrill)) {
    failures.push(`live_cutover_push_delivery_drill=${resolveStatus(releaseDrill.pushDeliveryDrill) || 'missing'}`);
  }
  if (!isPassedStatus(releaseDrill.rtcCallDrill)) {
    failures.push(`live_cutover_rtc_call_drill=${resolveStatus(releaseDrill.rtcCallDrill) || 'missing'}`);
  }
  if (!isPassedStatus(releaseDrill.rtcRetentionDrill)) {
    failures.push(`live_cutover_rtc_retention_drill=${resolveStatus(releaseDrill.rtcRetentionDrill) || 'missing'}`);
  }
}

function collectVerificationFailures(failures, prefix, report) {
  if (!report || typeof report !== 'object') {
    failures.push(`${prefix}_report_invalid`);
    return;
  }
  if (!isPassedStatus(report)) {
    failures.push(`${prefix}_status=${resolveStatus(report) || 'missing'}`);
  }
  if (Array.isArray(report.failures) && report.failures.length > 0) {
    failures.push(`${prefix}_failures=${report.failures.join(',')}`);
  }
}

function collectAgeFailure(failures, label, report, maxAgeMinutes) {
  if (!maxAgeMinutes) return;
  const completedAt = String(report && report.completedAt || '').trim();
  if (!completedAt) {
    failures.push(`${label}_completed_at_missing`);
    return;
  }
  const completedTime = Date.parse(completedAt);
  if (!Number.isFinite(completedTime)) {
    failures.push(`${label}_completed_at_invalid`);
    return;
  }
  const ageMinutes = Math.floor((Date.now() - completedTime) / 60000);
  if (ageMinutes > maxAgeMinutes) {
    failures.push(`${label}_age_minutes=${ageMinutes}>${maxAgeMinutes}`);
  }
}

async function main() {
  const liveCutoverFile = String(process.env.LIVE_CUTOVER_REPORT || '').trim();
  const rollbackVerifyFile = String(process.env.ROLLBACK_VERIFY_REPORT || '').trim();
  const failureVerifyFile = String(process.env.FAILURE_VERIFY_REPORT || '').trim();
  const reportFile = String(process.env.EVIDENCE_REPORT_FILE || '').trim();
  const maxReportAgeMinutes = toNonNegativeInt(process.env.EVIDENCE_MAX_REPORT_AGE_MINUTES, 0);

  if (!liveCutoverFile || !rollbackVerifyFile || !failureVerifyFile) {
    console.error('LIVE_CUTOVER_REPORT, ROLLBACK_VERIFY_REPORT, and FAILURE_VERIFY_REPORT are required');
    process.exitCode = 1;
    return;
  }

  const [liveCutover, rollbackVerify, failureVerify] = await Promise.all([
    readJson(liveCutoverFile),
    readJson(rollbackVerifyFile),
    readJson(failureVerifyFile),
  ]);

  const failures = [];

  collectLiveCutoverFailures(failures, liveCutover);
  collectVerificationFailures(failures, 'rollback_verify', rollbackVerify);
  collectVerificationFailures(failures, 'failure_verify', failureVerify);
  collectAgeFailure(failures, 'live_cutover', liveCutover, maxReportAgeMinutes);
  collectAgeFailure(failures, 'rollback_verify', rollbackVerify, maxReportAgeMinutes);
  collectAgeFailure(failures, 'failure_verify', failureVerify, maxReportAgeMinutes);

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    reports: {
      liveCutover: liveCutoverFile,
      rollbackVerify: rollbackVerifyFile,
      failureVerify: failureVerifyFile,
    },
    config: {
      maxReportAgeMinutes,
    },
    failures,
  };

  await writeReport(reportFile, report);

  if (failures.length > 0) {
    console.error('Release evidence gate failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Release evidence gate passed.');
}

main().catch((error) => {
  console.error('Release evidence gate crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
