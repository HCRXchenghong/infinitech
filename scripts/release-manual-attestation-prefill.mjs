import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function baseTemplate() {
  return {
    version: 1,
    environment: 'production',
    preparedBy: '',
    approver: '',
    completedAt: '',
    notes: '',
    pushRealDeviceCutover: {
      status: 'pending',
      operator: '',
      completedAt: '',
      summary: '',
      evidence: [{ type: 'screenshot', path: '', note: 'Push provider console or device receipt screenshot' }],
      details: { prepReport: '', provider: '', userType: '', userId: '', appEnv: '', deviceTokenSuffix: '', messageId: '' },
    },
    rtcRealDeviceValidation: {
      status: 'pending',
      operator: '',
      completedAt: '',
      summary: '',
      evidence: [{ type: 'screen-recording', path: '', note: 'App/H5 call setup, audio, and teardown proof' }],
      details: {
        callerPlatform: '',
        calleePlatform: '',
        callerAccount: '',
        calleeAccount: '',
        callId: '',
        prepReport: '',
        callerLaunchPath: '',
        calleeLaunchPath: '',
        callerLaunchUrl: '',
        calleeLaunchUrl: '',
        turnUsed: false,
      },
    },
    failureRecoveryDrill: {
      status: 'pending',
      operator: '',
      completedAt: '',
      summary: '',
      evidence: [{ type: 'report', path: '', note: 'Fault drill report or incident timeline' }],
      details: { scenario: '', planReport: '', degradedReport: '', restoredReport: '', rollbackBaselineReport: '', rollbackCandidateReport: '' },
    },
  };
}

