import initSqlJs from 'sql.js';

let SQL = null;
let db = null;

async function initDB() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
  }

  const savedDb = localStorage.getItem('yuexiang_messages_db');
  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      chatId INTEGER NOT NULL,
      sender TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      content TEXT,
      messageType TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coupon TEXT,
      orderData TEXT,
      imageUrl TEXT,
      avatar TEXT
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_chatId ON messages(chatId)`);

  // 兼容已有数据库
  try { db.run('ALTER TABLE messages ADD COLUMN avatar TEXT'); } catch(e) {}

  return db;
}

function saveDB() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Array.from(data);
      localStorage.setItem('yuexiang_messages_db', JSON.stringify(buffer));
    } catch (err) {
      console.error('保存本地数据库失败:', err);
    }
  }
}

export default {
  async saveMessage(message) {
    const database = await initDB();
    database.run(
      `INSERT OR REPLACE INTO messages (id, chatId, sender, senderId, senderRole, content, messageType, timestamp, coupon, orderData, imageUrl, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id || Date.now(),
        message.chatId,
        message.sender || '',
        message.senderId || '',
        message.senderRole || 'user',
        message.content || '',
        message.messageType || 'text',
        Date.now(),
        message.coupon ? JSON.stringify(message.coupon) : null,
        message.order ? JSON.stringify(message.order) : null,
        message.imageUrl || null,
        message.avatar || null
      ]
    );
    saveDB();
  },

  async getMessages(chatId) {
    const database = await initDB();
    const result = database.exec(
      `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
      [chatId]
    );

    if (result.length === 0) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return {
        id: obj.id,
        chatId: obj.chatId,
        sender: obj.sender,
        senderId: obj.senderId,
        senderRole: obj.senderRole,
        content: obj.content,
        messageType: obj.messageType,
        coupon: obj.coupon ? JSON.parse(obj.coupon) : null,
        order: obj.orderData ? JSON.parse(obj.orderData) : null,
        imageUrl: obj.imageUrl,
        avatar: obj.avatar || null
      };
    });
  },

  async clearMessages(chatId) {
    const database = await initDB();
    database.run(`DELETE FROM messages WHERE chatId = ?`, [chatId]);
    saveDB();
  }
};
