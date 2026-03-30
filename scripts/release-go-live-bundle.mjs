import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function timestampLabel(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(target) {
  await mkdir(target, { recursive: true });
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

async function main() {
  const label = String(process.env.GO_LIVE_BUNDLE_LABEL || timestampLabel()).trim();
  const bundleDir = path.resolve(
    process.cwd(),
    String(process.env.GO_LIVE_BUNDLE_DIR || path.join('artifacts', 'go-live-bundles', label)).trim()
  );
  await ensureDir(bundleDir);

  const reportsDir = path.join(bundleDir, 'reports');
  const attestationDir = path.join(bundleDir, 'manual-attestation');
  await ensureDir(reportsDir);
  await ensureDir(attestationDir);

  const templateFile = path.join(attestationDir, 'template.json');
  const templateExitCode = await runNodeScript(path.join('scripts', 'release-manual-attestation-template.mjs'), {
    MANUAL_ATTESTATION_TEMPLATE_FILE: templateFile,
  });

  const manifest = {
    createdAt: new Date().toISOString(),
    label,
    bundleDir,
    status: templateExitCode === 0 ? 'prepared' : 'failed',
    files: {
      liveCutoverReport: path.join(reportsDir, 'live-cutover.json'),
      rollbackVerifyReport: path.join(reportsDir, 'rollback-verify.json'),
      failureVerifyReport: path.join(reportsDir, 'failure-verify.json'),
      evidenceReport: path.join(reportsDir, 'evidence-gate.json'),
      finalSignoffReport: path.join(reportsDir, 'final-signoff.json'),
      manualAttestationTemplate: templateFile,
      manualAttestationCompleted: path.join(attestationDir, 'completed.json'),
    },
    commands: {
      liveCutover: 'node scripts/release-live-cutover.mjs',
      rollbackVerify: 'node scripts/release-rollback-verify.mjs',
      failureVerify: 'node scripts/release-failure-verify.mjs',
      evidenceGate: 'node scripts/release-evidence-gate.mjs',
      finalSignoff: 'node scripts/release-final-signoff.mjs',
    },
    requiredEnvironmentKeys: [
      'ADMIN_TOKEN',
      'PUSH_DRILL_REQUIRE_PROVIDER',
      'PUSH_DRILL_REQUIRE_USER_TYPE or PUSH_DRILL_REQUIRE_USER_ID or PUSH_DRILL_REQUIRE_APP_ENV or PUSH_DRILL_REQUIRE_DEVICE_TOKEN_SUFFIX',
      'RTC_DRILL_AUTH_TOKEN',
      'RTC_DRILL_CALLEE_ROLE',
      'RTC_DRILL_CALLEE_ID',
    ],
    executionOrder: [
      '1. Fill the real environment variables for push and RTC drill targets.',
      '2. Run release-live-cutover and store the report in reports/live-cutover.json.',
      '3. Run rollback verification and store the report in reports/rollback-verify.json.',
      '4. Run failure verification and store the report in reports/failure-verify.json.',
      '5. Run release-evidence-gate and store the report in reports/evidence-gate.json.',
      '6. Complete manual-attestation/completed.json with real-device push, RTC, and failure-recovery evidence.',
      '7. Run release-final-signoff and store the report in reports/final-signoff.json.',
    ],
    templateExitCode,
  };

  await writeJson(path.join(bundleDir, 'manifest.json'), manifest);
  console.log(`Go-live bundle prepared in ${bundleDir}`);

  if (templateExitCode !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Go-live bundle generation failed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
