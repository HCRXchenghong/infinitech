import { ackPushMessage } from './api'
import { startPushEventBridge as startBridge } from '../../shared/mobile-common/push-events'

function resolveClickUrl(envelope: any) {
  const routeByUserType = envelope?.payload?.routeByUserType || {}
  if (routeByUserType.rider) {
    return routeByUserType.rider
  }
  return envelope.route || ''
}

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'RiderPushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
