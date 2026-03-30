import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

function t(v) { return String(v || '').trim(); }
function base(v, f) { return t(v || f).replace(/\/+$/, ''); }
function int(v, f) { const n = Number.parseInt(t(v), 10); return Number.isFinite(n) && n > 0 ? n : f; }
function bool(v, f = false) { const s = t(v).toLowerCase(); if (!s) return f; if (['1','true','yes','on'].includes(s)) return true; if (['0','false','no','off'].includes(s)) return false; return f; }
function stamp(d = new Date()) { return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`; }
async function writeReport(file, data) { const target = t(file); if (!target) return; const dir = path.dirname(target); if (dir && dir !== '.') await mkdir(dir, { recursive: true }); await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); console.log(`RTC real-device prep report written to ${target}`); }
async function requestJson(baseUrl, token, method, pathname, { body, params } = {}) {
  const url = new URL(`${base(baseUrl, 'http://127.0.0.1:25500')}${pathname}`);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const headers = { Accept: 'application/json' };
  if (t(token)) headers.Authorization = `Bearer ${token}`;
  const init = { method, headers };
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text || null; }
  return { ok: response.ok, status: response.status, data: payload, url: url.toString() };
}
function normalizeIceServers(runtime) {
  const items = Array.isArray(runtime?.rtc_ice_servers) ? runtime.rtc_ice_servers : Array.isArray(runtime?.rtcIceServers) ? runtime.rtcIceServers : [];
  return items.map((x) => ({ url: t(x?.url || x?.URL), username: t(x?.username || x?.Username), credential: t(x?.credential || x?.Credential) })).filter((x) => x.url);
}
function hasTurn(iceServers) { return iceServers.some((x) => /^(turn|turns):/i.test(t(x.url))); }
function callRecord(payload) { return payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object' ? payload.data : payload; }
function callId(payload) { const record = callRecord(payload); return t(record && (record.uid || record.callId || record.call_id_raw || record.call_id)); }
function callPayload(label) {
  return {
    callType: 'audio',
    calleeRole: t(process.env.RTC_REAL_DEVICE_CALLEE_ROLE || process.env.RTC_DRILL_CALLEE_ROLE),
    calleeId: t(process.env.RTC_REAL_DEVICE_CALLEE_ID || process.env.RTC_DRILL_CALLEE_ID),
    calleePhone: t(process.env.RTC_REAL_DEVICE_CALLEE_PHONE || process.env.RTC_DRILL_CALLEE_PHONE),
    conversationId: t(process.env.RTC_REAL_DEVICE_CONVERSATION_ID || process.env.RTC_DRILL_CONVERSATION_ID) || `rtc_real_device_${label}`,
    orderId: t(process.env.RTC_REAL_DEVICE_ORDER_ID || process.env.RTC_DRILL_ORDER_ID) || `rtc-real-device-${label}`,
    entryPoint: t(process.env.RTC_REAL_DEVICE_ENTRY_POINT || process.env.RTC_DRILL_ENTRY_POINT) || 'release_real_device_prep',
    scene: t(process.env.RTC_REAL_DEVICE_SCENE || process.env.RTC_DRILL_SCENE) || 'rtc_real_device_validation',
    clientPlatform: t(process.env.RTC_REAL_DEVICE_CLIENT_PLATFORM || process.env.RTC_DRILL_CLIENT_PLATFORM) || 'h5',
    clientKind: t(process.env.RTC_REAL_DEVICE_CLIENT_KIND || process.env.RTC_DRILL_CLIENT_KIND) || 'release-real-device-prep',
    status: 'initiated',
    metadata: { label, source: 'scripts/rtc-real-device-prep.mjs' },
  };
}
function pagePath(query) { const params = new URLSearchParams(); for (const [k, v] of Object.entries(query || {})) { const s = t(v); if (s) params.set(k, s); } return `/pages/rtc/call/index?${params.toString()}`; }
function h5Url(host, page) { const b = base(host, ''); const p = t(page); return !b || !p ? '' : `${b}${p.startsWith('/') ? p : `/${p}`}`; }

async function main() {
  const startedAt = new Date();
  const label = t(process.env.RTC_REAL_DEVICE_LABEL || stamp(startedAt));
  const reportFile = t(process.env.RTC_REAL_DEVICE_REPORT_FILE || path.join('artifacts', 'rtc-real-device-prep', `${label}.json`));
  const authToken = t(process.env.RTC_REAL_DEVICE_AUTH_TOKEN || process.env.RTC_DRILL_AUTH_TOKEN);
  const payload = callPayload(label);
  const h5BaseUrl = t(process.env.RTC_REAL_DEVICE_H5_BASE_URL);
  const report = {
    startedAt: startedAt.toISOString(),
    completedAt: '',
    status: 'running',
    label,
    baseUrl: base(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500'),
    config: {
      requireRuntimeEnabled: bool(process.env.RTC_REAL_DEVICE_REQUIRE_RUNTIME_ENABLED, true),
      requireTurnServer: bool(process.env.RTC_REAL_DEVICE_REQUIRE_TURN_SERVER, false),
      requireIceServerCount: int(process.env.RTC_REAL_DEVICE_REQUIRE_ICE_SERVER_COUNT, 1),
      requireTimeoutMinSeconds: int(process.env.RTC_REAL_DEVICE_REQUIRE_TIMEOUT_MIN_SECONDS, 10),
      calleeRole: payload.calleeRole,
      calleeId: payload.calleeId,
      callerPlatform: t(process.env.RTC_REAL_DEVICE_CALLER_PLATFORM || process.env.RTC_REAL_DEVICE_CLIENT_PLATFORM) || 'h5',
      calleePlatform: t(process.env.RTC_REAL_DEVICE_CALLEE_PLATFORM),
      h5BaseUrl,
    },
    runtime: null,
    create: null,
    detail: null,
    launch: null,
    failure: '',
  };

  if (!authToken) {
    report.status = 'failed'; report.failure = 'RTC_REAL_DEVICE_AUTH_TOKEN or RTC_DRILL_AUTH_TOKEN is required'; report.completedAt = new Date().toISOString(); await writeReport(reportFile, report); console.error(report.failure); process.exitCode = 1; return;
  }
  if (!payload.calleeRole || !payload.calleeId) {
    report.status = 'failed'; report.failure = 'RTC_REAL_DEVICE_CALLEE_ROLE and RTC_REAL_DEVICE_CALLEE_ID are required'; report.completedAt = new Date().toISOString(); await writeReport(reportFile, report); console.error(report.failure); process.exitCode = 1; return;
  }

  try {
    const runtimeResponse = await requestJson(report.baseUrl, '', 'GET', '/api/public/runtime-settings');
    if (!runtimeResponse.ok || !runtimeResponse.data || typeof runtimeResponse.data !== 'object') throw new Error(`rtc_runtime_fetch_failed:${runtimeResponse.status || 0}`);
    const runtime = runtimeResponse.data;
    const iceServers = normalizeIceServers(runtime);
    report.runtime = { ok: true, enabled: runtime.rtc_enabled !== false, timeoutSeconds: int(runtime.rtc_timeout_seconds, 0), iceServerCount: iceServers.length, hasTurnServer: hasTurn(iceServers), iceServers };
    if (report.config.requireRuntimeEnabled && !report.runtime.enabled) throw new Error('rtc_runtime_disabled');
    if (report.runtime.timeoutSeconds < report.config.requireTimeoutMinSeconds) throw new Error(`rtc_runtime_timeout_too_low:${report.runtime.timeoutSeconds}`);
    if (report.runtime.iceServerCount < report.config.requireIceServerCount) throw new Error(`rtc_runtime_ice_count_too_low:${report.runtime.iceServerCount}`);
    if (report.config.requireTurnServer && !report.runtime.hasTurnServer) throw new Error('rtc_runtime_turn_server_missing');

    report.create = await requestJson(report.baseUrl, authToken, 'POST', '/api/rtc/calls', { body: payload });
    if (!report.create.ok) throw new Error(`rtc_create_failed:${report.create.status}`);
    const createdCallId = callId(report.create.data);
    if (!createdCallId) throw new Error('rtc_call_id_missing');

    report.detail = await requestJson(report.baseUrl, authToken, 'GET', `/api/rtc/calls/${encodeURIComponent(createdCallId)}`);
    if (!report.detail.ok) throw new Error(`rtc_detail_failed:${report.detail.status}`);
    const record = callRecord(report.detail.data) || callRecord(report.create.data) || {};

    const caller = {
      role: t(process.env.RTC_REAL_DEVICE_CALLER_ROLE || record.callerRole || record.caller_role || 'user'),
      id: t(process.env.RTC_REAL_DEVICE_CALLER_ID || record.callerId || record.caller_id),
      phone: t(process.env.RTC_REAL_DEVICE_CALLER_PHONE || record.callerPhone || record.caller_phone),
      name: t(process.env.RTC_REAL_DEVICE_CALLER_NAME || 'Current caller'),
      platform: t(process.env.RTC_REAL_DEVICE_CALLER_PLATFORM || record.callerPlatform || record.caller_platform || payload.clientPlatform || 'h5'),
    };
    const callee = {
      role: t(process.env.RTC_REAL_DEVICE_CALLEE_ROLE || record.calleeRole || record.callee_role || payload.calleeRole),
      id: t(process.env.RTC_REAL_DEVICE_CALLEE_ID || record.calleeId || record.callee_id || payload.calleeId),
      phone: t(process.env.RTC_REAL_DEVICE_CALLEE_PHONE || record.calleePhone || record.callee_phone || payload.calleePhone),
      name: t(process.env.RTC_REAL_DEVICE_CALLEE_NAME || 'Current callee'),
      platform: t(process.env.RTC_REAL_DEVICE_CALLEE_PLATFORM || record.calleePlatform || record.callee_platform),
    };
    const orderId = t(record.orderId || record.order_id || payload.orderId);
    const conversationId = t(record.conversationId || record.conversation_id || payload.conversationId);
    const timeoutSeconds = String(report.runtime.timeoutSeconds || '');
    const callerPath = pagePath({ mode: 'outgoing', callId: createdCallId, orderId, conversationId, targetName: callee.name, targetRole: callee.role, targetId: callee.id, targetPhone: callee.phone, entryPoint: payload.entryPoint, scene: payload.scene, timeoutSeconds });
    const calleePath = pagePath({ mode: 'incoming', callId: createdCallId, orderId, conversationId, targetName: caller.name, targetRole: caller.role, targetId: caller.id, targetPhone: caller.phone, entryPoint: payload.entryPoint, scene: payload.scene, timeoutSeconds });

    report.launch = {
      callId: createdCallId,
      orderId,
      conversationId,
      caller,
      callee,
      appCallerPath: callerPath,
      appCalleePath: calleePath,
      h5CallerUrl: h5Url(h5BaseUrl, callerPath),
      h5CalleeUrl: h5Url(h5BaseUrl, calleePath),
      instructions: [
        'Open the caller path on the caller device and verify invite, ringtone, and media negotiation.',
        'Open the callee path on the callee device while the call is pending and verify accept, reject, and end flows.',
        'Attach screen recording or screenshots from both devices to the manual attestation report.',
      ],
    };

    report.status = 'prepared';
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
    console.log(`RTC real-device prep created call ${createdCallId}`);
  } catch (error) {
    report.status = 'failed'; report.failure = error instanceof Error ? error.message : String(error); report.completedAt = new Date().toISOString(); await writeReport(reportFile, report); console.error(`RTC real-device prep failed: ${report.failure}`); process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('RTC real-device prep crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
