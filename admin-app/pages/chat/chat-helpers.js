export function normalizeChatId(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function normalizeRole(role) {
  const text = String(role || '').trim().toLowerCase()
  if (text === 'rider' || text === 'merchant') return text
  return 'user'
}

export function roleLabel(role) {
  const normalized = normalizeRole(role)
  if (normalized === 'rider') return '骑手'
  if (normalized === 'merchant') return '商家'
  return '用户'
}

export function toMessagePreview(message = {}) {
  const type = String(message.messageType || message.type || 'text')
  if (type === 'image') return '[图片]'
  if (type === 'coupon') return '[优惠券]'
  if (type === 'order') return '[订单]'
  const text = String(message.content || message.text || '').trim()
  return text || '[暂无消息]'
}

export function formatTime(raw) {
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return '--:--'
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function normalizeChat(chat = {}) {
  const id = normalizeChatId(chat.id || chat.chat_id || chat.chatId || '')
  const message = String(chat.lastMessage || chat.msg || '').trim()
  return {
    id,
    name: String(chat.name || '客户'),
    phone: String(chat.phone || chat.sender_id || chat.senderId || ''),
    role: normalizeRole(chat.role),
    avatar: String(chat.avatar || ''),
    msg: message || '[暂无消息]',
    lastMessage: message || '[暂无消息]',
    time: String(chat.time || chat.lastTime || '--:--'),
    unread: Number(chat.unread || 0),
    updatedAt: Number(chat.updatedAt || Date.now())
  }
}

export function getRequestErrorMessage(err, fallback = '操作失败，请稍后重试') {
  const msg = String(err?.message || '').trim()
  return msg || fallback
}

export function looksLikeWebLoginQr(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return false
  if (value.startsWith('v1.')) return true
  if (value.includes('login=')) return true
  return false
}

export function normalizeSearchTarget(item = {}) {
  const role = normalizeRole(item.role || item.targetType || 'user')
  const uid = String(item.uid || '')
  const legacyID = String(item.legacyId || item.legacyID || '')
  const id = String(item.id || '')
  const phone = String(item.phone || '')
  const chatId = String(item.chatId || uid || phone || id || legacyID || '')
  const displayId = uid || id || legacyID || chatId
  return {
    key: `${role}:${chatId}`,
    role,
    id,
    uid,
    legacyID,
    phone,
    chatId,
    displayId,
    name: String(item.name || roleLabel(role)),
    avatar: String(item.avatar || '')
  }
}
