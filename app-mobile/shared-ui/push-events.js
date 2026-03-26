import { ackPushMessage } from './api'
import { startPushEventBridge as startBridge } from '../../shared/mobile-common/push-events'

function resolveClickUrl(envelope) {
  const route = envelope.route
  if (route) {
    return route
  }

  const notificationId = String(envelope.notificationId || '').trim()
  if (!notificationId) {
    return ''
  }

  let url = `/pages/message/notification-detail/index?id=${encodeURIComponent(notificationId)}`
  if (envelope.messageId) {
    url += `&messageId=${encodeURIComponent(envelope.messageId)}`
  }
  return url
}

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'AppMobilePushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
