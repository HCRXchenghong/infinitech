import { ackPushMessage } from './api'
import { startPushEventBridge as startBridge } from '../../shared/mobile-common/push-events'

function resolveClickUrl(envelope: any) {
  return envelope.route || ''
}

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'RiderPushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
