import path from 'node:path';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

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

async function readOptionalJson(baseDirectory, value) {
  const resolvedPath = normalizeLocalPath(baseDirectory, value);
  if (!resolvedPath) {
    return null;
  }
  const content = await readFile(resolvedPath, 'utf8');
  return JSON.parse(content);
}

function isHttpUrl(value) {
  const trimmed = String(value || '').trim();
  return /^https?:\/\//i.test(trimmed);
}

function normalizeLocalPath(baseDirectory, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || isHttpUrl(trimmed)) {
    return '';
  }
  return path.resolve(baseDirectory, trimmed);
}

async function ensureExistingLocalPath(failures, failureLabel, baseDirectory, value) {
  const resolvedPath = normalizeLocalPath(baseDirectory, value);
  if (!resolvedPath) {
    return;
  }
  try {
    await access(resolvedPath);
  } catch (_error) {
    failures.push(`${failureLabel}_missing=${resolvedPath}`);
  }
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
  return Boolean(String(item.path || '').trim() || String(item.url || '').trim());
}

function hasAnyValue(values = []) {
  return values.some((value) => String(value || '').trim());
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePathForCompare(baseDirectory, value) {
  const resolvedPath = normalizeLocalPath(baseDirectory, value);
  return resolvedPath ? path.normalize(resolvedPath) : '';
}

function extractPushDrill(report) {
  return report
    && report.releaseDrill
    && report.releaseDrill.summary
    && report.releaseDrill.summary.pushDeliveryDrill
    && typeof report.releaseDrill.summary.pushDeliveryDrill === 'object'
    ? report.releaseDrill.summary.pushDeliveryDrill
    : null;
}

function extractRTCDrill(report) {
  return report
    && report.releaseDrill
    && report.releaseDrill.summary
    && report.releaseDrill.summary.rtcCallDrill
    && typeof report.releaseDrill.summary.rtcCallDrill === 'object'
    ? report.releaseDrill.summary.rtcCallDrill
    : null;
}

function extractPushProvider(pushDrill) {
  return normalizeLowerText(
    pushDrill
      && pushDrill.readiness
      && pushDrill.readiness.worker
      && pushDrill.readiness.worker.provider
  );
}

function extractPushMessageId(pushDrill) {
  return normalizeText(pushDrill && pushDrill.message && pushDrill.message.id);
}

function extractPushTargetConfig(pushDrill) {
  const config = pushDrill && pushDrill.config && typeof pushDrill.config === 'object'
    ? pushDrill.config
    : {};
  return {
    userType: normalizeLowerText(config.requiredUserType),
    userId: normalizeText(config.requiredUserId),
    appEnv: normalizeLowerText(config.requiredAppEnv),
    deviceTokenSuffix: normalizeLowerText(config.requiredDeviceTokenSuffix),
  };
}

function extractRTCCallId(rtcDrill) {
  const detail = rtcDrill && rtcDrill.detail && rtcDrill.detail.data && typeof rtcDrill.detail.data === 'object'
    ? rtcDrill.detail.data
    : null;
  const create = rtcDrill && rtcDrill.create && rtcDrill.create.data && typeof rtcDrill.create.data === 'object'
    ? rtcDrill.create.data
    : null;
  return normalizeText(
    (detail && (detail.uid || detail.callId || detail.call_id_raw || detail.call_id))
      || (create && (create.uid || create.callId || create.call_id_raw || create.call_id))
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

async function collectEvidencePathFailures(failures, sectionName, section, baseDirectory) {
  if (!section || typeof section !== 'object') {
    return;
  }
  const evidence = Array.isArray(section.evidence) ? section.evidence : [];
  for (let index = 0; index < evidence.length; index += 1) {
    const item = evidence[index];
    if (!item || typeof item !== 'object') {
      failures.push(`${sectionName}_evidence_item_${index}_invalid`);
      continue;
    }
    const evidencePath = String(item.path || '').trim();
    const evidenceUrl = String(item.url || '').trim();
    if (evidencePath) {
      await ensureExistingLocalPath(
        failures,
        `${sectionName}_evidence_item_${index}_path`,
        baseDirectory,
        evidencePath
      );
    } else if (evidenceUrl && !isHttpUrl(evidenceUrl)) {
      failures.push(`${sectionName}_evidence_item_${index}_url_invalid`);
    }
  }
}

function collectPushCutoverDetailFailures(failures, details) {
  const value = details && typeof details === 'object' ? details : {};
  if (!String(value.prepReport || '').trim()) {
    failures.push('push_real_device_cutover_prep_report_missing');
  }
  if (!String(value.provider || '').trim()) {
    failures.push('push_real_device_cutover_provider_missing');
  }
  if (!String(value.messageId || '').trim()) {
    failures.push('push_real_device_cutover_message_id_missing');
  }
  if (
    !hasAnyValue([
      value.userType,
      value.userId,
      value.appEnv,
      value.deviceTokenSuffix,
    ])
  ) {
    failures.push('push_real_device_cutover_target_identity_missing');
  }
}

async function collectPushPrepPathFailures(failures, details, baseDirectory) {
  const value = details && typeof details === 'object' ? details : {};
  await ensureExistingLocalPath(
    failures,
    'push_real_device_cutover_prep_report',
    baseDirectory,
    value.prepReport
  );
}

async function collectPushPrepConsistencyFailures(failures, details, baseDirectory) {
  const value = details && typeof details === 'object' ? details : {};
  const report = await readOptionalJson(baseDirectory, value.prepReport);
  if (!report || typeof report !== 'object') {
    return;
  }
  if (normalizeText(report.failure)) {
    failures.push(`push_real_device_cutover_prep_report_failure=${normalizeText(report.failure)}`);
  }
  const readiness = report.readiness && typeof report.readiness === 'object' ? report.readiness : {};
  const worker = readiness.worker && typeof readiness.worker === 'object' ? readiness.worker : {};
  if (readiness.productionReady === false) {
    failures.push('push_real_device_cutover_prep_not_production_ready');
  }
  const prepProvider = normalizeLowerText(
    report.target && report.target.provider
      ? report.target.provider
      : worker.provider
  );
  const manualProvider = normalizeLowerText(value.provider);
  const prepUserType = normalizeLowerText(report.target && report.target.userType);
  const prepUserId = normalizeText(report.target && report.target.userId);
  const prepAppEnv = normalizeLowerText(report.target && report.target.appEnv);
  const prepTokenSuffix = normalizeLowerText(report.target && report.target.deviceTokenSuffix);
  if (prepProvider && manualProvider && prepProvider !== manualProvider) {
    failures.push(`push_real_device_cutover_prep_provider_mismatch=${manualProvider}!=${prepProvider}`);
  }
  if (prepUserType && normalizeLowerText(value.userType) && prepUserType !== normalizeLowerText(value.userType)) {
    failures.push(`push_real_device_cutover_prep_user_type_mismatch=${normalizeLowerText(value.userType)}!=${prepUserType}`);
  }
  if (prepUserId && normalizeText(value.userId) && prepUserId !== normalizeText(value.userId)) {
    failures.push(`push_real_device_cutover_prep_user_id_mismatch=${normalizeText(value.userId)}!=${prepUserId}`);
  }
  if (prepAppEnv && normalizeLowerText(value.appEnv) && prepAppEnv !== normalizeLowerText(value.appEnv)) {
    failures.push(`push_real_device_cutover_prep_app_env_mismatch=${normalizeLowerText(value.appEnv)}!=${prepAppEnv}`);
  }
  if (
    prepTokenSuffix
    && normalizeLowerText(value.deviceTokenSuffix)
    && prepTokenSuffix !== normalizeLowerText(value.deviceTokenSuffix)
  ) {
    failures.push(
      `push_real_device_cutover_prep_device_token_suffix_mismatch=${normalizeLowerText(value.deviceTokenSuffix)}!=${prepTokenSuffix}`
    );
  }
}

function collectRTCDetailFailures(failures, details) {
  const value = details && typeof details === 'object' ? details : {};
  if (!String(value.callerPlatform || '').trim()) {
    failures.push('rtc_real_device_validation_caller_platform_missing');
  }
  if (!String(value.calleePlatform || '').trim()) {
    failures.push('rtc_real_device_validation_callee_platform_missing');
  }
  if (!String(value.callerAccount || '').trim()) {
    failures.push('rtc_real_device_validation_caller_account_missing');
  }
  if (!String(value.calleeAccount || '').trim()) {
    failures.push('rtc_real_device_validation_callee_account_missing');
  }
  if (!String(value.callId || '').trim()) {
    failures.push('rtc_real_device_validation_call_id_missing');
  }
}

function collectFailureRecoveryDetailFailures(failures, details) {
  const value = details && typeof details === 'object' ? details : {};
  if (!String(value.scenario || '').trim()) {
    failures.push('failure_recovery_drill_scenario_missing');
  }
  if (!String(value.degradedReport || '').trim()) {
    failures.push('failure_recovery_drill_degraded_report_missing');
  }
  if (!String(value.restoredReport || '').trim()) {
    failures.push('failure_recovery_drill_restored_report_missing');
  }
  if (!String(value.rollbackBaselineReport || '').trim()) {
    failures.push('failure_recovery_drill_rollback_baseline_missing');
  }
  if (!String(value.rollbackCandidateReport || '').trim()) {
    failures.push('failure_recovery_drill_rollback_candidate_missing');
  }
}

async function collectFailureRecoveryReportPathFailures(failures, details, baseDirectory) {
  const value = details && typeof details === 'object' ? details : {};
  await ensureExistingLocalPath(
    failures,
    'failure_recovery_drill_plan_report',
    baseDirectory,
    value.planReport
  );
  await ensureExistingLocalPath(
    failures,
    'failure_recovery_drill_degraded_report',
    baseDirectory,
    value.degradedReport
  );
  await ensureExistingLocalPath(
    failures,
    'failure_recovery_drill_restored_report',
    baseDirectory,
    value.restoredReport
  );
  await ensureExistingLocalPath(
    failures,
    'failure_recovery_drill_rollback_baseline_report',
    baseDirectory,
    value.rollbackBaselineReport
  );
  await ensureExistingLocalPath(
    failures,
    'failure_recovery_drill_rollback_candidate_report',
    baseDirectory,
    value.rollbackCandidateReport
  );
}

async function collectRTCPrepPathFailures(failures, details, baseDirectory) {
  const value = details && typeof details === 'object' ? details : {};
  await ensureExistingLocalPath(
    failures,
    'rtc_real_device_validation_prep_report',
    baseDirectory,
    value.prepReport
  );
}

function collectPushConsistencyFailures(failures, manualReport, liveCutoverReport) {
  const manualDetails = manualReport
    && manualReport.pushRealDeviceCutover
    && manualReport.pushRealDeviceCutover.details
    && typeof manualReport.pushRealDeviceCutover.details === 'object'
    ? manualReport.pushRealDeviceCutover.details
    : {};
  const pushDrill = extractPushDrill(liveCutoverReport);
  if (!pushDrill) {
    failures.push('push_real_device_cutover_live_drill_missing');
    return;
  }
  const manualProvider = normalizeLowerText(manualDetails.provider);
  const drillProvider = extractPushProvider(pushDrill);
  if (manualProvider && drillProvider && manualProvider !== drillProvider) {
    failures.push(`push_real_device_cutover_provider_mismatch=${manualProvider}!=${drillProvider}`);
  }
  const manualMessageId = normalizeText(manualDetails.messageId);
  const drillMessageId = extractPushMessageId(pushDrill);
  if (manualMessageId && drillMessageId && manualMessageId !== drillMessageId) {
    failures.push(`push_real_device_cutover_message_id_mismatch=${manualMessageId}!=${drillMessageId}`);
  }
  const drillTarget = extractPushTargetConfig(pushDrill);
  const manualUserType = normalizeLowerText(manualDetails.userType);
  const manualUserId = normalizeText(manualDetails.userId);
  const manualAppEnv = normalizeLowerText(manualDetails.appEnv);
  const manualTokenSuffix = normalizeLowerText(manualDetails.deviceTokenSuffix);
  if (drillTarget.userType && manualUserType && drillTarget.userType !== manualUserType) {
    failures.push(`push_real_device_cutover_user_type_mismatch=${manualUserType}!=${drillTarget.userType}`);
  }
  if (drillTarget.userId && manualUserId && drillTarget.userId !== manualUserId) {
    failures.push(`push_real_device_cutover_user_id_mismatch=${manualUserId}!=${drillTarget.userId}`);
  }
  if (drillTarget.appEnv && manualAppEnv && drillTarget.appEnv !== manualAppEnv) {
    failures.push(`push_real_device_cutover_app_env_mismatch=${manualAppEnv}!=${drillTarget.appEnv}`);
  }
  if (drillTarget.deviceTokenSuffix && manualTokenSuffix && drillTarget.deviceTokenSuffix !== manualTokenSuffix) {
    failures.push(
      `push_real_device_cutover_device_token_suffix_mismatch=${manualTokenSuffix}!=${drillTarget.deviceTokenSuffix}`
    );
  }
}

function collectRTCConsistencyFailures(failures, manualReport, liveCutoverReport) {
  const manualDetails = manualReport
    && manualReport.rtcRealDeviceValidation
    && manualReport.rtcRealDeviceValidation.details
    && typeof manualReport.rtcRealDeviceValidation.details === 'object'
    ? manualReport.rtcRealDeviceValidation.details
    : {};
  const rtcDrill = extractRTCDrill(liveCutoverReport);
  if (!rtcDrill) {
    failures.push('rtc_real_device_validation_live_drill_missing');
    return;
  }
  const manualCallId = normalizeText(manualDetails.callId);
  const drillCallId = extractRTCCallId(rtcDrill);
  if (manualCallId && drillCallId && manualCallId !== drillCallId) {
    failures.push(`rtc_real_device_validation_call_id_mismatch=${manualCallId}!=${drillCallId}`);
  }
}

function collectFailureRecoveryConsistencyFailures(
  failures,
  manualReport,
  rollbackVerifyReport,
  failureVerifyReport,
  manualBaseDirectory,
  evidenceBaseDirectory
) {
  const manualDetails = manualReport
    && manualReport.failureRecoveryDrill
    && manualReport.failureRecoveryDrill.details
    && typeof manualReport.failureRecoveryDrill.details === 'object'
    ? manualReport.failureRecoveryDrill.details
    : {};
  const manualScenario = normalizeText(manualDetails.scenario);
  const verifyScenario = normalizeText(failureVerifyReport && failureVerifyReport.scenario);
  const manualDegradedReport = normalizePathForCompare(manualBaseDirectory, manualDetails.degradedReport);
  const manualRestoredReport = normalizePathForCompare(manualBaseDirectory, manualDetails.restoredReport);
  const manualRollbackBaselineReport = normalizePathForCompare(
    manualBaseDirectory,
    manualDetails.rollbackBaselineReport
  );
  const manualRollbackCandidateReport = normalizePathForCompare(
    manualBaseDirectory,
    manualDetails.rollbackCandidateReport
  );
  const verifyDegradedReport = normalizePathForCompare(
    evidenceBaseDirectory,
    failureVerifyReport && failureVerifyReport.degradedReport
  );
  const verifyRestoredReport = normalizePathForCompare(
    evidenceBaseDirectory,
    failureVerifyReport && failureVerifyReport.restoredReport
  );
  const rollbackBaselineReport = normalizePathForCompare(
    evidenceBaseDirectory,
    rollbackVerifyReport && rollbackVerifyReport.baselineReport
  );
  const rollbackCandidateReport = normalizePathForCompare(
    evidenceBaseDirectory,
    rollbackVerifyReport && rollbackVerifyReport.candidateReport
  );

  if (manualScenario && verifyScenario && manualScenario !== verifyScenario) {
    failures.push('failure_recovery_drill_scenario_mismatch');
  }

  if (manualDegradedReport && verifyDegradedReport && manualDegradedReport !== verifyDegradedReport) {
    failures.push('failure_recovery_drill_degraded_report_mismatch');
  }
  if (manualRestoredReport && verifyRestoredReport && manualRestoredReport !== verifyRestoredReport) {
    failures.push('failure_recovery_drill_restored_report_mismatch');
  }
  if (
    manualRollbackBaselineReport &&
    rollbackBaselineReport &&
    manualRollbackBaselineReport !== rollbackBaselineReport
  ) {
    failures.push('failure_recovery_drill_rollback_baseline_report_mismatch');
  }
  if (
    manualRollbackCandidateReport &&
    rollbackCandidateReport &&
    manualRollbackCandidateReport !== rollbackCandidateReport
  ) {
    failures.push('failure_recovery_drill_rollback_candidate_report_mismatch');
  }
}

async function collectManualFailures(failures, manualReport, manualReportFile) {
  if (!manualReport || typeof manualReport !== 'object') {
    failures.push('manual_attestation_invalid');
    return;
  }
  const manualBaseDirectory = path.dirname(path.resolve(manualReportFile));
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
  await collectEvidencePathFailures(
    failures,
    'push_real_device_cutover',
    manualReport.pushRealDeviceCutover,
    manualBaseDirectory
  );
  await collectEvidencePathFailures(
    failures,
    'rtc_real_device_validation',
    manualReport.rtcRealDeviceValidation,
    manualBaseDirectory
  );
  await collectEvidencePathFailures(
    failures,
    'failure_recovery_drill',
    manualReport.failureRecoveryDrill,
    manualBaseDirectory
  );
  collectPushCutoverDetailFailures(failures, manualReport.pushRealDeviceCutover && manualReport.pushRealDeviceCutover.details);
  collectRTCDetailFailures(failures, manualReport.rtcRealDeviceValidation && manualReport.rtcRealDeviceValidation.details);
  collectFailureRecoveryDetailFailures(failures, manualReport.failureRecoveryDrill && manualReport.failureRecoveryDrill.details);
  await collectFailureRecoveryReportPathFailures(
    failures,
    manualReport.failureRecoveryDrill && manualReport.failureRecoveryDrill.details,
    manualBaseDirectory
  );
  await collectRTCPrepPathFailures(
    failures,
    manualReport.rtcRealDeviceValidation && manualReport.rtcRealDeviceValidation.details,
    manualBaseDirectory
  );
  await collectPushPrepPathFailures(
    failures,
    manualReport.pushRealDeviceCutover && manualReport.pushRealDeviceCutover.details,
    manualBaseDirectory
  );
  await collectPushPrepConsistencyFailures(
    failures,
    manualReport.pushRealDeviceCutover && manualReport.pushRealDeviceCutover.details,
    manualBaseDirectory
  );
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
  const evidenceBaseDirectory = path.dirname(path.resolve(evidenceReportFile));
  const manualBaseDirectory = path.dirname(path.resolve(manualAttestationFile));
  const [liveCutoverReport, rollbackVerifyReport, failureVerifyReport] = await Promise.all([
    readOptionalJson(evidenceBaseDirectory, evidenceReport && evidenceReport.reports && evidenceReport.reports.liveCutover),
    readOptionalJson(evidenceBaseDirectory, evidenceReport && evidenceReport.reports && evidenceReport.reports.rollbackVerify),
    readOptionalJson(evidenceBaseDirectory, evidenceReport && evidenceReport.reports && evidenceReport.reports.failureVerify),
  ]);

  const failures = [];
  collectEvidenceFailures(failures, evidenceReport);
  await collectManualFailures(failures, manualAttestation, manualAttestationFile);
  collectPushConsistencyFailures(failures, manualAttestation, liveCutoverReport);
  collectRTCConsistencyFailures(failures, manualAttestation, liveCutoverReport);
  collectFailureRecoveryConsistencyFailures(
    failures,
    manualAttestation,
    rollbackVerifyReport,
    failureVerifyReport,
    manualBaseDirectory,
    evidenceBaseDirectory
  );
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
