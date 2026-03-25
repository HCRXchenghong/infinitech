// SQLite 数据库管理
const DB_NAME = 'enjoy_life_admin.db';
const DB_PATH = '_doc/enjoy_life_admin.db';

// 表结构定义
const TABLES = {
  chats: `
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      lastMessage TEXT,
      lastTime TEXT,
      unread INTEGER DEFAULT 0,
      type TEXT,
      updatedAt INTEGER
    )
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      senderId TEXT,
      senderName TEXT,
      content TEXT,
      messageType TEXT,
      timestamp INTEGER,
      isSelf INTEGER DEFAULT 0,
      avatar TEXT,
      FOREIGN KEY (chatId) REFERENCES chats(id)
    )
  `
};

class Database {
  constructor() {
    this.db = null;
  }

  // 打开数据库
  open() {
    return new Promise((resolve, reject) => {
      // 如果已经打开，直接返回
      if (this.db) {
        resolve();
        return;
      }

      // #ifdef APP-PLUS
      this.db = plus.sqlite.openDatabase({
        name: DB_NAME,
        path: DB_PATH,
        success: () => {
          this.initTables().then(resolve).catch(reject);
        },
        fail: (err) => {
          console.error('数据库打开失败:', err);
          reject(err);
        }
      });
      // #endif

      // #ifndef APP-PLUS
      // 非 APP 环境使用 localStorage 模拟
      resolve();
      // #endif
    });
  }

  // 初始化表
  initTables() {
    const promises = Object.values(TABLES).map(sql => this.executeSql(sql));
    return Promise.all(promises).then(() => {
      return this.executeSql('ALTER TABLE messages ADD COLUMN avatar TEXT').catch(() => {});
    });
  }

  // 执行 SQL
  executeSql(sql, params = []) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      plus.sqlite.executeSql({
        name: DB_NAME,
        sql: sql,
        success: (res) => {
          resolve(res);
        },
        fail: (err) => {
          console.error('SQL执行失败:', sql, err);
          reject(err);
        }
      });
      // #endif

      // #ifndef APP-PLUS
      resolve([]);
      // #endif
    });
  }

  // 查询
  selectSql(sql, params = []) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      plus.sqlite.selectSql({
        name: DB_NAME,
        sql: sql,
        success: (res) => {
          resolve(res);
        },
        fail: (err) => {
          console.error('查询失败:', sql, err);
          reject(err);
        }
      });
      // #endif

      // #ifndef APP-PLUS
      resolve([]);
      // #endif
    });
  }

  // 保存聊天列表
  async saveChats(chats) {
    const now = Date.now();
    for (const chat of chats) {
      const sql = `
        INSERT OR REPLACE INTO chats (id, name, avatar, lastMessage, lastTime, unread, type, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.executeSql(sql, [
        chat.id,
        chat.name,
        chat.avatar,
        chat.lastMessage || chat.msg,
        chat.lastTime || chat.time,
        chat.unread || 0,
        chat.type,
        now
      ]);
    }
  }

  // 获取聊天列表
  async getChats() {
    const sql = 'SELECT * FROM chats ORDER BY updatedAt DESC';
    return await this.selectSql(sql);
  }

  // 保存消息
  async saveMessages(chatId, messages) {
    for (const msg of messages) {
      const id = String(msg.id || '').replace(/'/g, "''");
      const senderId = String(msg.senderId || '').replace(/'/g, "''");
      const senderName = String(msg.sender || msg.senderName || '').replace(/'/g, "''");
      const content = String(msg.content || msg.text || '').replace(/'/g, "''");
      const messageType = String(msg.messageType || msg.type || 'text');
      const timestamp = msg.timestamp || Date.now();
      const isSelf = msg.self || msg.isSelf ? 1 : 0;
      const avatar = String(msg.avatar || '').replace(/'/g, "''");
      const sql = `INSERT OR REPLACE INTO messages (id, chatId, senderId, senderName, content, messageType, timestamp, isSelf, avatar) VALUES ('${id}', '${chatId}', '${senderId}', '${senderName}', '${content}', '${messageType}', ${timestamp}, ${isSelf}, '${avatar}')`;
      await this.executeSql(sql);
    }
  }

  // 获取消息
  async getMessages(chatId) {
    const sql = 'SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC';
    return await this.selectSql(sql, [chatId]);
  }

  // 清空所有数据
  async clearAll() {
    await this.executeSql('DELETE FROM messages');
    await this.executeSql('DELETE FROM chats');
  }
}

export const db = new Database();
