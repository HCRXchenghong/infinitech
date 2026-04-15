import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requireFromAdmin = createRequire(new URL('../admin-vue/package.json', import.meta.url));
const { io } = requireFromAdmin('socket.io-client');

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_BFF_BASE_URL = 'http://127.0.0.1:25500';
const DEFAULT_GO_BASE_URL = 'http://127.0.0.1:1029';
const DEFAULT_SOCKET_BASE_URL = 'http://127.0.0.1:9898';
const DEFAULT_DB_PATH = path.join(REPO_ROOT, 'backend/go/data/yuexiang.db');
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_SHORT_WAIT_MS = 350;

function normalizeBaseUrl(value, fallback) {
  return String(value || fallback || '').trim().replace(/\/+$/, '');
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(dbPath, sql, { json = false } = {}) {
  const args = [];
  if (json) {
    args.push('-json');
  }
  args.push(dbPath, sql);
  const output = execFileSync('sqlite3', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  if (!json) {
    return output;
  }
  if (!output) {
    return [];
  }
  return JSON.parse(output);
}

function queryOne(dbPath, sql) {
  const rows = runSql(dbPath, sql, { json: true });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function execSql(dbPath, sql) {
  runSql(dbPath, sql, { json: false });
}

function encodeGoBase64Url(value) {
  return Buffer.from(String(value || ''), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signGoStyleTokenPayload(payload, secret) {
  const payloadBase64 = encodeGoBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', String(secret || ''))
    .update(payloadBase64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${payloadBase64}.${signature}`;
}

function buildUserAccessToken(entity, jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  return signGoStyleTokenPayload(
    {
      phone: entity.phone,
      userId: Number(entity.id),
      type: 'access',
      exp: now + 7 * 24 * 60 * 60,
      iat: now,
    },
    jwtSecret
  );
}

function buildAdminAccessToken(admin, jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  const adminType = String(admin?.type || '').trim().toLowerCase();
  assertCondition(
    adminType === 'admin' || adminType === 'super_admin',
    `admin ${admin?.uid || admin?.id || ''} is missing an explicit admin type`
  );
  return signGoStyleTokenPayload(
    {
      phone: admin.phone,
      userId: Number(admin.id),
      id: admin.uid,
      sub: admin.uid,
      adminId: admin.uid,
      name: admin.name,
      type: adminType,
      bootstrapPending: false,
      exp: now + 7 * 24 * 60 * 60,
      iat: now,
    },
    jwtSecret
  );
}

function authHeader(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
}

async function requestJson(baseUrl, method, pathname, { token, body, params, headers } = {}) {
  const url = new URL(`${normalizeBaseUrl(baseUrl, DEFAULT_BFF_BASE_URL)}${pathname}`);
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...(headers || {}),
  };
  if (String(token || '').trim()) {
    requestHeaders.Authorization = authHeader(token);
  }

  const init = {
    method,
    headers: requestHeaders,
  };
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = text || null;
  }
  return {
    ok: response.ok,
    status: response.status,
    url: url.toString(),
    data,
  };
}

async function writeReport(reportFile, report) {
  const target = String(reportFile || '').trim();
  if (!target) return;
  const directory = path.dirname(target);
  if (directory && directory !== '.') {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(target, `${safeStringify(report)}\n`, 'utf8');
  console.log(`IM E2E report written to ${target}`);
}

function sanitizeReportValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'function') {
    return undefined;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value.socket && Array.isArray(value.events)) {
    return {
      label: String(value.label || '').trim(),
      connected: Boolean(value.socket?.connected),
      eventCount: value.events.length,
    };
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReportValue(item, seen));
  }

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const sanitized = sanitizeReportValue(child, seen);
    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  }
  return output;
}

function safeStringify(value) {
  return JSON.stringify(sanitizeReportValue(value), null, 2);
}

function normalizeDataPayload(payload) {
  if (payload && typeof payload === 'object' && payload.data !== undefined) {
    return payload.data;
  }
  return payload;
}

function resolveRecordId(item) {
  return String(
    item?.id ||
    item?.uid ||
    item?.callId ||
    item?.call_id ||
    item?.call_id_raw ||
    ''
  ).trim();
}

function pickListItems(payload) {
  const data = normalizeDataPayload(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function resolveNotificationList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function resolveNotificationUnreadCount(payload) {
  if (Number.isFinite(Number(payload?.unreadCount))) return Number(payload.unreadCount);
  if (Number.isFinite(Number(payload?.data?.unreadCount))) return Number(payload.data.unreadCount);
  if (Number.isFinite(Number(payload?.unread_count))) return Number(payload.unread_count);
  return 0;
}

function generateRiderChatId(riderId, otherId, type) {
  const text = `${type}_${riderId}_${otherId}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return String((Math.abs(hash) % 900000) + 100000);
}

function createSocketHarness(socket, label) {
  const events = [];
  const waiters = [];

  const cleanupWaiter = (waiter) => {
    const index = waiters.indexOf(waiter);
    if (index >= 0) {
      waiters.splice(index, 1);
    }
  };

  socket.onAny((eventName, ...args) => {
    const entry = {
      event: eventName,
      args,
      timestamp: new Date().toISOString(),
    };
    events.push(entry);

    for (const waiter of [...waiters]) {
      if (waiter.eventName !== eventName) continue;
      try {
        const matched = waiter.predicate ? waiter.predicate(args[0], args) : true;
        if (!matched) continue;
        cleanupWaiter(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(entry);
      } catch (error) {
        cleanupWaiter(waiter);
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    }
  });

  return {
    label,
    socket,
    events,
    waitFor(eventName, predicate, timeoutMs = DEFAULT_TIMEOUT_MS) {
      const historical = events.find((entry) => {
        if (entry.event !== eventName) return false;
        return predicate ? predicate(entry.args[0], entry.args) : true;
      });
      if (historical) {
        return Promise.resolve(historical);
      }

      return new Promise((resolve, reject) => {
        const waiter = {
          eventName,
          predicate,
          resolve,
          reject,
          timer: setTimeout(() => {
            cleanupWaiter(waiter);
            reject(new Error(`${label} timed out waiting for ${eventName}`));
          }, timeoutMs),
        };
        waiters.push(waiter);
      });
    },
    disconnect() {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}

async function connectSocket({ socketBaseUrl, namespace, socketToken, label, timeoutMs }) {
  const socket = io(`${normalizeBaseUrl(socketBaseUrl, DEFAULT_SOCKET_BASE_URL)}${namespace}`, {
    transports: ['websocket', 'polling'],
    timeout: timeoutMs,
    reconnection: false,
    autoConnect: false,
    auth: {
      token: socketToken,
    },
  });
  const harness = createSocketHarness(socket, label);

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`${label} connect timeout`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error) => {
      cleanup();
      reject(new Error(`${label} connect_error: ${error?.message || error}`));
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
    socket.connect();
  });

  return harness;
}

async function step(report, name, fn) {
  const startedAt = new Date().toISOString();
  console.log(`\n[verify-im-e2e] ${name} ...`);
  try {
    const result = await fn();
    report.steps[name] = {
      status: 'passed',
      startedAt,
      completedAt: new Date().toISOString(),
      result: sanitizeReportValue(result),
    };
    console.log(`[verify-im-e2e] ${name} passed`);
    return result;
  } catch (error) {
    report.steps[name] = {
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      error: error?.message || String(error),
    };
    throw error;
  }
}

function ensureFixtureEntities(dbPath) {
  const now = new Date().toISOString();

  const fixtures = {
    user: {
      phone: '13900000011',
      name: '联调用户',
      uid: '26041000000011',
      roleId: 1001,
      type: 'customer',
    },
    rider: {
      phone: '13900000021',
      name: '联调骑手',
      uid: '26041010000021',
      roleId: 2001,
      avatar: 'https://example.com/fixtures/rider.png',
    },
    merchant: {
      phone: '13900000031',
      name: '联调商家',
      uid: '26041020000031',
      roleId: 3001,
    },
    shop: {
      uid: '26041040000041',
      name: '联调商家测试店',
      phone: '13900000031',
      address: '联调路 1 号',
    },
  };

  execSql(
    dbPath,
    `
    INSERT INTO users (uid, role_id, phone, name, type, created_at, updated_at)
    VALUES (${sqlLiteral(fixtures.user.uid)}, ${sqlLiteral(fixtures.user.roleId)}, ${sqlLiteral(fixtures.user.phone)}, ${sqlLiteral(fixtures.user.name)}, ${sqlLiteral(fixtures.user.type)}, ${sqlLiteral(now)}, ${sqlLiteral(now)})
    ON CONFLICT(phone) DO UPDATE SET
      uid = excluded.uid,
      role_id = excluded.role_id,
      name = excluded.name,
      type = excluded.type,
      updated_at = excluded.updated_at;

    INSERT INTO riders (uid, role_id, phone, name, avatar, is_online, is_verified, created_at, updated_at)
    VALUES (${sqlLiteral(fixtures.rider.uid)}, ${sqlLiteral(fixtures.rider.roleId)}, ${sqlLiteral(fixtures.rider.phone)}, ${sqlLiteral(fixtures.rider.name)}, ${sqlLiteral(fixtures.rider.avatar)}, 1, 1, ${sqlLiteral(now)}, ${sqlLiteral(now)})
    ON CONFLICT(phone) DO UPDATE SET
      uid = excluded.uid,
      role_id = excluded.role_id,
      name = excluded.name,
      avatar = excluded.avatar,
      is_online = 1,
      is_verified = 1,
      updated_at = excluded.updated_at;

    INSERT INTO merchants (uid, role_id, phone, name, owner_name, is_online, created_at, updated_at)
    VALUES (${sqlLiteral(fixtures.merchant.uid)}, ${sqlLiteral(fixtures.merchant.roleId)}, ${sqlLiteral(fixtures.merchant.phone)}, ${sqlLiteral(fixtures.merchant.name)}, ${sqlLiteral(fixtures.merchant.name)}, 1, ${sqlLiteral(now)}, ${sqlLiteral(now)})
    ON CONFLICT(phone) DO UPDATE SET
      uid = excluded.uid,
      role_id = excluded.role_id,
      name = excluded.name,
      owner_name = excluded.owner_name,
      is_online = 1,
      updated_at = excluded.updated_at;
    `
  );

  const user = queryOne(
    dbPath,
    `SELECT id, uid, phone, name FROM users WHERE phone = ${sqlLiteral(fixtures.user.phone)} LIMIT 1;`
  );
  const rider = queryOne(
    dbPath,
    `SELECT id, uid, phone, name, avatar FROM riders WHERE phone = ${sqlLiteral(fixtures.rider.phone)} LIMIT 1;`
  );
  const merchant = queryOne(
    dbPath,
    `SELECT id, uid, phone, name FROM merchants WHERE phone = ${sqlLiteral(fixtures.merchant.phone)} LIMIT 1;`
  );
  const admin = queryOne(
    dbPath,
    `SELECT id, uid, phone, name, type FROM admins ORDER BY id ASC LIMIT 1;`
  );

  assertCondition(user && user.id, 'failed to upsert test user');
  assertCondition(rider && rider.id, 'failed to upsert test rider');
  assertCondition(merchant && merchant.id, 'failed to upsert test merchant');
  assertCondition(admin && admin.id, 'failed to resolve admin fixture');

  const existingShop = queryOne(
    dbPath,
    `SELECT id, uid, merchant_id, name, phone FROM shops WHERE merchant_id = ${sqlLiteral(merchant.id)} ORDER BY id ASC LIMIT 1;`
  );
  if (existingShop && existingShop.id) {
    execSql(
      dbPath,
      `
      UPDATE shops
      SET uid = COALESCE(NULLIF(uid, ''), ${sqlLiteral(fixtures.shop.uid)}),
          name = ${sqlLiteral(fixtures.shop.name)},
          phone = ${sqlLiteral(fixtures.shop.phone)},
          address = ${sqlLiteral(fixtures.shop.address)},
          merchant_type = 'takeout',
          business_category = '美食',
          business_category_key = 'food',
          is_active = 1,
          updated_at = ${sqlLiteral(now)}
      WHERE id = ${sqlLiteral(existingShop.id)};
      `
    );
  } else {
    execSql(
      dbPath,
      `
      INSERT INTO shops (uid, merchant_id, name, merchant_type, business_category, business_category_key, address, phone, is_active, created_at, updated_at)
      VALUES (${sqlLiteral(fixtures.shop.uid)}, ${sqlLiteral(merchant.id)}, ${sqlLiteral(fixtures.shop.name)}, 'takeout', '美食', 'food', ${sqlLiteral(fixtures.shop.address)}, ${sqlLiteral(fixtures.shop.phone)}, 1, ${sqlLiteral(now)}, ${sqlLiteral(now)});
      `
    );
  }

  const shop = queryOne(
    dbPath,
    `SELECT id, uid, merchant_id, name, phone FROM shops WHERE merchant_id = ${sqlLiteral(merchant.id)} ORDER BY id ASC LIMIT 1;`
  );
  assertCondition(shop && shop.id, 'failed to ensure merchant shop fixture');

  return {
    admin,
    user,
    rider,
    merchant,
    shop,
  };
}

async function generateSocketToken(socketBaseUrl, businessToken, userId, role) {
  const response = await requestJson(socketBaseUrl, 'POST', '/api/generate-token', {
    token: businessToken,
    body: {
      userId: String(userId),
      role: String(role),
    },
  });
  assertCondition(response.ok, `socket token generation failed for ${role}:${userId} with ${response.status}`);
  assertCondition(String(response.data?.token || '').trim(), `socket token missing for ${role}:${userId}`);
  return response.data.token;
}

async function verifyReadiness(baseUrl, expectedStatus = 'ready') {
  const response = await requestJson(baseUrl, 'GET', '/ready');
  assertCondition(response.ok, `${baseUrl}/ready failed with ${response.status}`);
  assertCondition(response.data?.status === expectedStatus, `${baseUrl}/ready status is not ${expectedStatus}`);
  return response.data;
}

async function verifyAdminTargetSearch(baseUrl, adminToken, fixtures) {
  const targets = {};
  for (const [key, entity] of Object.entries({
    user: fixtures.user,
    rider: fixtures.rider,
    merchant: fixtures.merchant,
  })) {
    const response = await requestJson(baseUrl, 'GET', '/api/messages/targets/search', {
      token: adminToken,
      params: {
        q: entity.phone,
        limit: 10,
      },
    });
    assertCondition(response.ok, `target search failed for ${key}`);
    const items = Array.isArray(response.data?.targets) ? response.data.targets : [];
    const matched = items.find((item) => Number(item?.legacyId || 0) === Number(entity.id));
    assertCondition(matched, `target search did not return ${key} legacyId=${entity.id}`);
    targets[key] = matched;
  }
  return targets;
}

async function verifySupportConversation({
  baseUrl,
  adminToken,
  actorToken,
  actorRole,
  actorEntity,
  adminSupportHarness,
  actorSupportHarness,
  label,
  timeoutMs,
}) {
  const chatId = actorRole === 'merchant'
    ? `merchant_${actorEntity.id}`
    : actorRole === 'rider'
      ? `rider_${actorEntity.id}`
      : String(actorEntity.id);
  const userMessage = `[${label}] ${actorRole} -> admin ${timestampLabel()}`;
  const adminMessage = `[${label}] admin -> ${actorRole} ${timestampLabel()}`;
  const actorTempId = `${label}-actor-${Date.now()}`;
  const adminTempId = `${label}-admin-${Date.now()}`;

  actorSupportHarness.socket.emit('join_chat', { chatId });
  adminSupportHarness.socket.emit('join_chat', { chatId });
  await sleep(DEFAULT_SHORT_WAIT_MS);

  const actorAckPromise = actorSupportHarness.waitFor(
    'message_sent',
    (payload) => payload?.tempId === actorTempId,
    timeoutMs
  );
  const adminReceivePromise = adminSupportHarness.waitFor(
    'new_message',
    (payload) => String(payload?.content || '').trim() === userMessage,
    timeoutMs
  );

  actorSupportHarness.socket.emit('send_message', {
    chatId,
    content: userMessage,
    tempId: actorTempId,
    targetType: 'admin',
  });

  const actorAck = await actorAckPromise;
  const adminReceived = await adminReceivePromise;
  assertCondition(String(actorAck.args[0]?.messageId || '').trim(), `${label} actor message ack missing id`);
  assertCondition(String(adminReceived.args[0]?.chatId || '') === chatId, `${label} admin received wrong chat`);

  const adminAckPromise = adminSupportHarness.waitFor(
    'message_sent',
    (payload) => payload?.tempId === adminTempId,
    timeoutMs
  );
  const actorReceivePromise = actorSupportHarness.waitFor(
    'new_message',
    (payload) => String(payload?.content || '').trim() === adminMessage,
    timeoutMs
  );

  adminSupportHarness.socket.emit('send_message', {
    chatId,
    content: adminMessage,
    tempId: adminTempId,
    targetId: String(actorEntity.id),
    targetType: actorRole,
  });

  const adminAck = await adminAckPromise;
  const actorReceived = await actorReceivePromise;
  assertCondition(String(adminAck.args[0]?.messageId || '').trim(), `${label} admin message ack missing id`);
  assertCondition(String(actorReceived.args[0]?.chatId || '') === chatId, `${label} actor received wrong chat`);

  const actorHistoryResponse = await requestJson(baseUrl, 'GET', `/api/messages/${encodeURIComponent(chatId)}`, {
    token: actorToken,
  });
  assertCondition(actorHistoryResponse.ok, `${label} actor history failed`);
  const actorHistory = pickListItems(actorHistoryResponse.data);
  assertCondition(actorHistory.length >= 2, `${label} actor history length < 2`);
  assertCondition(actorHistory.some((item) => String(item?.content || '').trim() === userMessage), `${label} actor history missing actor message`);
  assertCondition(actorHistory.some((item) => String(item?.content || '').trim() === adminMessage), `${label} actor history missing admin message`);

  const adminHistoryResponse = await requestJson(baseUrl, 'GET', `/api/messages/${encodeURIComponent(chatId)}`, {
    token: adminToken,
  });
  assertCondition(adminHistoryResponse.ok, `${label} admin history failed`);
  const adminHistory = pickListItems(adminHistoryResponse.data);
  assertCondition(adminHistory.length >= 2, `${label} admin history length < 2`);

  const actorConversationsResponse = await requestJson(baseUrl, 'GET', '/api/messages/conversations', {
    token: actorToken,
  });
  assertCondition(actorConversationsResponse.ok, `${label} actor conversations failed`);
  const actorConversations = pickListItems(actorConversationsResponse.data);
  const actorConversation = actorConversations.find((item) => String(item?.chatId || item?.id || '') === chatId);
  assertCondition(actorConversation, `${label} actor conversation snapshot missing`);

  const adminConversationsResponse = await requestJson(baseUrl, 'GET', '/api/messages/conversations', {
    token: adminToken,
  });
  assertCondition(adminConversationsResponse.ok, `${label} admin conversations failed`);
  const adminConversations = pickListItems(adminConversationsResponse.data);
  const adminConversation = adminConversations.find((item) => String(item?.chatId || item?.id || '') === chatId);
  assertCondition(adminConversation, `${label} admin conversation snapshot missing`);

  const markReadResponse = await requestJson(
    baseUrl,
    'POST',
    `/api/messages/conversations/${encodeURIComponent(chatId)}/read`,
    { token: actorToken }
  );
  assertCondition(markReadResponse.ok, `${label} actor mark read failed`);

  const actorConversationsAfterRead = await requestJson(baseUrl, 'GET', '/api/messages/conversations', {
    token: actorToken,
  });
  assertCondition(actorConversationsAfterRead.ok, `${label} actor conversations re-check failed`);
  const afterReadItem = pickListItems(actorConversationsAfterRead.data)
    .find((item) => String(item?.chatId || item?.id || '') === chatId);
  assertCondition(afterReadItem, `${label} actor conversation missing after read`);
  assertCondition(Number(afterReadItem?.unread || 0) === 0, `${label} actor unread not cleared`);

  return {
    chatId,
    actorHistoryCount: actorHistory.length,
    adminHistoryCount: adminHistory.length,
  };
}

async function verifyRiderRealtimeScenario({
  baseUrl,
  senderRole,
  senderToken,
  senderEntity,
  riderToken,
  riderEntity,
  senderHarness,
  riderHarness,
  label,
  timeoutMs,
}) {
  const senderToRiderMessage = `[${label}] ${senderRole} -> rider ${timestampLabel()}`;
  const riderToSenderMessage = `[${label}] rider -> ${senderRole} ${timestampLabel()}`;
  const chatId = generateRiderChatId(String(riderEntity.id), String(senderEntity.id), senderRole);
  const senderTempId = `${label}-to-rider-${Date.now()}`;
  const riderTempId = `${label}-from-rider-${Date.now()}`;

  riderHarness.socket.emit('join_rider');
  await sleep(DEFAULT_SHORT_WAIT_MS);

  const senderAckPromise = senderHarness.waitFor(
    'message_sent',
    (payload) => payload?.tempId === senderTempId,
    timeoutMs
  );
  const riderReceiveEvent = senderRole === 'merchant' ? 'merchant_message' : 'user_message';
  const riderReceivePromise = riderHarness.waitFor(
    riderReceiveEvent,
    (payload) => String(payload?.content || '').trim() === senderToRiderMessage,
    timeoutMs
  );

  senderHarness.socket.emit(
    senderRole === 'merchant' ? 'send_to_rider' : 'user_send_to_rider',
    {
      riderId: String(riderEntity.id),
      content: senderToRiderMessage,
      tempId: senderTempId,
      riderName: riderEntity.name,
      riderPhone: riderEntity.phone,
    }
  );

  await senderAckPromise;
  await riderReceivePromise;

  const riderAckPromise = riderHarness.waitFor(
    'message_sent',
    (payload) => payload?.tempId === riderTempId,
    timeoutMs
  );
  const senderReceivePromise = senderHarness.waitFor(
    'rider_message',
    (payload) => String(payload?.content || '').trim() === riderToSenderMessage,
    timeoutMs
  );

  riderHarness.socket.emit('rider_send_message', {
    targetType: senderRole,
    targetId: String(senderEntity.id),
    content: riderToSenderMessage,
    tempId: riderTempId,
    targetName: senderEntity.name,
    targetPhone: senderEntity.phone,
  });

  await riderAckPromise;
  await senderReceivePromise;

  const senderHistoryResponse = await requestJson(baseUrl, 'GET', `/api/messages/${encodeURIComponent(chatId)}`, {
    token: senderToken,
  });
  assertCondition(senderHistoryResponse.ok, `${label} sender history failed`);
  const senderHistory = pickListItems(senderHistoryResponse.data);
  assertCondition(senderHistory.length >= 2, `${label} sender history length < 2`);

  const riderHistoryResponse = await requestJson(baseUrl, 'GET', `/api/messages/${encodeURIComponent(chatId)}`, {
    token: riderToken,
  });
  assertCondition(riderHistoryResponse.ok, `${label} rider history failed`);
  const riderHistory = pickListItems(riderHistoryResponse.data);
  assertCondition(riderHistory.length >= 2, `${label} rider history length < 2`);

  const senderConversationsResponse = await requestJson(baseUrl, 'GET', '/api/messages/conversations', {
    token: senderToken,
  });
  assertCondition(senderConversationsResponse.ok, `${label} sender conversations failed`);
  const senderConversation = pickListItems(senderConversationsResponse.data)
    .find((item) => String(item?.chatId || item?.id || '') === chatId);
  assertCondition(senderConversation, `${label} sender conversation snapshot missing`);

  const riderConversationsResponse = await requestJson(baseUrl, 'GET', '/api/messages/conversations', {
    token: riderToken,
  });
  assertCondition(riderConversationsResponse.ok, `${label} rider conversations failed`);
  const riderConversation = pickListItems(riderConversationsResponse.data)
    .find((item) => String(item?.chatId || item?.id || '') === chatId);
  assertCondition(riderConversation, `${label} rider conversation snapshot missing`);

  return {
    chatId,
    senderHistoryCount: senderHistory.length,
    riderHistoryCount: riderHistory.length,
  };
}

async function verifyRealtimeNotifications({
  baseUrl,
  adminToken,
  notifyHarnesses,
  timeoutMs,
  label,
}) {
  const notificationPayload = {
    title: `[联调] 即时通讯通知 ${label}`,
    content: JSON.stringify({
      blocks: [
        {
          type: 'p',
          text: `verify-im-e2e notification ${label}`,
        },
      ],
    }),
    source: 'verify-im-e2e',
    cover: '',
    is_published: true,
  };

  const receivePromises = Object.entries(notifyHarnesses).map(([role, harness]) =>
    harness.waitFor(
      'business_notification',
      (payload) => String(payload?.title || '').trim() === notificationPayload.title,
      timeoutMs
    ).then((entry) => ({ role, entry }))
  );

  const createResponse = await requestJson(baseUrl, 'POST', '/api/notifications/admin', {
    token: adminToken,
    body: notificationPayload,
  });
  assertCondition(createResponse.ok, `create notification failed with ${createResponse.status}`);
  const notificationId = String(
    createResponse.data?.id
      || createResponse.data?.data?.uid
      || createResponse.data?.data?.id
      || ''
  ).trim();
  assertCondition(notificationId, 'notification id missing after create');

  const received = await Promise.all(receivePromises);
  assertCondition(received.length === 4, 'not all notify clients received business_notification');

  const userListResponse = await requestJson(baseUrl, 'GET', '/api/notifications', {
    token: notifyHarnesses.user.businessToken,
    params: {
      page: 1,
      pageSize: 10,
    },
  });
  assertCondition(userListResponse.ok, 'user notification list failed');
  const listItems = resolveNotificationList(userListResponse.data);
  assertCondition(
    listItems.some((item) => String(item?.id || '').trim() === notificationId),
    'user notification list missing created notification'
  );

  const detailResponse = await requestJson(baseUrl, 'GET', `/api/notifications/${encodeURIComponent(notificationId)}`, {
    token: notifyHarnesses.user.businessToken,
  });
  assertCondition(detailResponse.ok, 'user notification detail failed');

  const markReadResponse = await requestJson(
    baseUrl,
    'POST',
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { token: notifyHarnesses.user.businessToken }
  );
  assertCondition(markReadResponse.ok, 'user notification mark read failed');

  const userListAfterRead = await requestJson(baseUrl, 'GET', '/api/notifications', {
    token: notifyHarnesses.user.businessToken,
    params: {
      page: 1,
      pageSize: 10,
    },
  });
  assertCondition(userListAfterRead.ok, 'user notification list after read failed');
  assertCondition(resolveNotificationUnreadCount(userListAfterRead.data) >= 0, 'user unread count missing after read');

  return {
    notificationId,
    receivedRoles: received.map((item) => item.role),
  };
}

async function verifyAdminRTC({
  baseUrl,
  adminToken,
  userToken,
  adminRtcHarness,
  userRtcHarness,
  adminEntity,
  userEntity,
  timeoutMs,
  label,
}) {
  const runtimeResponse = await requestJson(baseUrl, 'GET', '/api/public/runtime-settings');
  assertCondition(runtimeResponse.ok, 'public runtime settings failed');
  const runtime = normalizeDataPayload(runtimeResponse.data) || {};
  const iceServers = Array.isArray(runtime.rtc_ice_servers)
    ? runtime.rtc_ice_servers
    : Array.isArray(runtime.rtcIceServers)
      ? runtime.rtcIceServers
      : [];
  assertCondition(runtime.rtc_enabled !== false, 'rtc runtime is disabled');
  assertCondition(Number(runtime.rtc_timeout_seconds || runtime.rtcTimeoutSeconds || 0) >= 10, 'rtc timeout is invalid');
  assertCondition(iceServers.length >= 1, 'rtc ice server list is empty');

  const searchResponse = await requestJson(baseUrl, 'GET', '/api/messages/targets/search', {
    token: adminToken,
    params: {
      q: userEntity.phone,
      limit: 10,
    },
  });
  assertCondition(searchResponse.ok, 'rtc target search failed');
  const target = (Array.isArray(searchResponse.data?.targets) ? searchResponse.data.targets : [])
    .find((item) => Number(item?.legacyId || 0) === Number(userEntity.id));
  assertCondition(target, 'rtc admin target search did not resolve user');

  const createdPromise = adminRtcHarness.waitFor('rtc_call_created', null, timeoutMs);
  const invitePromise = userRtcHarness.waitFor(
    'rtc_invite',
    (payload) => String(payload?.fromId || '') === String(adminEntity.id),
    timeoutMs
  );

  adminRtcHarness.socket.emit('rtc_start_call', {
    calleeRole: 'user',
    calleeId: String(target.legacyId),
    calleePhone: userEntity.phone,
    conversationId: `support_${userEntity.id}`,
    orderId: `rtc-admin-user-${label}`,
    entryPoint: 'admin_chat_console',
    scene: 'admin_support',
    clientPlatform: 'web-admin',
    clientKind: 'admin-vue',
    metadata: {
      label,
      source: 'scripts/verify-im-e2e.mjs',
    },
  });

  const created = await createdPromise;
  const invite = await invitePromise;
  const callId = String(created.args[0]?.callId || invite.args[0]?.callId || '').trim();
  assertCondition(callId, 'rtc callId missing');
  assertCondition(created.args[0]?.calleeOnline === true, 'rtc callee is not online');

  const acceptedByAdminPromise = adminRtcHarness.waitFor(
    'rtc_status',
    (payload) => String(payload?.callId || '') === callId && String(payload?.status || '') === 'accepted',
    timeoutMs
  );
  const acceptedByUserPromise = userRtcHarness.waitFor(
    'rtc_status',
    (payload) => String(payload?.callId || '') === callId && String(payload?.status || '') === 'accepted',
    timeoutMs
  );

  userRtcHarness.socket.emit('rtc_accept_call', {
    callId,
    clientPlatform: 'uniapp',
    clientKind: 'user-vue',
  });

  await acceptedByAdminPromise;
  await acceptedByUserPromise;

  const offerPayload = { sdp: 'fake-offer-sdp', type: 'offer' };
  const answerPayload = { sdp: 'fake-answer-sdp', type: 'answer' };
  const iceCandidate = { candidate: 'candidate:1 1 udp 2130706431 127.0.0.1 9 typ host' };

  const userOfferPromise = userRtcHarness.waitFor(
    'rtc_signal',
    (payload) => String(payload?.callId || '') === callId && String(payload?.signalType || '') === 'offer',
    timeoutMs
  );
  adminRtcHarness.socket.emit('rtc_signal', {
    callId,
    signalType: 'offer',
    signal: offerPayload,
  });
  const userOffer = await userOfferPromise;
  assertCondition(userOffer.args[0]?.signal?.sdp === offerPayload.sdp, 'rtc offer payload mismatch');

  const adminAnswerPromise = adminRtcHarness.waitFor(
    'rtc_signal',
    (payload) => String(payload?.callId || '') === callId && String(payload?.signalType || '') === 'answer',
    timeoutMs
  );
  userRtcHarness.socket.emit('rtc_signal', {
    callId,
    signalType: 'answer',
    signal: answerPayload,
  });
  const adminAnswer = await adminAnswerPromise;
  assertCondition(adminAnswer.args[0]?.signal?.sdp === answerPayload.sdp, 'rtc answer payload mismatch');

  const userIcePromise = userRtcHarness.waitFor(
    'rtc_signal',
    (payload) => String(payload?.callId || '') === callId && String(payload?.signalType || '') === 'ice-candidate',
    timeoutMs
  );
  adminRtcHarness.socket.emit('rtc_signal', {
    callId,
    signalType: 'ice-candidate',
    signal: iceCandidate,
  });
  await userIcePromise;

  const endedByAdminPromise = adminRtcHarness.waitFor(
    'rtc_status',
    (payload) => String(payload?.callId || '') === callId && String(payload?.status || '') === 'ended',
    timeoutMs
  );
  const endedByUserPromise = userRtcHarness.waitFor(
    'rtc_status',
    (payload) => String(payload?.callId || '') === callId && String(payload?.status || '') === 'ended',
    timeoutMs
  );

  adminRtcHarness.socket.emit('rtc_end_call', {
    callId,
    durationSeconds: 18,
    clientPlatform: 'web-admin',
    clientKind: 'admin-vue',
  });

  await endedByAdminPromise;
  await endedByUserPromise;

  const adminDetailResponse = await requestJson(baseUrl, 'GET', `/api/rtc/calls/${encodeURIComponent(callId)}`, {
    token: adminToken,
  });
  assertCondition(adminDetailResponse.ok, 'admin rtc detail failed');
  const adminDetail = normalizeDataPayload(adminDetailResponse.data);
  assertCondition(String(adminDetail?.status || '') === 'ended', 'admin rtc detail status is not ended');
  assertCondition(String(adminDetail?.caller_id || adminDetail?.callerId || '') === String(adminEntity.id), 'admin rtc caller identity mismatch');
  assertCondition(String(adminDetail?.callee_id || adminDetail?.calleeId || '') === String(userEntity.id), 'admin rtc callee identity mismatch');

  const userDetailResponse = await requestJson(baseUrl, 'GET', `/api/rtc/calls/${encodeURIComponent(callId)}`, {
    token: userToken,
  });
  assertCondition(userDetailResponse.ok, 'user rtc detail failed');

  const adminHistoryResponse = await requestJson(baseUrl, 'GET', '/api/rtc/calls/history', {
    token: adminToken,
    params: {
      page: 1,
      limit: 20,
    },
  });
  assertCondition(adminHistoryResponse.ok, 'admin rtc history failed');
  const adminHistoryItems = pickListItems(adminHistoryResponse.data);
  assertCondition(adminHistoryItems.some((item) => resolveRecordId(item) === callId), 'admin rtc history missing call');

  const userHistoryResponse = await requestJson(baseUrl, 'GET', '/api/rtc/calls/history', {
    token: userToken,
    params: {
      page: 1,
      limit: 20,
    },
  });
  assertCondition(userHistoryResponse.ok, 'user rtc history failed');
  const userHistoryItems = pickListItems(userHistoryResponse.data);
  assertCondition(userHistoryItems.some((item) => resolveRecordId(item) === callId), 'user rtc history missing call');

  const adminAuditResponse = await requestJson(baseUrl, 'GET', '/api/admin/rtc-call-audits', {
    token: adminToken,
    params: {
      page: 1,
      limit: 20,
      keyword: callId,
    },
  });
  assertCondition(adminAuditResponse.ok, 'admin rtc audit list failed');
  const auditItems = pickListItems(adminAuditResponse.data);
  assertCondition(auditItems.some((item) => resolveRecordId(item) === callId), 'admin rtc audit list missing call');

  return {
    callId,
    runtime: {
      enabled: runtime.rtc_enabled !== false,
      timeoutSeconds: Number(runtime.rtc_timeout_seconds || runtime.rtcTimeoutSeconds || 0),
      iceServerCount: iceServers.length,
    },
  };
}

async function main() {
  const startedAt = new Date();
  const label = String(process.env.IM_E2E_LABEL || timestampLabel(startedAt)).trim();
  const timeoutMs = toPositiveInt(process.env.IM_E2E_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const bffBaseUrl = normalizeBaseUrl(process.env.BFF_BASE_URL, DEFAULT_BFF_BASE_URL);
  const goBaseUrl = normalizeBaseUrl(process.env.GO_API_URL, DEFAULT_GO_BASE_URL);
  const socketBaseUrl = normalizeBaseUrl(process.env.SOCKET_SERVER_URL, DEFAULT_SOCKET_BASE_URL);
  const dbPath = String(process.env.IM_E2E_DB_PATH || DEFAULT_DB_PATH).trim();
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  assertCondition(jwtSecret, 'JWT_SECRET is required for scripts/verify-im-e2e.mjs');
  const reportFile = String(
    process.env.IM_E2E_REPORT_FILE
      || path.join(REPO_ROOT, 'artifacts', `verify-im-e2e-${label}.json`)
  ).trim();

  const report = {
    startedAt: startedAt.toISOString(),
    completedAt: '',
    status: 'running',
    label,
    config: {
      timeoutMs,
      bffBaseUrl,
      goBaseUrl,
      socketBaseUrl,
      dbPath,
    },
    readiness: {},
    fixtures: null,
    steps: {},
    socketEvents: {},
    failure: '',
  };

  const harnesses = [];

  try {
    report.readiness.bff = await step(report, 'readiness.bff', () => verifyReadiness(bffBaseUrl));
    report.readiness.go = await step(report, 'readiness.go', () => verifyReadiness(goBaseUrl));
    report.readiness.socket = await step(report, 'readiness.socket', () => verifyReadiness(socketBaseUrl));

    const fixtures = await step(report, 'fixtures', async () => ensureFixtureEntities(dbPath));
    report.fixtures = fixtures;

    const tokens = await step(report, 'tokens', async () => {
      const adminToken = buildAdminAccessToken(fixtures.admin, jwtSecret);
      const userToken = buildUserAccessToken(fixtures.user, jwtSecret);
      const riderToken = buildUserAccessToken(fixtures.rider, jwtSecret);
      const merchantToken = buildUserAccessToken(fixtures.merchant, jwtSecret);

      return {
        adminToken,
        userToken,
        riderToken,
        merchantToken,
      };
    });

    const socketTokens = await step(report, 'socketTokens', async () => ({
      admin: await generateSocketToken(socketBaseUrl, tokens.adminToken, fixtures.admin.id, 'admin'),
      user: await generateSocketToken(socketBaseUrl, tokens.userToken, fixtures.user.id, 'user'),
      rider: await generateSocketToken(socketBaseUrl, tokens.riderToken, fixtures.rider.id, 'rider'),
      merchant: await generateSocketToken(socketBaseUrl, tokens.merchantToken, fixtures.merchant.id, 'merchant'),
    }));

    const supportSockets = await step(report, 'sockets.support', async () => {
      const adminSupport = await connectSocket({
        socketBaseUrl,
        namespace: '/support',
        socketToken: socketTokens.admin,
        label: 'admin-support',
        timeoutMs,
      });
      const userSupport = await connectSocket({
        socketBaseUrl,
        namespace: '/support',
        socketToken: socketTokens.user,
        label: 'user-support',
        timeoutMs,
      });
      const merchantSupport = await connectSocket({
        socketBaseUrl,
        namespace: '/support',
        socketToken: socketTokens.merchant,
        label: 'merchant-support',
        timeoutMs,
      });
      harnesses.push(adminSupport, userSupport, merchantSupport);
      return { adminSupport, userSupport, merchantSupport };
    });

    const riderSockets = await step(report, 'sockets.rider', async () => {
      const riderHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/rider',
        socketToken: socketTokens.rider,
        label: 'rider-namespace',
        timeoutMs,
      });
      const userHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/rider',
        socketToken: socketTokens.user,
        label: 'user-rider-namespace',
        timeoutMs,
      });
      const merchantHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/rider',
        socketToken: socketTokens.merchant,
        label: 'merchant-rider-namespace',
        timeoutMs,
      });
      harnesses.push(riderHarness, userHarness, merchantHarness);
      return { riderHarness, userHarness, merchantHarness };
    });

    const notifySockets = await step(report, 'sockets.notify', async () => {
      const adminHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/notify',
        socketToken: socketTokens.admin,
        label: 'admin-notify',
        timeoutMs,
      });
      const userHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/notify',
        socketToken: socketTokens.user,
        label: 'user-notify',
        timeoutMs,
      });
      const riderHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/notify',
        socketToken: socketTokens.rider,
        label: 'rider-notify',
        timeoutMs,
      });
      const merchantHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/notify',
        socketToken: socketTokens.merchant,
        label: 'merchant-notify',
        timeoutMs,
      });
      harnesses.push(adminHarness, userHarness, riderHarness, merchantHarness);

      await Promise.all([
        adminHarness.waitFor('notify_ready', null, timeoutMs),
        userHarness.waitFor('notify_ready', null, timeoutMs),
        riderHarness.waitFor('notify_ready', null, timeoutMs),
        merchantHarness.waitFor('notify_ready', null, timeoutMs),
      ]);

      userHarness.businessToken = tokens.userToken;
      return {
        admin: adminHarness,
        user: userHarness,
        rider: riderHarness,
        merchant: merchantHarness,
      };
    });

    const rtcSockets = await step(report, 'sockets.rtc', async () => {
      const adminHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/rtc',
        socketToken: socketTokens.admin,
        label: 'admin-rtc',
        timeoutMs,
      });
      const userHarness = await connectSocket({
        socketBaseUrl,
        namespace: '/rtc',
        socketToken: socketTokens.user,
        label: 'user-rtc',
        timeoutMs,
      });
      harnesses.push(adminHarness, userHarness);

      await Promise.all([
        adminHarness.waitFor('rtc_ready', null, timeoutMs),
        userHarness.waitFor('rtc_ready', null, timeoutMs),
      ]);

      return {
        adminHarness,
        userHarness,
      };
    });

    await step(report, 'messages.targetSearch', async () =>
      verifyAdminTargetSearch(bffBaseUrl, tokens.adminToken, fixtures)
    );

    await step(report, 'support.userAdmin', async () =>
      verifySupportConversation({
        baseUrl: bffBaseUrl,
        adminToken: tokens.adminToken,
        actorToken: tokens.userToken,
        actorRole: 'user',
        actorEntity: fixtures.user,
        adminSupportHarness: supportSockets.adminSupport,
        actorSupportHarness: supportSockets.userSupport,
        label: 'support-user-admin',
        timeoutMs,
      })
    );

    await step(report, 'support.merchantAdmin', async () =>
      verifySupportConversation({
        baseUrl: bffBaseUrl,
        adminToken: tokens.adminToken,
        actorToken: tokens.merchantToken,
        actorRole: 'merchant',
        actorEntity: fixtures.merchant,
        adminSupportHarness: supportSockets.adminSupport,
        actorSupportHarness: supportSockets.merchantSupport,
        label: 'support-merchant-admin',
        timeoutMs,
      })
    );

    await step(report, 'rider.merchantRider', async () =>
      verifyRiderRealtimeScenario({
        baseUrl: bffBaseUrl,
        senderRole: 'merchant',
        senderToken: tokens.merchantToken,
        senderEntity: fixtures.merchant,
        riderToken: tokens.riderToken,
        riderEntity: fixtures.rider,
        senderHarness: riderSockets.merchantHarness,
        riderHarness: riderSockets.riderHarness,
        label: 'merchant-rider',
        timeoutMs,
      })
    );

    await step(report, 'rider.userRider', async () =>
      verifyRiderRealtimeScenario({
        baseUrl: bffBaseUrl,
        senderRole: 'user',
        senderToken: tokens.userToken,
        senderEntity: fixtures.user,
        riderToken: tokens.riderToken,
        riderEntity: fixtures.rider,
        senderHarness: riderSockets.userHarness,
        riderHarness: riderSockets.riderHarness,
        label: 'user-rider',
        timeoutMs,
      })
    );

    await step(report, 'notify.platformBroadcast', async () =>
      verifyRealtimeNotifications({
        baseUrl: bffBaseUrl,
        adminToken: tokens.adminToken,
        notifyHarnesses: notifySockets,
        timeoutMs,
        label,
      })
    );

    await step(report, 'rtc.adminUser', async () =>
      verifyAdminRTC({
        baseUrl: bffBaseUrl,
        adminToken: tokens.adminToken,
        userToken: tokens.userToken,
        adminRtcHarness: rtcSockets.adminHarness,
        userRtcHarness: rtcSockets.userHarness,
        adminEntity: fixtures.admin,
        userEntity: fixtures.user,
        timeoutMs,
        label,
      })
    );

    report.socketEvents = {
      supportAdmin: supportSockets.adminSupport.events.length,
      supportUser: supportSockets.userSupport.events.length,
      supportMerchant: supportSockets.merchantSupport.events.length,
      rider: riderSockets.riderHarness.events.length,
      riderUser: riderSockets.userHarness.events.length,
      riderMerchant: riderSockets.merchantHarness.events.length,
      notifyAdmin: notifySockets.admin.events.length,
      notifyUser: notifySockets.user.events.length,
      notifyRider: notifySockets.rider.events.length,
      notifyMerchant: notifySockets.merchant.events.length,
      rtcAdmin: rtcSockets.adminHarness.events.length,
      rtcUser: rtcSockets.userHarness.events.length,
    };

    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = error?.message || String(error);
    console.error(`\n[verify-im-e2e] failed: ${report.failure}`);
    process.exitCode = 1;
  } finally {
    for (const harness of harnesses) {
      try {
        harness.disconnect();
      } catch (_error) {
        // ignore disconnect errors
      }
    }
    report.completedAt = new Date().toISOString();
    await writeReport(reportFile, report);
  }
}

await main();
