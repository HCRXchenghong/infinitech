import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateReleaseEvidenceBundle } from './release-evidence-gate.mjs';

function createPassedStatus(summary = {}) {
  return {
    status: 'passed',
    completedAt: '2026-04-25T00:00:00.000Z',
    ...summary,
  };
}

function createPassingLiveCutover() {
  return createPassedStatus({
    failures: [],
    releaseDrill: {
      summary: createPassedStatus({
        preflight: createPassedStatus(),
        httpLoadSmoke: createPassedStatus(),
        pushDeliveryDrill: createPassedStatus(),
        rtcCallDrill: createPassedStatus(),
        rtcRetentionDrill: createPassedStatus(),
      }),
    },
  });
}

test('evaluateReleaseEvidenceBundle passes when release, secret rotation, and realtime reports are all green', () => {
  const failures = evaluateReleaseEvidenceBundle({
    liveCutover: createPassingLiveCutover(),
    rollbackVerify: createPassedStatus({ failures: [] }),
    failureVerify: createPassedStatus({ failures: [] }),
    secretRotation: createPassedStatus(),
    realtimeAcceptance: createPassedStatus(),
  });

  assert.deepEqual(failures, []);
});

test('evaluateReleaseEvidenceBundle rejects missing or failed supporting reports', () => {
  const failures = evaluateReleaseEvidenceBundle({
    liveCutover: createPassingLiveCutover(),
    rollbackVerify: createPassedStatus({ failures: [] }),
    failureVerify: createPassedStatus({ failures: [] }),
    secretRotation: {
      status: 'failed',
      error: 'missing prod evidence',
    },
    realtimeAcceptance: null,
  });

  assert.ok(failures.some((failure) => /secret_rotation_status=failed/.test(failure)));
  assert.ok(failures.some((failure) => /secret_rotation_error=missing prod evidence/.test(failure)));
  assert.ok(failures.some((failure) => /realtime_acceptance_report_invalid/.test(failure)));
});
