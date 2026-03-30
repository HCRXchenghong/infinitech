import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const DEFAULT_TIMEOUT_MS = 8000;

function normalizeBaseUrl(value, fallback) {
  return String(value || fallback || '').trim().replace(/\/+$/, '');
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanEnv(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
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
  const target = String(reportFile || '').trim();
  if (!target) return;
  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`RTC drill report written to ${target}`);
}

async function requestJson(baseUrl, token, method, pathname, { body, params } = {}) {
  const url = new URL(`${normalizeBaseUrl(baseUrl, 'http://127.0.0.1:25500')}${pathname}`);
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Accept: 'application/json',
  };
  if (String(token || '').trim()) {
    headers.Authorization = `Bearer ${token}`;
  }
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
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

function normalizeIceServers(runtimePayload) {
  if (!runtimePayload || typeof runtimePayload !== 'object') return [];
  const items = Array.isArray(runtimePayload.rtc_ice_servers)
    ? runtimePayload.rtc_ice_servers
    : Array.isArray(runtimePayload.rtcIceServers)
      ? runtimePayload.rtcIceServers
      : [];
  return items
    .map((item) => ({
      url: String(item?.url || item?.URL || '').trim(),
      username: String(item?.username || item?.Username || '').trim(),
      credential: String(item?.credential || item?.Credential || '').trim(),
    }))
    .filter((item) => item.url);
}

function hasTurnServer(iceServers) {
  return iceServers.some((item) => /^(turn|turns):/i.test(String(item.url || '').trim()));
}

function pickCallRecord(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.data && typeof payload.data === 'object' ? payload.data : payload;
}

function pickCallId(payload) {
  const record = pickCallRecord(payload);
  return String(
    (record && (record.uid || record.callId || record.call_id_raw || record.call_id)) ||
      ''
  ).trim();
}

function createCallPayload(label) {
  return {
    callType: 'audio',
    calleeRole: String(process.env.RTC_DRILL_CALLEE_ROLE || '').trim(),
    calleeId: String(process.env.RTC_DRILL_CALLEE_ID || '').trim(),
    calleePhone: String(process.env.RTC_DRILL_CALLEE_PHONE || '').trim(),
    conversationId:
      String(process.env.RTC_DRILL_CONVERSATION_ID || '').trim() || `rtc_drill_${label}`,
    orderId: String(process.env.RTC_DRILL_ORDER_ID || '').trim() || `rtc-drill-${label}`,
    entryPoint: String(process.env.RTC_DRILL_ENTRY_POINT || '').trim() || 'release_drill',
    scene: String(process.env.RTC_DRILL_SCENE || '').trim() || 'rtc_release_drill',
    clientPlatform: String(process.env.RTC_DRILL_CLIENT_PLATFORM || '').trim() || 'h5',
    clientKind: String(process.env.RTC_DRILL_CLIENT_KIND || '').trim() || 'release-drill',
    status: 'initiated',
    metadata: {
      label,
      source: 'scripts/rtc-call-drill.mjs',
    },
  };
}

function createStatusPayload(status, durationSeconds = 0) {
  return {
    status,
    durationSeconds,
    clientPlatform: String(process.env.RTC_DRILL_CLIENT_PLATFORM || '').trim() || 'h5',
    clientKind: String(process.env.RTC_DRILL_CLIENT_KIND || '').trim() || 'release-drill',
    metadata: {
      source: 'scripts/rtc-call-drill.mjs',
      transition: status,
    },
  };
}

function historyContainsCall(history, callId) {
  const items = history && history.data && Array.isArray(history.data.items) ? history.data.items : [];
  return items.some((item) => pickCallId(item) === callId);
}

function adminContainsCall(listResponse, callId) {
  const items = listResponse && listResponse.data && listResponse.data.data && Array.isArray(listResponse.data.data.items)
    ? listResponse.data.data.items
    : listResponse && listResponse.data && Array.isArray(listResponse.data.items)
      ? listResponse.data.items
      : [];
  return items.some((item) => pickCallId(item) === callId);
}

