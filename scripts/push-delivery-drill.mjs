import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_POLLS = 8;
const DEFAULT_DISPATCH_LIMIT = 100;
const DEFAULT_DELIVERY_LIMIT = 20;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeReport(reportFile, report) {
  const target = String(reportFile || '').trim();
  if (!target) return;
  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Push delivery drill report written to ${target}`);
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
    Authorization: `Bearer ${token}`,
  };
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

function createPushMessagePayload(label, now = new Date()) {
  const startedAt = new Date(now.getTime() - 60_000).toISOString();
  const endsAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  return {
    title: `[Drill] Push Delivery ${label}`,
    content: `push-delivery-drill:${label}`,
    image_url: '',
    compress_image: false,
    is_active: true,
    scheduled_start_time: startedAt,
    scheduled_end_time: endsAt,
  };
}

function findDrillMessage(items, payload) {
  if (!Array.isArray(items)) return null;
  return items.find((item) => {
    if (!item || typeof item !== 'object') return false;
    return String(item.title || '').trim() === payload.title
      && String(item.content || '').trim() === payload.content;
  }) || null;
}

function summarizeStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return {
      totalDeliveries: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      acknowledged: 0,
      received: 0,
      read: 0,
      unread: 0,
    };
  }
  return {
    totalDeliveries: Number(stats.total_deliveries || 0),
    queued: Number(stats.queued_count || 0),
    sent: Number(stats.sent_count || 0),
    failed: Number(stats.failed_count || 0),
    acknowledged: Number(stats.acknowledged_count || 0),
    received: Number(stats.received_count || 0),
    read: Number(stats.read_count || 0),
    unread: Number(stats.unread_count || 0),
  };
}

function normalizeProvider(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeTokenSuffix(value) {
  return normalizeText(value).toLowerCase();
}

function pickMessageIdentifier(message) {
  if (!message || typeof message !== 'object') return '';
  return String(message.id || message.tsid || message.legacyId || '').trim();
}

async function main() {
  const startedAt = new Date();
  const label = String(process.env.PUSH_DRILL_LABEL || timestampLabel(startedAt)).trim();
  const baseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, 'http://127.0.0.1:25500');
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const timeoutMs = toPositiveInt(process.env.PUSH_DRILL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const pollIntervalMs = toPositiveInt(process.env.PUSH_DRILL_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);
  const maxPolls = toPositiveInt(process.env.PUSH_DRILL_MAX_POLLS, DEFAULT_MAX_POLLS);
  const dispatchLimit = toPositiveInt(process.env.PUSH_DRILL_DISPATCH_LIMIT, DEFAULT_DISPATCH_LIMIT);
  const deliveryLimit = toPositiveInt(process.env.PUSH_DRILL_DELIVERY_LIMIT, DEFAULT_DELIVERY_LIMIT);
  const requireDeliveries = parseBooleanEnv(process.env.PUSH_DRILL_REQUIRE_DELIVERIES, true);
  const requireAcknowledged = parseBooleanEnv(process.env.PUSH_DRILL_REQUIRE_ACKNOWLEDGED, false);
  const requireRead = parseBooleanEnv(process.env.PUSH_DRILL_REQUIRE_READ, false);
  const allowFailedOnly = parseBooleanEnv(process.env.PUSH_DRILL_ALLOW_FAILED_ONLY, false);
  const requiredProvider = normalizeProvider(process.env.PUSH_DRILL_REQUIRE_PROVIDER);
  const requiredUserType = normalizeText(process.env.PUSH_DRILL_REQUIRE_USER_TYPE).toLowerCase();
  const requiredUserId = normalizeText(process.env.PUSH_DRILL_REQUIRE_USER_ID);
  const requiredAppEnv = normalizeText(process.env.PUSH_DRILL_REQUIRE_APP_ENV).toLowerCase();
  const requiredDeviceTokenSuffix = normalizeTokenSuffix(process.env.PUSH_DRILL_REQUIRE_DEVICE_TOKEN_SUFFIX);
  const keepMessage = parseBooleanEnv(process.env.PUSH_DRILL_KEEP_MESSAGE, false);
  const reportFile = String(process.env.PUSH_DRILL_REPORT_FILE || '').trim();

  const report = {
    startedAt: startedAt.toISOString(),
    completedAt: '',
    status: 'running',
    label,
    baseUrl,
    config: {
      timeoutMs,
      pollIntervalMs,
      maxPolls,
      dispatchLimit,
      deliveryLimit,
      requireDeliveries,
      requireAcknowledged,
      requireRead,
      allowFailedOnly,
      requiredProvider,
      requiredUserType,
      requiredUserId,
      requiredAppEnv,
      requiredDeviceTokenSuffix,
      keepMessage,
    },
    message: null,
    creation: null,
    dispatchCycles: [],
    polls: [],
    cleanup: null,
    failure: '',
  };

  if (!adminToken) {
    report.status = 'failed';
    report.completedAt = new Date().toISOString();
    report.failure = 'ADMIN_TOKEN is required';
    await writeReport(reportFile, report);
    console.error(report.failure);
    process.exitCode = 1;
    return;
  }

  const payload = createPushMessagePayload(label, startedAt);
  let messageId = '';
  const requiresTargetMatch = Boolean(
    requiredUserType || requiredUserId || requiredAppEnv || requiredDeviceTokenSuffix
  );

  function deliveryMatchesTarget(item = {}) {
    const userType = normalizeText(item.user_type || item.userType).toLowerCase();
    const userId = normalizeText(item.user_id || item.userId);
    const appEnv = normalizeText(item.app_env || item.appEnv).toLowerCase();
    const deviceToken = normalizeTokenSuffix(item.device_token || item.deviceToken);
    if (requiredUserType && userType !== requiredUserType) return false;
    if (requiredUserId && userId !== requiredUserId) return false;
    if (requiredAppEnv && appEnv !== requiredAppEnv) return false;
    if (requiredDeviceTokenSuffix && !deviceToken.endsWith(requiredDeviceTokenSuffix)) return false;
    return true;
  }

  try {
    const createResponse = await requestJson(baseUrl, adminToken, 'POST', '/api/push-messages', { body: payload });
    report.creation = createResponse;
    if (!createResponse.ok) {
      throw new Error(`create_push_message_failed:${createResponse.status}`);
    }

    const listResponse = await requestJson(baseUrl, adminToken, 'GET', '/api/push-messages');
    if (!listResponse.ok) {
      throw new Error(`list_push_messages_failed:${listResponse.status}`);
    }
    const message = findDrillMessage(listResponse.data, payload);
    if (!message) {
      throw new Error('created_push_message_not_found');
    }
    messageId = pickMessageIdentifier(message);
    if (!messageId) {
      throw new Error('created_push_message_missing_id');
    }
    report.message = {
      id: messageId,
      title: payload.title,
      content: payload.content,
    };

    for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
      const dispatchResponse = await requestJson(baseUrl, adminToken, 'POST', '/api/push-messages/dispatch-cycle', {
        body: { limit: dispatchLimit },
      });
      report.dispatchCycles.push({
        attempt,
        ok: dispatchResponse.ok,
        status: dispatchResponse.status,
        data: dispatchResponse.data,
      });
      if (!dispatchResponse.ok) {
        throw new Error(`dispatch_cycle_failed:${dispatchResponse.status}`);
      }

      await sleep(Math.min(timeoutMs, pollIntervalMs));

      const [statsResponse, deliveriesResponse] = await Promise.all([
        requestJson(baseUrl, adminToken, 'GET', `/api/push-messages/${encodeURIComponent(messageId)}/stats`),
        requestJson(baseUrl, adminToken, 'GET', `/api/push-messages/${encodeURIComponent(messageId)}/deliveries`, {
          params: { limit: deliveryLimit },
        }),
      ]);
      if (!statsResponse.ok) {
        throw new Error(`push_stats_failed:${statsResponse.status}`);
      }
      if (!deliveriesResponse.ok) {
        throw new Error(`push_deliveries_failed:${deliveriesResponse.status}`);
      }

      const stats = summarizeStats(statsResponse.data);
      const deliveries = deliveriesResponse.data && Array.isArray(deliveriesResponse.data.items)
        ? deliveriesResponse.data.items
        : [];
      const matchingDeliveries = requiresTargetMatch
        ? deliveries.filter((item) => deliveryMatchesTarget(item))
        : deliveries;
      const observedProviders = Array.from(
        new Set(
          deliveries
            .map((item) => normalizeProvider(item.dispatch_provider))
            .filter(Boolean)
        )
      );
      report.polls.push({
        attempt,
        stats,
        target: {
          required: requiresTargetMatch,
          matchCount: matchingDeliveries.length,
          statuses: matchingDeliveries.map((item) => ({
            userType: item.user_type || item.userType || '',
            userId: item.user_id || item.userId || '',
            appEnv: item.app_env || item.appEnv || '',
            deviceTokenSuffix: normalizeText(item.device_token || item.deviceToken).slice(-8),
            status: item.status || '',
            dispatchProvider: item.dispatch_provider || item.dispatchProvider || '',
          })),
        },
        observedProviders,
        deliveryStatuses: deliveries.map((item) => ({
          id: item.id,
          status: item.status,
          retryCount: item.retry_count,
          errorCode: item.error_code,
          dispatchProvider: item.dispatch_provider,
          providerMessageId: item.provider_message_id,
        })),
      });

      if (requireDeliveries && stats.totalDeliveries <= 0) {
        if (attempt === maxPolls) {
          throw new Error('push_drill_no_active_recipients');
        }
        continue;
      }

      if (requiresTargetMatch && matchingDeliveries.length <= 0) {
        if (attempt === maxPolls) {
          throw new Error('push_drill_target_delivery_not_found');
        }
        continue;
      }

      const providerSatisfied = !requiredProvider
        || observedProviders.length === 0
        || observedProviders.includes(requiredProvider);
      if (!providerSatisfied) {
        const allTerminalForWrongProvider =
          stats.totalDeliveries > 0
          && stats.queued <= 0
          && deliveries.every((item) => {
            const status = String(item.status || '').trim().toLowerCase();
            return status === 'failed' || status === 'sent' || status === 'acknowledged' || status === 'inactive';
          });
        if (allTerminalForWrongProvider || attempt === maxPolls) {
          throw new Error(`push_drill_provider_mismatch:${requiredProvider}`);
        }
        continue;
      }

      const sentSatisfied = stats.sent > 0 || stats.acknowledged > 0;
      const acknowledgedSatisfied = !requireAcknowledged || stats.acknowledged > 0;
      const readSatisfied = !requireRead || stats.read > 0;
      const targetSentSatisfied = !requiresTargetMatch || matchingDeliveries.some((item) => {
        const status = normalizeText(item.status).toLowerCase();
        return status === 'sent' || status === 'acknowledged';
      });
      const targetAcknowledgedSatisfied = !requiresTargetMatch || !requireAcknowledged || matchingDeliveries.some((item) => {
        const status = normalizeText(item.status).toLowerCase();
        return status === 'acknowledged';
      });

      if (sentSatisfied && acknowledgedSatisfied && readSatisfied && targetSentSatisfied && targetAcknowledgedSatisfied) {
        report.status = 'passed';
        report.completedAt = new Date().toISOString();
        await writeReport(reportFile, report);
        console.log(`Push delivery drill passed for message ${messageId}`);
        return;
      }

      if (allowFailedOnly && stats.failed > 0 && stats.sent <= 0 && stats.acknowledged <= 0) {
        report.status = 'passed_with_failed_only';
        report.completedAt = new Date().toISOString();
        await writeReport(reportFile, report);
        console.log(`Push delivery drill finished with provider failures only for message ${messageId}`);
        return;
      }

      const allTerminal = stats.totalDeliveries > 0 && stats.queued <= 0 && deliveries.every((item) => {
        const status = String(item.status || '').trim().toLowerCase();
        return status === 'failed' || status === 'sent' || status === 'acknowledged' || status === 'inactive';
      });
      if (requiresTargetMatch && allTerminal && matchingDeliveries.length <= 0) {
        throw new Error('push_drill_terminal_without_target_delivery');
      }
      if (allTerminal && stats.sent <= 0 && stats.acknowledged <= 0) {
        throw new Error('push_drill_terminal_without_success');
      }
    }

    throw new Error('push_drill_timeout');
  } catch (error) {
    report.status = 'failed';
    report.failure = error instanceof Error ? error.message : String(error);
    report.completedAt = new Date().toISOString();
  } finally {
    if (messageId && !keepMessage) {
      const cleanupResponse = await requestJson(baseUrl, adminToken, 'DELETE', `/api/push-messages/${encodeURIComponent(messageId)}`);
      report.cleanup = cleanupResponse;
    }
    if (!report.completedAt) {
      report.completedAt = new Date().toISOString();
    }
    await writeReport(reportFile, report);
  }

  console.error(`Push delivery drill failed: ${report.failure}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Push delivery drill crashed:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
