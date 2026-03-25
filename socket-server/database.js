import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'chat.db'));
const UNIFIED_PREFIX = '250724';
const CHAT_BUCKET = '83';

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
try { db.exec('CREATE INDEX IF NOT EXISTS idx_status ON messages(status)'); } catch(e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_uid ON messages(uid)'); } catch(e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_tsid ON messages(tsid)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_uid ON messages(chat_uid)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_sender_uid ON messages(sender_uid)'); } catch(e) {}

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

export function saveMessage(chatType, chatId, messageData) {
  const ids = nextUnifiedIds(CHAT_BUCKET);
  const messageUid = String(messageData.uid || ids.uid);
  const messageTsid = String(messageData.tsid || ids.tsid);
  const chatUid = String(messageData.chatUid || messageData.chat_uid || chatId || '');
  const senderUid = String(messageData.senderUid || messageData.sender_uid || messageData.senderId || '');

  const stmt = db.prepare(`
    INSERT INTO messages (uid, tsid, chat_type, chat_id, chat_uid, sender, sender_id, sender_uid, sender_role, content, message_type, coupon_data, order_data, image_url, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
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
    messageData.status || 'sent'
  );
}

export function getMessages(chatType, chatId, limit = 100) {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE chat_type = ? AND chat_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(chatType, chatId, limit);

  return rows.reverse().map(row => {
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
      time: new Date(row.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
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

export { db };
export default db;
