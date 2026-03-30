import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function createBaseTemplate() {
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
      evidence: [
        {
          type: 'screenshot',
          path: '',
          note: 'Push provider console or device receipt screenshot',
        },
      ],
      details: {
        provider: '',
        userType: '',
        userId: '',
        appEnv: '',
        deviceTokenSuffix: '',
        messageId: '',
      },
    },
    rtcRealDeviceValidation: {
      status: 'pending',
      operator: '',
      completedAt: '',
      summary: '',
      evidence: [
        {
          type: 'screen-recording',
          path: '',
          note: 'App/H5 call setup, audio, and teardown proof',
        },
      ],
      details: {
        callerPlatform: '',
        calleePlatform: '',
        callerAccount: '',
        calleeAccount: '',
        callId: '',
        turnUsed: false,
      },
    },
    failureRecoveryDrill: {
      status: 'pending',
      operator: '',
      completedAt: '',
      summary: '',
      evidence: [
        {
          type: 'report',
          path: '',
          note: 'Fault drill report or incident timeline',
        },
      ],
      details: {
        scenario: '',
        degradedReport: '',
        restoredReport: '',
        rollbackBaselineReport: '',
        rollbackCandidateReport: '',
      },
    },
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

async function ensureDir(filePath) {
  const directory = path.dirname(filePath);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filePath, payload) {
  await ensureDir(filePath);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function makeRelativePath(fromFile, toFile) {
  const target = normalizeText(toFile);
  if (!target) {
    return '';
  }
  const fromDirectory = path.dirname(path.resolve(fromFile));
  const resolvedTarget = path.resolve(target);
  const relativePath = path.relative(fromDirectory, resolvedTarget);
  return relativePath || '.';
}

function readTemplateObject(templatePayload) {
  if (!templatePayload || typeof templatePayload !== 'object') {
    return createBaseTemplate();
  }
  return templatePayload;
}

function extractPushDrill(liveCutoverReport) {
  return liveCutoverReport
    && liveCutoverReport.releaseDrill
    && liveCutoverReport.releaseDrill.summary
    && liveCutoverReport.releaseDrill.summary.pushDeliveryDrill
    && typeof liveCutoverReport.releaseDrill.summary.pushDeliveryDrill === 'object'
    ? liveCutoverReport.releaseDrill.summary.pushDeliveryDrill
    : null;
}

function extractRTCDrill(liveCutoverReport) {
  return liveCutoverReport
    && liveCutoverReport.releaseDrill
    && liveCutoverReport.releaseDrill.summary
    && liveCutoverReport.releaseDrill.summary.rtcCallDrill
    && typeof liveCutoverReport.releaseDrill.summary.rtcCallDrill === 'object'
    ? liveCutoverReport.releaseDrill.summary.rtcCallDrill
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

function extractRTCPlatforms(rtcDrill) {
  const detail = rtcDrill && rtcDrill.detail && rtcDrill.detail.data && typeof rtcDrill.detail.data === 'object'
    ? rtcDrill.detail.data
    : null;
  const create = rtcDrill && rtcDrill.create && rtcDrill.create.data && typeof rtcDrill.create.data === 'object'
    ? rtcDrill.create.data
    : null;
  const config = rtcDrill && rtcDrill.config && typeof rtcDrill.config === 'object'
    ? rtcDrill.config
    : {};
  return {
    callerPlatform: normalizeText(
      (detail && (detail.caller_platform || detail.callerPlatform))
        || (create && (create.clientPlatform || create.client_platform))
        || config.clientPlatform
    ),
    calleePlatform: normalizeText(
      (detail && (detail.callee_platform || detail.calleePlatform))
        || config.calleePlatform
    ),
  };
}

function appendNote(existingNotes, value) {
  const current = normalizeText(existingNotes);
  const next = normalizeText(value);
  if (!next) return current;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}\n${next}`;
}

async function main() {
  const liveCutoverReportFile = path.resolve(
    process.cwd(),
    normalizeText(process.env.LIVE_CUTOVER_REPORT)
  );
  const rollbackVerifyReportFile = path.resolve(
    process.cwd(),
    normalizeText(process.env.ROLLBACK_VERIFY_REPORT)
  );
  const failureVerifyReportFile = path.resolve(
    process.cwd(),
    normalizeText(process.env.FAILURE_VERIFY_REPORT)
  );
  const templateFile = path.resolve(
    process.cwd(),
    normalizeText(
      process.env.MANUAL_ATTESTATION_TEMPLATE_FILE
        || path.join('artifacts', 'release-manual-attestation', 'template.json')
    )
  );
  const outputFile = path.resolve(
    process.cwd(),
    normalizeText(
      process.env.MANUAL_ATTESTATION_PREFILL_FILE
        || path.join('artifacts', 'release-manual-attestation', 'prefilled.json')
    )
  );

  if (
    !normalizeText(process.env.LIVE_CUTOVER_REPORT) ||
    !normalizeText(process.env.ROLLBACK_VERIFY_REPORT) ||
    !normalizeText(process.env.FAILURE_VERIFY_REPORT)
  ) {
    console.error(
      'LIVE_CUTOVER_REPORT, ROLLBACK_VERIFY_REPORT, and FAILURE_VERIFY_REPORT are required'
    );
    process.exitCode = 1;
    return;
  }

  const [liveCutoverReport, rollbackVerifyReport, failureVerifyReport] = await Promise.all([
    readJson(liveCutoverReportFile),
    readJson(rollbackVerifyReportFile),
    readJson(failureVerifyReportFile),
  ]);

  let templatePayload = null;
  try {
    templatePayload = await readJson(templateFile);
  } catch (_error) {
    templatePayload = createBaseTemplate();
  }

  const template = readTemplateObject(templatePayload);
  const pushDrill = extractPushDrill(liveCutoverReport);
  const rtcDrill = extractRTCDrill(liveCutoverReport);
  const pushTarget = extractPushTargetConfig(pushDrill);
  const rtcPlatforms = extractRTCPlatforms(rtcDrill);

  template.preparedBy = normalizeText(process.env.ATTESTATION_PREPARED_BY || template.preparedBy);
  template.approver = normalizeText(process.env.ATTESTATION_APPROVER || template.approver);
  template.notes = appendNote(
    template.notes,
    'Prefilled from live cutover, rollback verify, and failure verify reports. Replace pending statuses only after real-device validation is completed.'
  );

  template.pushRealDeviceCutover.summary =
    normalizeText(template.pushRealDeviceCutover.summary)
    || '待补充：完成真实设备 push 切换与送达验收后填写。';
  template.pushRealDeviceCutover.details.provider =
    normalizeText(template.pushRealDeviceCutover.details.provider) || extractPushProvider(pushDrill);
  template.pushRealDeviceCutover.details.userType =
    normalizeText(template.pushRealDeviceCutover.details.userType) || pushTarget.userType;
  template.pushRealDeviceCutover.details.userId =
    normalizeText(template.pushRealDeviceCutover.details.userId) || pushTarget.userId;
  template.pushRealDeviceCutover.details.appEnv =
    normalizeText(template.pushRealDeviceCutover.details.appEnv) || pushTarget.appEnv;
  template.pushRealDeviceCutover.details.deviceTokenSuffix =
    normalizeText(template.pushRealDeviceCutover.details.deviceTokenSuffix)
    || pushTarget.deviceTokenSuffix;
  template.pushRealDeviceCutover.details.messageId =
    normalizeText(template.pushRealDeviceCutover.details.messageId) || extractPushMessageId(pushDrill);

  template.rtcRealDeviceValidation.summary =
    normalizeText(template.rtcRealDeviceValidation.summary)
    || '待补充：完成真实设备 RTC 通话验证后填写。';
  template.rtcRealDeviceValidation.details.callerPlatform =
    normalizeText(template.rtcRealDeviceValidation.details.callerPlatform) || rtcPlatforms.callerPlatform;
  template.rtcRealDeviceValidation.details.calleePlatform =
    normalizeText(template.rtcRealDeviceValidation.details.calleePlatform) || rtcPlatforms.calleePlatform;
  template.rtcRealDeviceValidation.details.callId =
    normalizeText(template.rtcRealDeviceValidation.details.callId) || extractRTCCallId(rtcDrill);

  template.failureRecoveryDrill.summary =
    normalizeText(template.failureRecoveryDrill.summary)
    || '待补充：完成真实故障注入后的恢复与回滚演练后填写。';
  template.failureRecoveryDrill.details.degradedReport =
    normalizeText(template.failureRecoveryDrill.details.degradedReport)
    || makeRelativePath(outputFile, failureVerifyReport.degradedReport || '');
  template.failureRecoveryDrill.details.restoredReport =
    normalizeText(template.failureRecoveryDrill.details.restoredReport)
    || makeRelativePath(outputFile, failureVerifyReport.restoredReport || '');
  template.failureRecoveryDrill.details.rollbackBaselineReport =
    normalizeText(template.failureRecoveryDrill.details.rollbackBaselineReport)
    || makeRelativePath(outputFile, rollbackVerifyReport.baselineReport || '');
  template.failureRecoveryDrill.details.rollbackCandidateReport =
    normalizeText(template.failureRecoveryDrill.details.rollbackCandidateReport)
    || makeRelativePath(outputFile, rollbackVerifyReport.candidateReport || '');

  template.prefillSources = {
    createdAt: new Date().toISOString(),
    liveCutoverReport: makeRelativePath(outputFile, liveCutoverReportFile),
    rollbackVerifyReport: makeRelativePath(outputFile, rollbackVerifyReportFile),
    failureVerifyReport: makeRelativePath(outputFile, failureVerifyReportFile),
  };

  await writeJson(outputFile, template);
  console.log(`Manual attestation prefill written to ${outputFile}`);
}

main().catch((error) => {
  console.error(
    'Manual attestation prefill failed:',
    error instanceof Error ? error.stack || error.message : error
  );
  process.exitCode = 1;
});
