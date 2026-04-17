import { ackPushMessage } from './api'
import {
  buildPushNotificationDetailRoute,
  createPushClickUrlResolver,
} from '../../packages/mobile-core/src/push-event-route.js'
import { startPushEventBridge as startBridge } from '../../packages/client-sdk/src/push-events.js'

const resolveClickUrl = createPushClickUrlResolver(['customer', 'user'], {
  buildFallbackUrl: buildPushNotificationDetailRoute,
})

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'AppMobilePushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