function t(v) { return String(v || '').trim(); }
function lower(v) { return t(v).toLowerCase(); }
async function ensureDir(file) { const dir = path.dirname(file); if (dir && dir !== '.') await mkdir(dir, { recursive: true }); }
async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function writeJson(file, value) { await ensureDir(file); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function rel(fromFile, toFile) { const target = t(toFile); if (!target) return ''; const fromDir = path.dirname(path.resolve(fromFile)); const out = path.relative(fromDir, path.resolve(target)); return out || '.'; }
function appendNote(current, next) { const a = t(current); const b = t(next); if (!b) return a; if (!a) return b; if (a.includes(b)) return a; return `${a}\n${b}`; }
function pickPushDrill(report) { return report?.releaseDrill?.summary?.pushDeliveryDrill && typeof report.releaseDrill.summary.pushDeliveryDrill === 'object' ? report.releaseDrill.summary.pushDeliveryDrill : null; }
function pickRTCDrill(report) { return report?.releaseDrill?.summary?.rtcCallDrill && typeof report.releaseDrill.summary.rtcCallDrill === 'object' ? report.releaseDrill.summary.rtcCallDrill : null; }
function pushTarget(pushDrill) {
  const config = pushDrill?.config && typeof pushDrill.config === 'object' ? pushDrill.config : {};
  return {
    userType: lower(config.requiredUserType),
    userId: t(config.requiredUserId),
    appEnv: lower(config.requiredAppEnv),
    deviceTokenSuffix: lower(config.requiredDeviceTokenSuffix),
  };
}
function rtcCallId(rtcDrill) {
  const detail = rtcDrill?.detail?.data && typeof rtcDrill.detail.data === 'object' ? rtcDrill.detail.data : null;
  const create = rtcDrill?.create?.data && typeof rtcDrill.create.data === 'object' ? rtcDrill.create.data : null;
  return t((detail && (detail.uid || detail.callId || detail.call_id_raw || detail.call_id)) || (create && (create.uid || create.callId || create.call_id_raw || create.call_id)));
}
function rtcPlatforms(rtcDrill) {
  const detail = rtcDrill?.detail?.data && typeof rtcDrill.detail.data === 'object' ? rtcDrill.detail.data : null;
  const create = rtcDrill?.create?.data && typeof rtcDrill.create.data === 'object' ? rtcDrill.create.data : null;
  const config = rtcDrill?.config && typeof rtcDrill.config === 'object' ? rtcDrill.config : {};
  return {
    callerPlatform: t((detail && (detail.caller_platform || detail.callerPlatform)) || (create && (create.clientPlatform || create.client_platform)) || config.clientPlatform),
    calleePlatform: t((detail && (detail.callee_platform || detail.calleePlatform)) || config.calleePlatform),
  };
}
function rtcLaunch(prepReport, outputFile) {
  const launch = prepReport?.launch && typeof prepReport.launch === 'object' ? prepReport.launch : {};
  return {
    prepReport: rel(outputFile, prepReport?.reportFile || ''),
    callerLaunchPath: t(launch.appCallerPath),
    calleeLaunchPath: t(launch.appCalleePath),
    callerLaunchUrl: t(launch.h5CallerUrl),
    calleeLaunchUrl: t(launch.h5CalleeUrl),
  };
}

function failurePrep(planReport, outputFile) {
  return {
    scenario: t(planReport?.scenario),
    planReport: rel(outputFile, planReport?.reportFile || ''),
  };
}

function pushPrep(report, outputFile) {
  return {
    prepReport: rel(outputFile, report?.reportFile || ''),
    provider: lower(report?.target?.provider),
    userType: lower(report?.target?.userType),
    userId: t(report?.target?.userId),
    appEnv: lower(report?.target?.appEnv),
    deviceTokenSuffix: lower(report?.target?.deviceTokenSuffix),
  };
}

async function main() {
  const liveEnv = t(process.env.LIVE_CUTOVER_REPORT);
  const rollbackEnv = t(process.env.ROLLBACK_VERIFY_REPORT);
  const failureEnv = t(process.env.FAILURE_VERIFY_REPORT);
  if (!liveEnv || !rollbackEnv || !failureEnv) {
    console.error('LIVE_CUTOVER_REPORT, ROLLBACK_VERIFY_REPORT, and FAILURE_VERIFY_REPORT are required');
    process.exitCode = 1;
    return;
  }
  const liveFile = path.resolve(process.cwd(), liveEnv);
  const rollbackFile = path.resolve(process.cwd(), rollbackEnv);
  const failureFile = path.resolve(process.cwd(), failureEnv);
  const rtcPrepEnv = t(process.env.RTC_REAL_DEVICE_PREP_REPORT);
  const rtcPrepFile = rtcPrepEnv ? path.resolve(process.cwd(), rtcPrepEnv) : '';
  const pushPrepEnv = t(process.env.PUSH_REAL_DEVICE_PREP_REPORT);
  const pushPrepFile = pushPrepEnv ? path.resolve(process.cwd(), pushPrepEnv) : '';
  const failurePrepEnv = t(process.env.FAILURE_DRILL_PREP_REPORT);
  const failurePrepFile = failurePrepEnv ? path.resolve(process.cwd(), failurePrepEnv) : '';
  const templateFile = path.resolve(process.cwd(), t(process.env.MANUAL_ATTESTATION_TEMPLATE_FILE || path.join('artifacts', 'release-manual-attestation', 'template.json')));
  const outputFile = path.resolve(process.cwd(), t(process.env.MANUAL_ATTESTATION_PREFILL_FILE || path.join('artifacts', 'release-manual-attestation', 'prefilled.json')));

  const [liveReport, rollbackReport, failureReport] = await Promise.all([readJson(liveFile), readJson(rollbackFile), readJson(failureFile)]);
  let prepReport = null;
  if (rtcPrepFile) {
    prepReport = await readJson(rtcPrepFile);
    if (prepReport && typeof prepReport === 'object') prepReport.reportFile = rtcPrepFile;
  }
  let pushPrepReport = null;
  if (pushPrepFile) {
    pushPrepReport = await readJson(pushPrepFile);
    if (pushPrepReport && typeof pushPrepReport === 'object') pushPrepReport.reportFile = pushPrepFile;
  }
  let failurePrepReport = null;
  if (failurePrepFile) {
    failurePrepReport = await readJson(failurePrepFile);
    if (failurePrepReport && typeof failurePrepReport === 'object') {
      failurePrepReport.reportFile = failurePrepFile;
    }
  }

  let templatePayload = null;
  try { templatePayload = await readJson(templateFile); } catch { templatePayload = baseTemplate(); }

  const template = templatePayload && typeof templatePayload === 'object' ? templatePayload : baseTemplate();
  const pushDrill = pickPushDrill(liveReport);
  const rtcDrill = pickRTCDrill(liveReport);
  const target = pushTarget(pushDrill);
  const pushPlan = pushPrep(pushPrepReport, outputFile);
  const launch = rtcLaunch(prepReport, outputFile);
  const platforms = rtcPlatforms(rtcDrill);
  const plan = failurePrep(failurePrepReport, outputFile);

  template.preparedBy = t(process.env.ATTESTATION_PREPARED_BY || template.preparedBy);
  template.approver = t(process.env.ATTESTATION_APPROVER || template.approver);
  template.notes = appendNote(template.notes, 'Prefilled from live cutover, rollback verify, and failure verify reports. Replace pending statuses only after real-device validation is completed.');
  if (pushPrepFile) {
    template.notes = appendNote(template.notes, 'Push real-device prep data is included below so operators can reuse the prepared provider and target identity.');
  }
  if (rtcPrepFile) {
    template.notes = appendNote(template.notes, 'RTC real-device prep data is included below so operators can open the prepared caller and callee launch paths directly.');
  }
  if (failurePrepFile) {
    template.notes = appendNote(template.notes, 'Failure drill prep data is included below so operators can reuse the prepared scenario and expected report paths.');
  }

  template.pushRealDeviceCutover.summary = t(template.pushRealDeviceCutover.summary) || 'Pending: complete the real-device push cutover and receipt validation, then replace this summary.';
  template.pushRealDeviceCutover.details.prepReport = t(template.pushRealDeviceCutover.details.prepReport) || pushPlan.prepReport;
  template.pushRealDeviceCutover.details.provider =
    t(template.pushRealDeviceCutover.details.provider)
    || lower(pushDrill?.readiness?.worker?.provider)
    || pushPlan.provider;
  template.pushRealDeviceCutover.details.userType = t(template.pushRealDeviceCutover.details.userType) || target.userType || pushPlan.userType;
  template.pushRealDeviceCutover.details.userId = t(template.pushRealDeviceCutover.details.userId) || target.userId || pushPlan.userId;
  template.pushRealDeviceCutover.details.appEnv = t(template.pushRealDeviceCutover.details.appEnv) || target.appEnv || pushPlan.appEnv;
  template.pushRealDeviceCutover.details.deviceTokenSuffix = t(template.pushRealDeviceCutover.details.deviceTokenSuffix) || target.deviceTokenSuffix || pushPlan.deviceTokenSuffix;
  template.pushRealDeviceCutover.details.messageId = t(template.pushRealDeviceCutover.details.messageId) || t(pushDrill?.message?.id);

  template.rtcRealDeviceValidation.summary = t(template.rtcRealDeviceValidation.summary) || 'Pending: complete the real-device RTC validation, then replace this summary.';
  template.rtcRealDeviceValidation.details.callerPlatform = t(template.rtcRealDeviceValidation.details.callerPlatform) || platforms.callerPlatform;
  template.rtcRealDeviceValidation.details.calleePlatform = t(template.rtcRealDeviceValidation.details.calleePlatform) || platforms.calleePlatform;
  template.rtcRealDeviceValidation.details.callId = t(template.rtcRealDeviceValidation.details.callId) || rtcCallId(rtcDrill);
  template.rtcRealDeviceValidation.details.prepReport = t(template.rtcRealDeviceValidation.details.prepReport) || launch.prepReport;
  template.rtcRealDeviceValidation.details.callerLaunchPath = t(template.rtcRealDeviceValidation.details.callerLaunchPath) || launch.callerLaunchPath;
  template.rtcRealDeviceValidation.details.calleeLaunchPath = t(template.rtcRealDeviceValidation.details.calleeLaunchPath) || launch.calleeLaunchPath;
  template.rtcRealDeviceValidation.details.callerLaunchUrl = t(template.rtcRealDeviceValidation.details.callerLaunchUrl) || launch.callerLaunchUrl;
  template.rtcRealDeviceValidation.details.calleeLaunchUrl = t(template.rtcRealDeviceValidation.details.calleeLaunchUrl) || launch.calleeLaunchUrl;

  template.failureRecoveryDrill.summary = t(template.failureRecoveryDrill.summary) || 'Pending: complete the real fault-injection recovery and rollback drill, then replace this summary.';
  template.failureRecoveryDrill.details.scenario =
    t(template.failureRecoveryDrill.details.scenario)
    || plan.scenario
    || t(failureReport.scenario);
  template.failureRecoveryDrill.details.planReport = t(template.failureRecoveryDrill.details.planReport) || plan.planReport;
  template.failureRecoveryDrill.details.degradedReport = t(template.failureRecoveryDrill.details.degradedReport) || rel(outputFile, failureReport.degradedReport || '');
  template.failureRecoveryDrill.details.restoredReport = t(template.failureRecoveryDrill.details.restoredReport) || rel(outputFile, failureReport.restoredReport || '');
  template.failureRecoveryDrill.details.rollbackBaselineReport = t(template.failureRecoveryDrill.details.rollbackBaselineReport) || rel(outputFile, rollbackReport.baselineReport || '');
  template.failureRecoveryDrill.details.rollbackCandidateReport = t(template.failureRecoveryDrill.details.rollbackCandidateReport) || rel(outputFile, rollbackReport.candidateReport || '');

  template.prefillSources = {
    createdAt: new Date().toISOString(),
    liveCutoverReport: rel(outputFile, liveFile),
    rollbackVerifyReport: rel(outputFile, rollbackFile),
    failureVerifyReport: rel(outputFile, failureFile),
    pushRealDevicePrepReport: rel(outputFile, pushPrepFile),
    rtcRealDevicePrepReport: rel(outputFile, rtcPrepFile),
    failureDrillPrepReport: rel(outputFile, failurePrepFile),
  };

  await writeJson(outputFile, template);
  console.log(`Manual attestation prefill written to ${outputFile}`);
}

main().catch((error) => {
  console.error('Manual attestation prefill failed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
