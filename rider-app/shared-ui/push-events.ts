import { ackPushMessage } from './api'
import { createPushClickUrlResolver } from '../../packages/mobile-core/src/push-event-route.js'
import { startPushEventBridge as startBridge } from '../../packages/client-sdk/src/push-events.js'

const resolveClickUrl = createPushClickUrlResolver('rider')

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'RiderPushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
