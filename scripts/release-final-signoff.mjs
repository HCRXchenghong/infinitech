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
  console.log(`Final signoff report written to ${target}`);
}

function collectAgeFailure(failures, label, completedAt, maxAgeMinutes) {
  if (!maxAgeMinutes) return;
  const value = String(completedAt || '').trim();
  if (!value) {
    failures.push(`${label}_completed_at_missing`);
    return;
  }
  const completedTime = Date.parse(value);
  if (!Number.isFinite(completedTime)) {
    failures.push(`${label}_completed_at_invalid`);
    return;
  }
  const ageMinutes = Math.floor((Date.now() - completedTime) / 60000);
  if (ageMinutes > maxAgeMinutes) {
    failures.push(`${label}_age_minutes=${ageMinutes}>${maxAgeMinutes}`);
  }
}

function collectEvidenceFailures(failures, evidenceReport) {
  if (!evidenceReport || typeof evidenceReport !== 'object') {
    failures.push('evidence_report_invalid');
    return;
  }
  if (!isPassedStatus(evidenceReport)) {
    failures.push(`evidence_status=${resolveStatus(evidenceReport) || 'missing'}`);
  }
  if (Array.isArray(evidenceReport.failures) && evidenceReport.failures.length > 0) {
    failures.push(`evidence_failures=${evidenceReport.failures.join(',')}`);
  }
}

function hasEvidenceItem(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(
    String(item.path || '').trim() ||
    String(item.url || '').trim() ||
    String(item.note || '').trim()
  );
}

function collectSectionFailures(failures, sectionName, section) {
  if (!section || typeof section !== 'object') {
    failures.push(`${sectionName}_section_missing`);
    return;
  }
  if (resolveStatus(section) !== 'passed') {
    failures.push(`${sectionName}_status=${resolveStatus(section) || 'missing'}`);
  }
  if (!String(section.operator || '').trim()) {
    failures.push(`${sectionName}_operator_missing`);
  }
  if (!String(section.completedAt || '').trim()) {
    failures.push(`${sectionName}_completed_at_missing`);
  }
  if (!String(section.summary || '').trim()) {
    failures.push(`${sectionName}_summary_missing`);
  }
  const evidence = Array.isArray(section.evidence) ? section.evidence : [];
  if (evidence.length === 0) {
    failures.push(`${sectionName}_evidence_missing`);
  } else if (!evidence.some((item) => hasEvidenceItem(item))) {
    failures.push(`${sectionName}_evidence_invalid`);
  }
}

function collectManualFailures(failures, manualReport) {
  if (!manualReport || typeof manualReport !== 'object') {
    failures.push('manual_attestation_invalid');
    return;
  }
  if (!String(manualReport.environment || '').trim()) {
    failures.push('manual_environment_missing');
  }
  if (!String(manualReport.preparedBy || '').trim()) {
    failures.push('manual_prepared_by_missing');
  }
  if (!String(manualReport.approver || '').trim()) {
    failures.push('manual_approver_missing');
  }
  if (!String(manualReport.completedAt || '').trim()) {
    failures.push('manual_completed_at_missing');
  }

  collectSectionFailures(failures, 'push_real_device_cutover', manualReport.pushRealDeviceCutover);
  collectSectionFailures(failures, 'rtc_real_device_validation', manualReport.rtcRealDeviceValidation);
  collectSectionFailures(failures, 'failure_recovery_drill', manualReport.failureRecoveryDrill);
}

async function main() {
  const evidenceReportFile = String(process.env.EVIDENCE_REPORT || '').trim();
  const manualAttestationFile = String(process.env.MANUAL_ATTESTATION_REPORT || '').trim();
  const reportFile = String(process.env.FINAL_SIGNOFF_REPORT_FILE || '').trim();
  const maxReportAgeMinutes = toNonNegativeInt(process.env.FINAL_SIGNOFF_MAX_REPORT_AGE_MINUTES, 0);

  if (!evidenceReportFile || !manualAttestationFile) {
    console.error('EVIDENCE_REPORT and MANUAL_ATTESTATION_REPORT are required');
    process.exitCode = 1;
    return;
  }

  const [evidenceReport, manualAttestation] = await Promise.all([
    readJson(evidenceReportFile),
    readJson(manualAttestationFile),
  ]);

  const failures = [];
  collectEvidenceFailures(failures, evidenceReport);
  collectManualFailures(failures, manualAttestation);
  collectAgeFailure(failures, 'evidence_report', evidenceReport && evidenceReport.completedAt, maxReportAgeMinutes);
  collectAgeFailure(failures, 'manual_attestation', manualAttestation && manualAttestation.completedAt, maxReportAgeMinutes);
  collectAgeFailure(
    failures,
    'push_real_device_cutover',
    manualAttestation && manualAttestation.pushRealDeviceCutover && manualAttestation.pushRealDeviceCutover.completedAt,
    maxReportAgeMinutes
  );
  collectAgeFailure(
    failures,
    'rtc_real_device_validation',
    manualAttestation && manualAttestation.rtcRealDeviceValidation && manualAttestation.rtcRealDeviceValidation.completedAt,
    maxReportAgeMinutes
  );
  collectAgeFailure(
    failures,
    'failure_recovery_drill',
    manualAttestation && manualAttestation.failureRecoveryDrill && manualAttestation.failureRecoveryDrill.completedAt,
    maxReportAgeMinutes
  );

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    reports: {
      evidence: evidenceReportFile,
      manualAttestation: manualAttestationFile,
    },
    config: {
      maxReportAgeMinutes,
    },
    failures,
  };

  await writeReport(reportFile, report);

  if (failures.length > 0) {
    console.error('Final signoff failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Final signoff passed.');
}

main().catch((error) => {
  console.error('Final signoff crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
