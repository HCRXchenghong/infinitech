import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const db = new Database(join(__dirname, 'chat.db'));
const UNIFIED_PREFIX = '250724';
const CHAT_BUCKET = '83';
const FALLBACK_CHAT_HISTORY_LIMIT = toPositiveInt(process.env.SOCKET_FALLBACK_CHAT_HISTORY_LIMIT, 500);
const FALLBACK_CHAT_RETENTION_MS = toPositiveInt(
  process.env.SOCKET_FALLBACK_CHAT_RETENTION_MS,
  30 * 24 * 60 * 60 * 1000
);
const startupMaintenanceStats = {
  expiredPruned: 0,
  overflowPruned: 0,
  lastMaintenanceAt: 0
};
const fallbackRuntimeStats = {
  conversationListFallbackCount: 0,
  messageHistoryFallbackCount: 0,
  historyRefreshWriteCount: 0,
  historyRefreshMessageCount: 0,
  lastConversationListFallbackAt: 0,
  lastMessageHistoryFallbackAt: 0,
  lastHistoryRefreshWriteAt: 0
};

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS id_sequences (
    bucket_code TEXT PRIMARY KEY,
    current_seq INTEGER NOT NULL DEFAULT 0,
    warn_threshold INTEGER NOT NULL DEFAULT 950000,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT,
    tsid TEXT,
    chat_type TEXT NOT NULL,
    chat_id INTEGER NOT NULL,
    chat_uid TEXT,
    sender TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_uid TEXT,
    sender_role TEXT NOT NULL,
    content TEXT,
    message_type TEXT NOT NULL,
    coupon_data TEXT,
    order_data TEXT,
    image_url TEXT,
    event_timestamp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_chat ON messages(chat_type, chat_id);
  CREATE INDEX IF NOT EXISTS idx_role ON messages(sender_role);
`);

// 兼容已有数据库，添加新列
try { db.exec('ALTER TABLE messages ADD COLUMN avatar TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN status TEXT DEFAULT "sent"'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN read_at DATETIME'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN uid TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN tsid TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN chat_uid TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN sender_uid TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE messages ADD COLUMN event_timestamp INTEGER'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_status ON messages(status)'); } catch(e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_uid ON messages(uid)'); } catch(e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_tsid ON messages(tsid)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_uid ON messages(chat_uid)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_sender_uid ON messages(sender_uid)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_event_ts ON messages(chat_type, chat_id, event_timestamp DESC, id DESC)'); } catch(e) {}

function nowShanghaiMinute() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60 * 1000);
  return [
    String(shanghai.getUTCFullYear()).slice(-2),
    String(shanghai.getUTCMonth() + 1).padStart(2, '0'),
    String(shanghai.getUTCDate()).padStart(2, '0'),
    String(shanghai.getUTCHours()).padStart(2, '0'),
    String(shanghai.getUTCMinutes()).padStart(2, '0')
  ].join('');
}

function nextSequence(bucketCode) {
  const selectStmt = db.prepare('SELECT current_seq FROM id_sequences WHERE bucket_code = ?');
  const row = selectStmt.get(bucketCode);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO id_sequences(bucket_code, current_seq, warn_threshold, updated_at) VALUES (?, 0, 950000, CURRENT_TIMESTAMP)').run(bucketCode);
  }

  const current = (selectStmt.get(bucketCode)?.current_seq || 0);
  let next = Number(current) + 1;
  if (!Number.isFinite(next) || next <= 0 || next > 999999) {
    next = 1;
  }
  db.prepare('UPDATE id_sequences SET current_seq = ?, updated_at = CURRENT_TIMESTAMP WHERE bucket_code = ?').run(next, bucketCode);
  return next;
}

function nextUnifiedIds(bucketCode = CHAT_BUCKET) {
  const seq = nextSequence(bucketCode);
  const seq6 = String(seq).padStart(6, '0');
  const minute = nowShanghaiMinute();
  return {
    uid: `${UNIFIED_PREFIX}${bucketCode}${seq6}`,
    tsid: `${UNIFIED_PREFIX}${bucketCode}${minute}${seq6}`
  };
}

function parseCreatedAtTimestamp(value) {
  const raw = String(value || '').trim();
  if (!raw) return Date.now();

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const timestamp = new Date(withTimezone).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function resolveEventTimestamp(value, fallback = Date.now()) {
  const directValue = Number(value);
  if (Number.isFinite(directValue) && directValue > 0) {
    return directValue;
  }
  const fallbackTimestamp = parseCreatedAtTimestamp(value);
  return Number.isFinite(fallbackTimestamp) ? fallbackTimestamp : fallback;
}

function normalizeCreatedAtForStorage(value, fallbackTimestamp = Date.now()) {
  const directValue = Number(value);
  if (Number.isFinite(directValue) && directValue > 0) {
    return new Date(directValue).toISOString();
  }

  const text = String(value || '').trim();
  if (text) {
    const parsed = Date.parse(text.replace(' ', 'T'));
    if (Number.isFinite(parsed) && parsed > 0) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date(fallbackTimestamp).toISOString();
}

function pruneExpiredMessages(retentionCutoff = Date.now() - FALLBACK_CHAT_RETENTION_MS) {
  return db.prepare(`
    DELETE FROM messages
    WHERE COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000) < ?
  `).run(retentionCutoff);
}

function pruneOverflowMessages(keepCount = FALLBACK_CHAT_HISTORY_LIMIT) {
  const limit = Number.isFinite(Number(keepCount)) && Number(keepCount) > 0
    ? Math.max(1, Math.floor(Number(keepCount)))
    : FALLBACK_CHAT_HISTORY_LIMIT;

  return db.prepare(`
    DELETE FROM messages
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY chat_type, chat_id
            ORDER BY COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000) DESC, id DESC
          ) AS row_num
        FROM messages
      ) ranked
      WHERE row_num > ?
    )
  `).run(limit);
}

function pruneMessages(chatType, chatId, keepCount = FALLBACK_CHAT_HISTORY_LIMIT) {
  const limit = Number.isFinite(Number(keepCount)) && Number(keepCount) > 0
    ? Math.max(1, Math.floor(Number(keepCount)))
    : FALLBACK_CHAT_HISTORY_LIMIT;
  const retentionCutoff = Date.now() - FALLBACK_CHAT_RETENTION_MS;

  db.prepare(`
    DELETE FROM messages
    WHERE chat_type = ? AND chat_id = ?
      AND COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000) < ?
  `).run(chatType, chatId, retentionCutoff);

  const stmt = db.prepare(`
    DELETE FROM messages
    WHERE chat_type = ? AND chat_id = ?
      AND id NOT IN (
        SELECT id
        FROM messages
        WHERE chat_type = ? AND chat_id = ?
        ORDER BY COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000) DESC, id DESC
        LIMIT ?
      )
  `);

  stmt.run(chatType, chatId, chatType, chatId, limit);
}

function bumpFallbackRuntimeStats(counterKey, timeKey, increment = 1) {
  fallbackRuntimeStats[counterKey] = Math.max(
    0,
    Number(fallbackRuntimeStats[counterKey] || 0) + Math.max(0, Number(increment) || 0)
  );
  fallbackRuntimeStats[timeKey] = Date.now();
}

const startupExpiredPruneResult = pruneExpiredMessages();
const startupOverflowPruneResult = pruneOverflowMessages();
startupMaintenanceStats.expiredPruned = Number(startupExpiredPruneResult?.changes || 0);
startupMaintenanceStats.overflowPruned = Number(startupOverflowPruneResult?.changes || 0);
startupMaintenanceStats.lastMaintenanceAt = Date.now();

export function saveMessage(chatType, chatId, messageData) {
  const ids = nextUnifiedIds(CHAT_BUCKET);
  const messageUid = String(messageData.uid || ids.uid);
  const messageTsid = String(messageData.tsid || ids.tsid);
  const chatUid = String(messageData.chatUid || messageData.chat_uid || chatId || '');
  const senderUid = String(messageData.senderUid || messageData.sender_uid || messageData.senderId || '');
  const eventTimestamp = resolveEventTimestamp(messageData.timestamp ?? messageData.createdAt, Date.now());

  const stmt = db.prepare(`
    INSERT INTO messages (uid, tsid, chat_type, chat_id, chat_uid, sender, sender_id, sender_uid, sender_role, content, message_type, coupon_data, order_data, image_url, avatar, status, event_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResult = stmt.run(
    messageUid,
    messageTsid,
    chatType,
    chatId,
    chatUid,
    messageData.sender || '',
    messageData.senderId || '',
    senderUid,
    messageData.senderRole || 'user',
    messageData.content || '',
    messageData.messageType || 'text',
    messageData.coupon ? JSON.stringify(messageData.coupon) : null,
    messageData.order ? JSON.stringify(messageData.order) : null,
    messageData.imageUrl || null,
    messageData.avatar || null,
    messageData.status || 'sent',
    eventTimestamp
  );

  const insertedRow = db.prepare('SELECT created_at, event_timestamp FROM messages WHERE id = ?').get(insertResult.lastInsertRowid);
  const createdAt = insertedRow?.created_at || '';
  const persistedEventTimestamp = resolveEventTimestamp(insertedRow?.event_timestamp, eventTimestamp);
  pruneMessages(chatType, chatId);

  return {
    ...insertResult,
    uid: messageUid,
    tsid: messageTsid,
    chatUid,
    senderUid,
    createdAt,
    timestamp: persistedEventTimestamp
  };
}