async function main() {
  const startedAt = new Date();
  const label = String(process.env.RTC_DRILL_LABEL || timestampLabel(startedAt)).trim();
  const baseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const authToken = String(process.env.RTC_DRILL_AUTH_TOKEN || '').trim();
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const timeoutMs = toPositiveInt(process.env.RTC_DRILL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const runAdminCheck = parseBooleanEnv(process.env.RTC_DRILL_RUN_ADMIN_CHECK, Boolean(adminToken));
  const reportFile = String(process.env.RTC_DRILL_REPORT_FILE || '').trim();
  const requireRuntimeEnabled = parseBooleanEnv(process.env.RTC_DRILL_REQUIRE_RUNTIME_ENABLED, true);
  const requireTurnServer = parseBooleanEnv(process.env.RTC_DRILL_REQUIRE_TURN_SERVER, false);
  const requireIceServerCount = toPositiveInt(process.env.RTC_DRILL_REQUIRE_ICE_SERVER_COUNT, 1);
  const requireTimeoutMinSeconds = toPositiveInt(process.env.RTC_DRILL_REQUIRE_TIMEOUT_MIN_SECONDS, 10);

  const report = {
    startedAt: startedAt.toISOString(),
    completedAt: '',
    status: 'running',
    label,
    baseUrl,
    config: {
      timeoutMs,
      runAdminCheck,
      requireRuntimeEnabled,
      requireTurnServer,
      requireIceServerCount,
      requireTimeoutMinSeconds,
      calleeRole: String(process.env.RTC_DRILL_CALLEE_ROLE || '').trim(),
      calleeId: String(process.env.RTC_DRILL_CALLEE_ID || '').trim(),
    },
    runtime: null,
    create: null,
    accepted: null,
    ended: null,
    detail: null,
    history: null,
    adminList: null,
    failure: '',
  };

  if (!authToken) {
    report.status = 'failed';
    report.failure = 'RTC_DRILL_AUTH_TOKEN is required';
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
    console.error(report.failure);
    process.exitCode = 1;
    return;
  }

  const payload = createCallPayload(label);
  if (!payload.calleeRole || !payload.calleeId) {
    report.status = 'failed';
    report.failure = 'RTC_DRILL_CALLEE_ROLE and RTC_DRILL_CALLEE_ID are required';
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
    console.error(report.failure);
    process.exitCode = 1;
    return;
  }

  let callId = '';

  try {
    report.runtime = await requestJson(baseUrl, '', 'GET', '/api/public/runtime-settings');
    if (!report.runtime.ok || !report.runtime.data || typeof report.runtime.data !== 'object') {
      throw new Error(`rtc_runtime_fetch_failed:${report.runtime.status || 0}`);
    }
    const runtimePayload = report.runtime.data;
    const runtimeEnabled = runtimePayload.rtc_enabled !== false;
    const runtimeTimeoutSeconds = toPositiveInt(runtimePayload.rtc_timeout_seconds, 0);
    const runtimeIceServers = normalizeIceServers(runtimePayload);
    report.runtime = {
      ok: true,
      enabled: runtimeEnabled,
      timeoutSeconds: runtimeTimeoutSeconds,
      iceServerCount: runtimeIceServers.length,
      hasTurnServer: hasTurnServer(runtimeIceServers),
      iceServers: runtimeIceServers,
    };
    if (requireRuntimeEnabled && !runtimeEnabled) {
      throw new Error('rtc_runtime_disabled');
    }
    if (runtimeTimeoutSeconds < requireTimeoutMinSeconds) {
      throw new Error(`rtc_runtime_timeout_too_low:${runtimeTimeoutSeconds}`);
    }
    if (runtimeIceServers.length < requireIceServerCount) {
      throw new Error(`rtc_runtime_ice_count_too_low:${runtimeIceServers.length}`);
    }
    if (requireTurnServer && !hasTurnServer(runtimeIceServers)) {
      throw new Error('rtc_runtime_turn_server_missing');
    }

    report.create = await requestJson(baseUrl, authToken, 'POST', '/api/rtc/calls', { body: payload });
    if (!report.create.ok) {
      throw new Error(`rtc_create_failed:${report.create.status}`);
    }
    callId = pickCallId(report.create.data);
    if (!callId) {
      throw new Error('rtc_call_id_missing');
    }

    report.accepted = await requestJson(
      baseUrl,
      authToken,
      'POST',
      `/api/rtc/calls/${encodeURIComponent(callId)}/status`,
      { body: createStatusPayload('accepted') }
    );
    if (!report.accepted.ok) {
      throw new Error(`rtc_accept_failed:${report.accepted.status}`);
    }

    report.ended = await requestJson(
      baseUrl,
      authToken,
      'POST',
      `/api/rtc/calls/${encodeURIComponent(callId)}/status`,
      { body: createStatusPayload('ended', 12) }
    );
    if (!report.ended.ok) {
      throw new Error(`rtc_end_failed:${report.ended.status}`);
    }

    report.detail = await requestJson(baseUrl, authToken, 'GET', `/api/rtc/calls/${encodeURIComponent(callId)}`);
    if (!report.detail.ok) {
      throw new Error(`rtc_detail_failed:${report.detail.status}`);
    }
    const finalRecord = pickCallRecord(report.detail.data);
    if (String(finalRecord?.status || '').trim().toLowerCase() !== 'ended') {
      throw new Error('rtc_detail_not_ended');
    }

    report.history = await requestJson(baseUrl, authToken, 'GET', '/api/rtc/calls/history', {
      params: { limit: 20 },
    });
    if (!report.history.ok) {
      throw new Error(`rtc_history_failed:${report.history.status}`);
    }
    if (!historyContainsCall(report.history, callId)) {
      throw new Error('rtc_history_missing_call');
    }

    if (runAdminCheck) {
      report.adminList = await requestJson(baseUrl, adminToken, 'GET', '/api/rtc-call-audits', {
        params: { keyword: callId, limit: 10 },
      });
      if (!report.adminList.ok) {
        throw new Error(`rtc_admin_list_failed:${report.adminList.status}`);
      }
      if (!adminContainsCall(report.adminList, callId)) {
        throw new Error('rtc_admin_list_missing_call');
      }
    }

    report.status = 'passed';
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
    console.log(`RTC drill passed for call ${callId}`);
    return;
  } catch (error) {
    report.status = 'failed';
    report.failure = error instanceof Error ? error.message : String(error);
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
    console.error(`RTC drill failed: ${report.failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('RTC drill crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
