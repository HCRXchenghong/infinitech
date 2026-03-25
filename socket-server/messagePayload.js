export function normalizeMessageData(data = {}, socket, options = {}) {
  let content = data.content;
  let order = data.order;
  let coupon = data.coupon;

  if (data.messageType === 'order') {
    if (typeof data.content === 'object' && data.content) {
      order = data.content;
      content = JSON.stringify(data.content);
    } else if (!order && typeof data.content === 'string') {
      try {
        order = JSON.parse(data.content);
      } catch (_err) {
        // Ignore malformed order payloads and keep raw content.
      }
    }
  } else if (data.messageType === 'coupon') {
    if (typeof data.content === 'object' && data.content) {
      coupon = data.content;
      content = JSON.stringify(data.content);
    } else if (!coupon && typeof data.content === 'string') {
      try {
        coupon = JSON.parse(data.content);
      } catch (_err) {
        // Ignore malformed coupon payloads and keep raw content.
      }
    }
  }

  const allowIdentityOverride = Boolean(options.allowIdentityOverride);
  const senderId = socket
    ? (allowIdentityOverride && data.senderId ? String(data.senderId) : String(socket.userId || ''))
    : String(data.senderId || '');
  const senderRole = socket
    ? (allowIdentityOverride && data.senderRole ? String(data.senderRole) : String(socket.userRole || 'user'))
    : String(data.senderRole || 'user');

  return {
    sender: data.sender || '客服',
    senderId,
    senderRole,
    content: typeof content === 'object' ? JSON.stringify(content) : (content || ''),
    messageType: data.messageType || 'text',
    coupon,
    order,
    imageUrl: data.imageUrl,
    avatar: data.avatar || '',
    status: 'sent'
  };
}