export function getMessages(chatType, chatId, limit = 100) {
  const stmt = db.prepare(`
    SELECT *,
      COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000) AS resolved_event_timestamp
    FROM messages
    WHERE chat_type = ? AND chat_id = ?
    ORDER BY resolved_event_timestamp DESC, id DESC
    LIMIT ?
  `);

  const rows = stmt.all(chatType, chatId, limit);

  return rows.reverse().map(row => {
    const createdAt = row.created_at || '';
    const timestamp = resolveEventTimestamp(row.event_timestamp ?? row.resolved_event_timestamp, parseCreatedAtTimestamp(createdAt));
    const officialIntervention = row.sender_role === 'admin' && String(row.content || '').startsWith('[官方介入]');
    return {
      id: row.uid || row.id,
      legacyId: row.id,
      uid: row.uid || '',
      tsid: row.tsid || '',
      chatId: row.chat_id,
      chatUid: row.chat_uid || '',
      sender: row.sender,
      senderId: row.sender_id,
      senderUid: row.sender_uid || '',
      senderRole: row.sender_role,
      content: row.content,
      timestamp,
      createdAt,
      time: new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      messageType: row.message_type,
      coupon: row.coupon_data ? JSON.parse(row.coupon_data) : null,
      order: row.order_data ? JSON.parse(row.order_data) : null,
      imageUrl: row.image_url,
      avatar: row.avatar || null,
      status: row.status || 'sent',
      readAt: row.read_at,
      officialIntervention,
      interventionLabel: officialIntervention ? '官方介入' : ''
    };
  });
}

