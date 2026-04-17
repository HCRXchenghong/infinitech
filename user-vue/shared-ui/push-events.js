import { ackPushMessage } from './api'
import {
  buildPushNotificationDetailRoute,
  createPushClickUrlResolver,
} from '../../packages/mobile-core/src/push-event-route.js'
import { startPushEventBridge as startBridge } from '../../shared/mobile-common/push-events'

const resolveClickUrl = createPushClickUrlResolver(['customer', 'user'], {
  buildFallbackUrl: buildPushNotificationDetailRoute,
})

export function startPushEventBridge() {
  return startBridge({
    loggerTag: 'UserPushBridge',
    ackPushMessage,
    resolveClickUrl,
  })
}
