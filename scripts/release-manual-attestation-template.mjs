import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

async function ensureDir(filePath) {
  const directory = path.dirname(filePath);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
}

async function main() {
  const outputFile = path.resolve(
    process.cwd(),
    String(process.env.MANUAL_ATTESTATION_TEMPLATE_FILE || path.join('artifacts', 'release-manual-attestation', 'template.json')).trim()
  );

  const template = {
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

  await ensureDir(outputFile);
  await writeFile(outputFile, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  console.log(`Manual attestation template written to ${outputFile}`);
}

main().catch((error) => {
  console.error('Manual attestation template generation failed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
