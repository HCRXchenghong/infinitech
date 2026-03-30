import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

function t(v) {
  return String(v || '').trim();
}

function lower(v) {
  return t(v).toLowerCase();
}

function baseUrl(value, fallback) {
  return t(value || fallback).replace(/\/+$/, '');
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
  console.log(`Push real-device prep report written to ${target}`);
}

async function requestJson(base, pathname) {
  const url = new URL(`${baseUrl(base, 'http://127.0.0.1:1029')}${pathname}`);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_error) {
    payload = text || null;
  }
  return {
    ok: response.ok,
    status: response.status,
    data: payload,
    url: url.toString(),
  };
}

function pickPushWorker(body) {
  return body?.dependencies?.pushWorker?.worker
    && typeof body.dependencies.pushWorker.worker === 'object'
    ? body.dependencies.pushWorker.worker
    : null;
}

async function main() {
  const label = t(process.env.PUSH_REAL_DEVICE_LABEL || timestampLabel());
  const reportFile = t(
    process.env.PUSH_REAL_DEVICE_PREP_REPORT_FILE
      || path.join('artifacts', 'push-real-device-prep', `${label}.json`)
  );
  const goBase = baseUrl(
    process.env.PUSH_REAL_DEVICE_GO_BASE_URL || process.env.GO_BASE_URL,
    'http://127.0.0.1:1029'
  );

  const requiredProvider = lower(
    process.env.PUSH_REAL_DEVICE_PROVIDER || process.env.PUSH_DRILL_REQUIRE_PROVIDER
  );
  const requiredUserType = lower(
    process.env.PUSH_REAL_DEVICE_USER_TYPE || process.env.PUSH_DRILL_REQUIRE_USER_TYPE
  );
  const requiredUserId = t(
    process.env.PUSH_REAL_DEVICE_USER_ID || process.env.PUSH_DRILL_REQUIRE_USER_ID
  );
  const requiredAppEnv = lower(
    process.env.PUSH_REAL_DEVICE_APP_ENV || process.env.PUSH_DRILL_REQUIRE_APP_ENV
  );
  const requiredDeviceTokenSuffix = lower(
    process.env.PUSH_REAL_DEVICE_DEVICE_TOKEN_SUFFIX || process.env.PUSH_DRILL_REQUIRE_DEVICE_TOKEN_SUFFIX
  );

  const report = {
    createdAt: new Date().toISOString(),
    label,
    goBaseUrl: goBase,
    target: {
      provider: requiredProvider,
      userType: requiredUserType,
      userId: requiredUserId,
      appEnv: requiredAppEnv,
      deviceTokenSuffix: requiredDeviceTokenSuffix,
    },
    readiness: null,
    failure: '',
  };

  if (
    !requiredProvider
    && !requiredUserType
    && !requiredUserId
    && !requiredAppEnv
    && !requiredDeviceTokenSuffix
  ) {
    report.failure = 'at least one push target or provider constraint is required';
    await writeReport(reportFile, report);
    console.error(report.failure);
    process.exitCode = 1;
    return;
  }

  try {
    const ready = await requestJson(goBase, '/ready');
    if (!ready.ok || !ready.data || typeof ready.data !== 'object') {
      throw new Error(`push_ready_fetch_failed:${ready.status || 0}`);
    }
    const worker = pickPushWorker(ready.data);
    if (!worker) {
      throw new Error('push_worker_snapshot_missing');
    }
    report.readiness = {
      status: t(ready.data.status),
      worker,
      productionReady: worker.productionReady === true,
      productionIssues: Array.isArray(worker.productionIssues) ? worker.productionIssues : [],
    };
    if (worker.enabled === true && worker.running !== true) {
      throw new Error('push_worker_not_running');
    }
    if (worker.productionReady === false) {
      throw new Error(
        `push_worker_not_production_ready:${(worker.productionIssues || []).join(',') || 'not_ready'}`
      );
    }
    if (requiredProvider && lower(worker.provider) && lower(worker.provider) !== requiredProvider) {
      throw new Error(`push_provider_mismatch:${lower(worker.provider)}`);
    }

    report.instructions = [
      'Confirm the selected real test device is online and registered under the target identity below.',
      'Run release-live-cutover or push-delivery-drill with the same provider and target constraints.',
      'Save the provider console screenshot and device receipt evidence into the manual attestation report.',
    ];

    await writeReport(reportFile, report);
  } catch (error) {
    report.failure = error instanceof Error ? error.message : String(error);
    await writeReport(reportFile, report);
    console.error(`Push real-device prep failed: ${report.failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    'Push real-device prep crashed:',
    error instanceof Error ? error.stack || error.message : error
  );
  process.exitCode = 1;
});
