// SQLite 数据库管理
const DB_NAME = 'rider_messages.db';
const DB_PATH = '_doc/rider_messages.db';
const MESSAGE_RETENTION_PER_CHAT = 200;
const MESSAGE_RETENTION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

class Database {
  toSqlLiteral(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL'
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : 'NULL'
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0'
    }
    return `'${String(value).replace(/'/g, "''")}'`
  }

  interpolateSql(sql: string, params: any[] = []): string {
    if (!Array.isArray(params) || params.length === 0) {
      return String(sql || '')
    }

    let paramIndex = 0
    return String(sql || '').replace(/\?/g, () => {
      if (paramIndex >= params.length) {
        return '?'
      }
      const nextValue = this.toSqlLiteral(params[paramIndex])
      paramIndex += 1
      return nextValue
    })
  }

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

  executeSql(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      const finalSql = this.interpolateSql(sql, params)
      // @ts-ignore
      plus.sqlite.executeSql({
        name: DB_NAME,
        // @ts-ignore
        sql: finalSql,
        success: () => resolve(),
        fail: (err: any) => reject(err)
      });
    });
  }

  selectSql(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const finalSql = this.interpolateSql(sql, params)
      // @ts-ignore
      plus.sqlite.selectSql({
        name: DB_NAME,
        // @ts-ignore
        sql: finalSql,
        success: (res: any) => resolve(res),
        fail: (err: any) => reject(err)
      });
    });
  }

  pruneMessagesByChatId(chatId: string | number): Promise<void> {
    const cutoff = Date.now() - MESSAGE_RETENTION_MAX_AGE
    return this.executeSql(
      'DELETE FROM messages WHERE chatId = ? AND timestamp < ?',
      [String(chatId || ''), cutoff]
    ).then(() => {
      return this.executeSql(
        `DELETE FROM messages
         WHERE chatId = ?
           AND id NOT IN (
             SELECT id FROM messages
             WHERE chatId = ?
             ORDER BY timestamp DESC, rowid DESC
             LIMIT ?
           )`,
        [String(chatId || ''), String(chatId || ''), MESSAGE_RETENTION_PER_CHAT]
      )
    })
  }

  saveMessage(chatId: string | number, message: any, options: { skipPrune?: boolean } = {}) {
    const timestamp = this.resolveMessageTimestamp(message.timestamp ?? message.createdAt, Date.now())
    const messageId = this.resolveMessageId(message, chatId, timestamp)
    const isSelf = Number(message.isSelf || 0)
    this.executeSql(
      `INSERT OR REPLACE INTO messages (
        id, chatId, sender, senderId, senderRole, content, messageType, timestamp, isSelf, avatar, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        String(chatId || ''),
        String(message.sender || ''),
        String(message.senderId || ''),
        String(message.senderRole || ''),
        String(message.content || ''),
        String(message.messageType || 'text'),
        timestamp,
        Number.isFinite(isSelf) ? isSelf : 0,
        String(message.avatar || ''),
        String(message.status || '')
      ]
    ).then(() => {
      if (options.skipPrune) return
      void this.pruneMessagesByChatId(chatId).catch((err) => {
        console.error('裁剪消息缓存失败:', err)
      })
    })
      .catch((err: any) => console.error('❌ 保存失败:', err))
  }

  updateMessage(chatId: string | number, messageId: string | number, updates: Record<string, any> = {}): Promise<void> {
    const assignments: string[] = []
    const params: any[] = []

    if (updates.id !== undefined && updates.id !== null && String(updates.id).trim()) {
      assignments.push('id = ?')
      params.push(String(updates.id))
    }
    if (updates.sender !== undefined) {
      assignments.push('sender = ?')
      params.push(String(updates.sender))
    }
    if (updates.senderId !== undefined) {
      assignments.push('senderId = ?')
      params.push(String(updates.senderId))
    }
    if (updates.senderRole !== undefined) {
      assignments.push('senderRole = ?')
      params.push(String(updates.senderRole))
    }
    if (updates.content !== undefined) {
      assignments.push('content = ?')
      params.push(String(updates.content))
    }
    if (updates.messageType !== undefined) {
      assignments.push('messageType = ?')
      params.push(String(updates.messageType))
    }
    if (updates.timestamp !== undefined) {
      assignments.push('timestamp = ?')
      params.push(this.resolveMessageTimestamp(updates.timestamp, Date.now()))
    }
    if (updates.isSelf !== undefined) {
      assignments.push('isSelf = ?')
      params.push(Number(updates.isSelf || 0))
    }
    if (updates.avatar !== undefined) {
      assignments.push('avatar = ?')
      params.push(String(updates.avatar))
    }
    if (updates.status !== undefined) {
      assignments.push('status = ?')
      params.push(String(updates.status))
    }

    if (assignments.length === 0) {
      return Promise.resolve()
    }

    params.push(String(chatId || ''))
    params.push(String(messageId || ''))
    return this.executeSql(
      `UPDATE messages SET ${assignments.join(', ')} WHERE chatId = ? AND id = ?`,
      params
    )
  }

  getMessages(chatId: string | number): Promise<any[]> {
    return this.pruneMessagesByChatId(chatId)
      .catch(() => {})
      .then(() => {
        return this.selectSql('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC', [String(chatId || '')])
      })
  }

  deleteMessagesByChatId(chatId: string | number): Promise<void> {
    return this.executeSql('DELETE FROM messages WHERE chatId = ?', [String(chatId || '')])
  }
}

export const db = new Database();
