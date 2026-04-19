import { ackPushMessage } from './api'
import { createPushClickUrlResolver } from '../../packages/mobile-core/src/push-event-route.js'
import { createDefaultRolePushEventBridgeStarter } from '../../packages/client-sdk/src/role-push-event-shell.js'

export const startPushEventBridge = createDefaultRolePushEventBridgeStarter({
  role: 'merchant',
  ackPushMessage,
  createPushClickUrlResolverImpl: createPushClickUrlResolver,
})
