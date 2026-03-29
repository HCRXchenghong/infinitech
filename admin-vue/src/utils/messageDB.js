import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const DB_STORAGE_KEY = 'yuexiang_messages_db';
const MESSAGE_CACHE_MAX_ITEMS = 80;
const MESSAGE_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

let SQL = null;
let db = null;

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const text = String(value ?? '').trim();
  if (!text) return fallback;

  const parsed = Date.parse(text.replace(' ', 'T'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function createSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      sender TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      content TEXT,
      messageType TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coupon TEXT,
      orderData TEXT,
      imageUrl TEXT,
      avatar TEXT,
      status TEXT
    )
  `);
  database.run('CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chatId, timestamp)');
}

function tableExists(database, tableName) {
  const result = database.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return result.length > 0 && Array.isArray(result[0]?.values) && result[0].values.length > 0;
}

function getTableColumns(database, tableName) {
  if (!tableExists(database, tableName)) return [];
  const result = database.exec(`PRAGMA table_info(${tableName})`);
  if (!result.length) return [];

  const [table] = result;
  const nameIndex = table.columns.indexOf('name');
  const typeIndex = table.columns.indexOf('type');
  if (nameIndex < 0 || typeIndex < 0) return [];

  return table.values.map((row) => ({
    name: String(row[nameIndex] ?? '').trim(),
    type: String(row[typeIndex] ?? '').trim().toUpperCase()
  }));
}

function requiresMigration(columns) {
  if (!Array.isArray(columns) || !columns.length) return false;
  const columnMap = new Map(columns.map((column) => [column.name, column.type]));

  if (!columnMap.has('id') || !columnMap.get('id').includes('TEXT')) return true;
  if (!columnMap.has('chatId') || !columnMap.get('chatId').includes('TEXT')) return true;
  if (!columnMap.has('timestamp')) return true;
  if (!columnMap.has('status')) return true;
  return false;
}

function migrateMessagesTable(database, legacyColumns) {
  if (!Array.isArray(legacyColumns) || !legacyColumns.length) return;

  const columnNames = new Set(legacyColumns.map((column) => column.name));
  const selectField = (name, fallbackSql) => (columnNames.has(name) ? name : fallbackSql);

  database.run('BEGIN TRANSACTION');
  try {
    database.run('ALTER TABLE messages RENAME TO messages_legacy');
    createSchema(database);
    database.run(
      `
        INSERT OR REPLACE INTO messages (
          id, chatId, sender, senderId, senderRole, content, messageType, timestamp,
          coupon, orderData, imageUrl, avatar, status
        )
        SELECT
          CAST(${selectField('id', "''")} AS TEXT),
          CAST(${selectField('chatId', "''")} AS TEXT),
          COALESCE(${selectField('sender', "''")}, ''),
          COALESCE(${selectField('senderId', "''")}, ''),
          COALESCE(${selectField('senderRole', "'user'")}, 'user'),
          ${selectField('content', 'NULL')},
          COALESCE(${selectField('messageType', "'text'")}, 'text'),
          COALESCE(${selectField('timestamp', '0')}, 0),
          ${selectField('coupon', 'NULL')},
          ${selectField('orderData', 'NULL')},
          ${selectField('imageUrl', 'NULL')},
          ${selectField('avatar', 'NULL')},
          COALESCE(${selectField('status', "'sent'")}, 'sent')
        FROM messages_legacy
        WHERE TRIM(CAST(${selectField('chatId', "''")} AS TEXT)) <> ''
      `
    );
    database.run('DROP TABLE messages_legacy');
    database.run('COMMIT');
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
}

function pruneExpiredMessages(database) {
  const cutoff = Date.now() - MESSAGE_CACHE_MAX_AGE_MS;
  database.run('DELETE FROM messages WHERE timestamp < ?', [cutoff]);
}

function pruneChatMessages(database, chatId) {
  const normalizedChatId = normalizeText(chatId);
  if (!normalizedChatId) return;
  database.run(
    `
      DELETE FROM messages
      WHERE id IN (
        SELECT id
        FROM messages
        WHERE chatId = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT -1 OFFSET ?
      )
    `,
    [normalizedChatId, MESSAGE_CACHE_MAX_ITEMS]
  );
}

function saveDB() {
  if (!db) return;
  try {
    const data = db.export();
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(Array.from(data)));
  } catch (error) {
    console.error('Failed to persist local message database:', error);
  }
}

async function initDB() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl
    });
  }

  const savedDb = localStorage.getItem(DB_STORAGE_KEY);
  if (savedDb) {
    try {
      db = new SQL.Database(new Uint8Array(JSON.parse(savedDb)));
    } catch (_error) {
      localStorage.removeItem(DB_STORAGE_KEY);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  const columns = getTableColumns(db, 'messages');
  if (!columns.length) {
    createSchema(db);
  } else if (requiresMigration(columns)) {
    migrateMessagesTable(db, columns);
  } else {
    createSchema(db);
  }

  pruneExpiredMessages(db);
  saveDB();
  return db;
}

export default {
  async saveMessage(message) {
    const database = await initDB();
    const chatId = normalizeText(message.chatId);
    if (!chatId) return;

    const timestamp = normalizeTimestamp(message.timestamp);
    database.run(
      `
        INSERT OR REPLACE INTO messages (
          id, chatId, sender, senderId, senderRole, content, messageType, timestamp,
          coupon, orderData, imageUrl, avatar, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizeText(message.id, `local_${chatId}_${timestamp}`),
        chatId,
        normalizeText(message.sender),
        normalizeText(message.senderId),
        normalizeText(message.senderRole, 'user'),
        message.content ?? '',
        normalizeText(message.messageType, 'text'),
        timestamp,
        message.coupon ? JSON.stringify(message.coupon) : null,
        message.order ? JSON.stringify(message.order) : null,
        message.imageUrl || null,
        message.avatar || null,
        normalizeText(message.status, 'sent')
      ]
    );
    pruneChatMessages(database, chatId);
    pruneExpiredMessages(database);
    saveDB();
  },

  async getMessages(chatId) {
    const database = await initDB();
    const normalizedChatId = normalizeText(chatId);
    if (!normalizedChatId) return [];

    pruneChatMessages(database, normalizedChatId);
    pruneExpiredMessages(database);
    saveDB();

    const result = database.exec(
      `
        SELECT *
        FROM messages
        WHERE chatId = ?
          AND timestamp >= ?
        ORDER BY timestamp ASC, id ASC
      `,
      [normalizedChatId, Date.now() - MESSAGE_CACHE_MAX_AGE_MS]
    );

    if (!result.length) return [];

    const [table] = result;
    return table.values.map((row) => {
      const record = {};
      table.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return {
        id: normalizeText(record.id),
        chatId: normalizeText(record.chatId),
        sender: normalizeText(record.sender),
        senderId: normalizeText(record.senderId),
        senderRole: normalizeText(record.senderRole, 'user'),
        content: record.content ?? '',
        messageType: normalizeText(record.messageType, 'text'),
        timestamp: normalizeTimestamp(record.timestamp),
        coupon: safeJsonParse(record.coupon),
        order: safeJsonParse(record.orderData),
        imageUrl: record.imageUrl || null,
        avatar: record.avatar || null,
        status: normalizeText(record.status, 'sent')
      };
    });
  },

  async clearMessages(chatId) {
    const database = await initDB();
    const normalizedChatId = normalizeText(chatId);
    if (!normalizedChatId) return;
    database.run('DELETE FROM messages WHERE chatId = ?', [normalizedChatId]);
    saveDB();
  }
};
