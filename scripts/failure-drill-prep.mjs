import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

function t(v) {
  return String(v || '').trim();
}

function timestampLabel(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function writeReport(reportFile, report) {
  const target = t(reportFile);
  if (!target) return;
  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Failure drill prep report written to ${target}`);
}

async function main() {
  const label = t(process.env.FAILURE_DRILL_LABEL || timestampLabel());
  const outputFile = t(
    process.env.FAILURE_DRILL_PREP_REPORT_FILE
      || path.join('artifacts', 'failure-drill-prep', `${label}.json`)
  );
  const scenario =
    t(process.env.FAILURE_DRILL_SCENARIO)
    || t(process.env.FAILURE_SCENARIO_NAME)
    || 'manual_fault_injection';
  const degradedTarget =
    t(process.env.FAILURE_DRILL_DEGRADED_TARGET)
    || 'Inject the selected fault and run release-drill to capture degraded state.';
  const restoredTarget =
    t(process.env.FAILURE_DRILL_RESTORED_TARGET)
    || 'Restore the dependency or service, rerun release-drill, and confirm recovery.';
  const rollbackTarget =
    t(process.env.FAILURE_DRILL_ROLLBACK_TARGET)
    || 'If candidate recovery does not pass, execute rollback and compare with rollback verify.';

  const report = {
    createdAt: new Date().toISOString(),
    label,
    scenario,
    notes: t(process.env.FAILURE_DRILL_NOTES),
    expectedReports: {
      baselineReport: t(process.env.FAILURE_BASELINE_REPORT),
      degradedReport: t(process.env.FAILURE_DEGRADED_REPORT),
      restoredReport: t(process.env.FAILURE_RESTORED_REPORT),
      rollbackVerifyReport: t(process.env.ROLLBACK_VERIFY_REPORT),
      failureVerifyReport: t(process.env.FAILURE_VERIFY_REPORT_FILE),
    },
    instructions: [
      'Confirm baseline readiness and save the steady-state drill report.',
      degradedTarget,
      restoredTarget,
      rollbackTarget,
      'Attach command logs, screenshots, and resulting reports to the manual attestation evidence.',
    ],
  };

  await writeReport(outputFile, report);
}

main().catch((error) => {
  console.error(
    'Failure drill prep generation failed:',
    error instanceof Error ? error.stack || error.message : error
  );
  process.exitCode = 1;
});
