// SQLite 数据库管理
const DB_NAME = 'rider_messages.db';
const DB_PATH = '_doc/rider_messages.db';
const MESSAGE_RETENTION_PER_CHAT = 200;
const MESSAGE_RETENTION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

class Database {
  resolveMessageTimestamp(rawValue: any, fallback = Date.now()): number {
    const directValue = Number(rawValue)
    if (Number.isFinite(directValue) && directValue > 0) {
      return directValue
    }

    const text = String(rawValue || '').trim()
    if (!text) return fallback

    const parsedValue = Date.parse(text)
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
  }

  resolveMessageId(message: any, chatId: string | number, fallbackTimestamp: number): string {
    const rawId = message?.id || message?.uid || message?.tsid
    if (rawId !== undefined && rawId !== null && String(rawId).trim()) {
      return String(rawId)
    }
    const senderRole = String(message?.senderRole || 'unknown').trim() || 'unknown'
    const senderId = String(message?.senderId || 'unknown').trim() || 'unknown'
    const messageType = String(message?.messageType || message?.type || 'text').trim() || 'text'
    const contentSeed = String(message?.content || '')
      .trim()
      .slice(0, 24)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')
    return `${String(chatId || 'chat')}_${senderRole}_${senderId}_${messageType}_${fallbackTimestamp}_${contentSeed || 'empty'}`
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.sqlite.openDatabase({
        name: DB_NAME,
        path: DB_PATH,
        success: () => {
          this.initTables().then(resolve).catch(reject);
        },
        fail: (err: any) => {
          // 已打开时视为成功，避免重复 open 报错打断流程
          if (err && (err.code === -1402 || String(err.message || '').includes('Same Name Already Open'))) {
            this.initTables().then(resolve).catch(reject);
            return;
          }
          console.error('数据库打开失败:', err);
          reject(err);
        }
      });
    });
  }

  initTables(): Promise<void> {
    return this.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT,
        sender TEXT,
        senderId TEXT,
        senderRole TEXT,
        content TEXT,
        messageType TEXT,
        timestamp INTEGER,
        isSelf INTEGER DEFAULT 0,
        avatar TEXT,
        status TEXT
      )
    `).then(() => {
      return Promise.all([
        this.executeSql('ALTER TABLE messages ADD COLUMN avatar TEXT').catch(() => {}),
        this.executeSql('ALTER TABLE messages ADD COLUMN senderRole TEXT').catch(() => {}),
        this.executeSql('ALTER TABLE messages ADD COLUMN status TEXT').catch(() => {})
      ]).then(() => {});
    });
  }

  executeSql(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.sqlite.executeSql({
        name: DB_NAME,
        // @ts-ignore
        sql: sql,
        success: () => resolve(),
        fail: (err: any) => reject(err)
      });
    });
  }

  selectSql(sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.sqlite.selectSql({
        name: DB_NAME,
        // @ts-ignore
        sql: sql,
        success: (res: any) => resolve(res),
        fail: (err: any) => reject(err)
      });
    });
  }

  escapeSqlText(value: any): string {
    return String(value || '').replace(/'/g, "''")
  }

  pruneMessagesByChatId(chatId: string | number): Promise<void> {
    const chatIdText = this.escapeSqlText(chatId)
    const cutoff = Date.now() - MESSAGE_RETENTION_MAX_AGE
    return this.executeSql(
      `DELETE FROM messages WHERE chatId = '${chatIdText}' AND timestamp < ${cutoff}`
    ).then(() => {
      return this.executeSql(
        `DELETE FROM messages
         WHERE chatId = '${chatIdText}'
           AND id NOT IN (
             SELECT id FROM messages
             WHERE chatId = '${chatIdText}'
             ORDER BY timestamp DESC, rowid DESC
             LIMIT ${MESSAGE_RETENTION_PER_CHAT}
           )`
      )
    })
  }

  saveMessage(chatId: string | number, message: any, options: { skipPrune?: boolean } = {}) {
    const chatIdText = this.escapeSqlText(chatId)
    const avatar = this.escapeSqlText(message.avatar)
    const sender = this.escapeSqlText(message.sender)
    const senderId = this.escapeSqlText(message.senderId)
    const senderRole = this.escapeSqlText(message.senderRole)
    const content = this.escapeSqlText(message.content)
    const timestamp = this.resolveMessageTimestamp(message.timestamp ?? message.createdAt, Date.now())
    const messageId = this.escapeSqlText(this.resolveMessageId(message, chatId, timestamp))
    const messageType = this.escapeSqlText(message.messageType || 'text')
    const isSelf = Number(message.isSelf || 0)
    const status = this.escapeSqlText(message.status || '')
    // @ts-ignore
    plus.sqlite.executeSql({
      name: DB_NAME,
      // @ts-ignore
      sql: `INSERT OR REPLACE INTO messages (id, chatId, sender, senderId, senderRole, content, messageType, timestamp, isSelf, avatar, status) VALUES ('${messageId}', '${chatIdText}', '${sender}', '${senderId}', '${senderRole}', '${content}', '${messageType}', ${timestamp}, ${isSelf}, '${avatar}', '${status}')`,
      success: () => {
        if (options.skipPrune) return
        void this.pruneMessagesByChatId(chatId).catch((err) => {
          console.error('鏁版嵁搴撴秷鎭鍓け璐?', err)
        })
      },
      fail: (err: any) => console.error('❌ 保存失败:', err)
    });
  }

  updateMessage(chatId: string | number, messageId: string | number, updates: Record<string, any> = {}): Promise<void> {
    const chatIdText = this.escapeSqlText(chatId)
    const messageIdText = this.escapeSqlText(messageId)
    const assignments: string[] = []

    if (updates.id !== undefined && updates.id !== null && String(updates.id).trim()) {
      assignments.push(`id = '${this.escapeSqlText(updates.id)}'`)
    }
    if (updates.sender !== undefined) {
      assignments.push(`sender = '${this.escapeSqlText(updates.sender)}'`)
    }
    if (updates.senderId !== undefined) {
      assignments.push(`senderId = '${this.escapeSqlText(updates.senderId)}'`)
    }
    if (updates.senderRole !== undefined) {
      assignments.push(`senderRole = '${this.escapeSqlText(updates.senderRole)}'`)
    }
    if (updates.content !== undefined) {
      assignments.push(`content = '${this.escapeSqlText(updates.content)}'`)
    }
    if (updates.messageType !== undefined) {
      assignments.push(`messageType = '${this.escapeSqlText(updates.messageType)}'`)
    }
    if (updates.timestamp !== undefined) {
      assignments.push(`timestamp = ${this.resolveMessageTimestamp(updates.timestamp, Date.now())}`)
    }
    if (updates.isSelf !== undefined) {
      assignments.push(`isSelf = ${Number(updates.isSelf || 0)}`)
    }
    if (updates.avatar !== undefined) {
      assignments.push(`avatar = '${this.escapeSqlText(updates.avatar)}'`)
    }
    if (updates.status !== undefined) {
      assignments.push(`status = '${this.escapeSqlText(updates.status)}'`)
    }

    if (assignments.length === 0) {
      return Promise.resolve()
    }

    return this.executeSql(
      `UPDATE messages SET ${assignments.join(', ')} WHERE chatId = '${chatIdText}' AND id = '${messageIdText}'`
    )
  }

  getMessages(chatId: string | number): Promise<any[]> {
    const chatIdText = this.escapeSqlText(chatId)
    return this.pruneMessagesByChatId(chatId)
      .catch(() => {})
      .then(() => {
        // @ts-ignore
        return this.selectSql(`SELECT * FROM messages WHERE chatId = '${chatIdText}' ORDER BY timestamp ASC`);
      })
  }

  deleteMessagesByChatId(chatId: string | number): Promise<void> {
    const chatIdText = this.escapeSqlText(chatId)
    return this.executeSql(`DELETE FROM messages WHERE chatId = '${chatIdText}'`)
  }
}

export const db = new Database();
