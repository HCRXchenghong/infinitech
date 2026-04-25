import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

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

function collectSupportGateFailures(failures, prefix, report) {
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
  if (String(report.error || '').trim()) {
    failures.push(`${prefix}_error=${String(report.error).trim()}`);
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

export function evaluateReleaseEvidenceBundle({
  liveCutover = null,
  rollbackVerify = null,
  failureVerify = null,
  secretRotation = null,
  realtimeAcceptance = null,
} = {}) {
  const failures = [];
  collectLiveCutoverFailures(failures, liveCutover);
  collectVerificationFailures(failures, 'rollback_verify', rollbackVerify);
  collectVerificationFailures(failures, 'failure_verify', failureVerify);
  collectSupportGateFailures(failures, 'secret_rotation', secretRotation);
  collectSupportGateFailures(failures, 'realtime_acceptance', realtimeAcceptance);
  return failures;
}

export async function assertReleaseEvidenceGate(options = {}) {
  const liveCutoverFile = String(options.liveCutoverFile || process.env.LIVE_CUTOVER_REPORT || '').trim();
  const rollbackVerifyFile = String(options.rollbackVerifyFile || process.env.ROLLBACK_VERIFY_REPORT || '').trim();
  const failureVerifyFile = String(options.failureVerifyFile || process.env.FAILURE_VERIFY_REPORT || '').trim();
  const secretRotationFile = String(
    options.secretRotationFile || process.env.SECRET_ROTATION_GATE_REPORT || ''
  ).trim();
  const realtimeAcceptanceFile = String(
    options.realtimeAcceptanceFile || process.env.REALTIME_ACCEPTANCE_REPORT || ''
  ).trim();
  const maxReportAgeMinutes = toNonNegativeInt(
    options.maxReportAgeMinutes ?? process.env.EVIDENCE_MAX_REPORT_AGE_MINUTES,
    0,
  );

  if (!liveCutoverFile || !rollbackVerifyFile || !failureVerifyFile || !secretRotationFile || !realtimeAcceptanceFile) {
    throw new Error(
      'LIVE_CUTOVER_REPORT, ROLLBACK_VERIFY_REPORT, FAILURE_VERIFY_REPORT, SECRET_ROTATION_GATE_REPORT, and REALTIME_ACCEPTANCE_REPORT are required'
    );
  }

  const [liveCutover, rollbackVerify, failureVerify, secretRotation, realtimeAcceptance] = await Promise.all([
    readJson(liveCutoverFile),
    readJson(rollbackVerifyFile),
    readJson(failureVerifyFile),
    readJson(secretRotationFile),
    readJson(realtimeAcceptanceFile),
  ]);

  const failures = evaluateReleaseEvidenceBundle({
    liveCutover,
    rollbackVerify,
    failureVerify,
    secretRotation,
    realtimeAcceptance,
  });
  collectAgeFailure(failures, 'live_cutover', liveCutover, maxReportAgeMinutes);
  collectAgeFailure(failures, 'rollback_verify', rollbackVerify, maxReportAgeMinutes);
  collectAgeFailure(failures, 'failure_verify', failureVerify, maxReportAgeMinutes);
  collectAgeFailure(failures, 'secret_rotation', secretRotation, maxReportAgeMinutes);
  collectAgeFailure(failures, 'realtime_acceptance', realtimeAcceptance, maxReportAgeMinutes);

  return {
    liveCutoverFile,
    rollbackVerifyFile,
    failureVerifyFile,
    secretRotationFile,
    realtimeAcceptanceFile,
    maxReportAgeMinutes,
    failures,
  };
}

async function main() {
  const reportFile = String(process.env.EVIDENCE_REPORT_FILE || '').trim();
  const {
    liveCutoverFile,
    rollbackVerifyFile,
    failureVerifyFile,
    secretRotationFile,
    realtimeAcceptanceFile,
    maxReportAgeMinutes,
    failures,
  } = await assertReleaseEvidenceGate();

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    reports: {
      liveCutover: liveCutoverFile,
      rollbackVerify: rollbackVerifyFile,
      failureVerify: failureVerifyFile,
      secretRotation: secretRotationFile,
      realtimeAcceptance: realtimeAcceptanceFile,
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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error('Release evidence gate crashed:', error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