export function markAsRead(messageId) {
  const stmt = db.prepare("UPDATE messages SET status = 'read', read_at = CURRENT_TIMESTAMP WHERE id = ? OR uid = ?");
  return stmt.run(messageId, String(messageId || ''));
}

export function markAllRead(chatType, chatId, readerId) {
  const stmt = db.prepare("UPDATE messages SET status = 'read', read_at = CURRENT_TIMESTAMP WHERE chat_type = ? AND chat_id = ? AND sender_id != ? AND status != 'read'");
  return stmt.run(chatType, chatId, readerId);
}

export function getUnreadCount(chatType, chatId, userId) {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM messages WHERE chat_type = ? AND chat_id = ? AND sender_id != ? AND status != 'read'");
  return stmt.get(chatType, chatId, userId).count;
}

export function clearMessages(chatType, chatId) {
  const stmt = db.prepare('DELETE FROM messages WHERE chat_type = ? AND chat_id = ?');
  return stmt.run(chatType, chatId);
}

export function replaceMessages(chatType, chatId, list = []) {
  const normalizedList = Array.isArray(list) ? list : [];
  const insertStmt = db.prepare(`
    INSERT INTO messages (uid, tsid, chat_type, chat_id, chat_uid, sender, sender_id, sender_uid, sender_role, content, message_type, coupon_data, order_data, image_url, avatar, status, event_timestamp, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((items) => {
    clearMessages(chatType, chatId);
    const seenIds = new Set();

    items.forEach((message) => {
      const ids = nextUnifiedIds(CHAT_BUCKET);
      const timestamp = resolveEventTimestamp(message?.timestamp ?? message?.createdAt, Date.now());
      const uid = String(message?.uid || message?.id || ids.uid);
      if (seenIds.has(uid)) {
        return;
      }
      seenIds.add(uid);

      const tsid = String(message?.tsid || ids.tsid);
      const senderId = String(message?.senderId || '');
      insertStmt.run(
        uid,
        tsid,
        chatType,
        chatId,
        String(message?.chatUid || message?.chat_id || message?.chatId || chatId || ''),
        message?.sender || '',
        senderId,
        String(message?.senderUid || senderId),
        message?.senderRole || 'user',
        message?.content || '',
        message?.messageType || 'text',
        message?.coupon ? JSON.stringify(message.coupon) : null,
        message?.order ? JSON.stringify(message.order) : null,
        message?.imageUrl || null,
        message?.avatar || null,
        message?.status || 'sent',
        timestamp,
        normalizeCreatedAtForStorage(message?.createdAt, timestamp),
        String(message?.readAt || '').trim() || null
      );
    });
    pruneMessages(chatType, chatId);
  });

  return transaction(normalizedList);
}

export function recordConversationListFallback() {
  bumpFallbackRuntimeStats('conversationListFallbackCount', 'lastConversationListFallbackAt');
}

export function recordMessageHistoryFallback() {
  bumpFallbackRuntimeStats('messageHistoryFallbackCount', 'lastMessageHistoryFallbackAt');
}

export function recordHistoryRefreshWrite(messageCount = 0) {
  bumpFallbackRuntimeStats('historyRefreshWriteCount', 'lastHistoryRefreshWriteAt');
  fallbackRuntimeStats.historyRefreshMessageCount = Math.max(
    0,
    Number(fallbackRuntimeStats.historyRefreshMessageCount || 0) + Math.max(0, Number(messageCount) || 0)
  );
}

export function getFallbackBufferStats() {
  const summary = db.prepare(`
    SELECT
      COUNT(*) AS message_count,
      COUNT(DISTINCT chat_type || ':' || chat_id) AS chat_count,
      MIN(COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000)) AS oldest_timestamp,
      MAX(COALESCE(event_timestamp, CAST(strftime('%s', created_at) AS INTEGER) * 1000)) AS newest_timestamp
    FROM messages
  `).get();

  return {
    messageCount: Number(summary?.message_count || 0),
    chatCount: Number(summary?.chat_count || 0),
    oldestTimestamp: Number(summary?.oldest_timestamp || 0),
    newestTimestamp: Number(summary?.newest_timestamp || 0),
    retentionDays: Math.round(FALLBACK_CHAT_RETENTION_MS / (24 * 60 * 60 * 1000)),
    perChatLimit: FALLBACK_CHAT_HISTORY_LIMIT,
    startupExpiredPruned: startupMaintenanceStats.expiredPruned,
    startupOverflowPruned: startupMaintenanceStats.overflowPruned,
    lastMaintenanceAt: startupMaintenanceStats.lastMaintenanceAt
  };
}

export function getFallbackRuntimeStats() {
  return {
    conversationListFallbackCount: Number(fallbackRuntimeStats.conversationListFallbackCount || 0),
    messageHistoryFallbackCount: Number(fallbackRuntimeStats.messageHistoryFallbackCount || 0),
    historyRefreshWriteCount: Number(fallbackRuntimeStats.historyRefreshWriteCount || 0),
    historyRefreshMessageCount: Number(fallbackRuntimeStats.historyRefreshMessageCount || 0),
    lastConversationListFallbackAt: Number(fallbackRuntimeStats.lastConversationListFallbackAt || 0),
    lastMessageHistoryFallbackAt: Number(fallbackRuntimeStats.lastMessageHistoryFallbackAt || 0),
    lastHistoryRefreshWriteAt: Number(fallbackRuntimeStats.lastHistoryRefreshWriteAt || 0)
  };
}

export function reconcileMessage(chatType, chatId, localMessageId, localLegacyId, message) {
  const normalizedLocalId = String(localMessageId || '').trim();
  const numericLegacyId = Number(localLegacyId);
  if (!normalizedLocalId && (!Number.isFinite(numericLegacyId) || numericLegacyId <= 0)) {
    return { changes: 0 };
  }

  const ids = nextUnifiedIds(CHAT_BUCKET);
  const timestamp = resolveEventTimestamp(message?.timestamp ?? message?.createdAt, Date.now());
  const stmt = db.prepare(`
    UPDATE messages
    SET uid = ?, tsid = ?, chat_uid = ?, sender = ?, sender_id = ?, sender_uid = ?, sender_role = ?, content = ?, message_type = ?, coupon_data = ?, order_data = ?, image_url = ?, avatar = ?, status = ?, event_timestamp = ?, created_at = ?, read_at = ?
    WHERE chat_type = ? AND chat_id = ? AND (uid = ? OR id = ?)
  `);

  return stmt.run(
    String(message?.uid || message?.id || ids.uid),
    String(message?.tsid || ids.tsid),
    String(message?.chatUid || message?.chat_id || message?.chatId || chatId || ''),
    message?.sender || '',
    String(message?.senderId || ''),
    String(message?.senderUid || message?.senderId || ''),
    message?.senderRole || 'user',
    message?.content || '',
    message?.messageType || 'text',
    message?.coupon ? JSON.stringify(message.coupon) : null,
    message?.order ? JSON.stringify(message.order) : null,
    message?.imageUrl || null,
    message?.avatar || null,
    message?.status || 'sent',
    timestamp,
    normalizeCreatedAtForStorage(message?.createdAt, timestamp),
    String(message?.readAt || '').trim() || null,
    chatType,
    chatId,
    normalizedLocalId,
    Number.isFinite(numericLegacyId) && numericLegacyId > 0 ? numericLegacyId : -1
  );
}

export { db };
export default db;
