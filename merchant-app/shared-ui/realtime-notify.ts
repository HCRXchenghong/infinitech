import config from './config'
import createSocket from '../utils/socket-io'
import { MERCHANT_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
import { createDefaultRoleRealtimeNotifyBindings } from '../../packages/client-sdk/src/role-notify-shell.js'

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createDefaultRoleRealtimeNotifyBindings({
  config,
  ...MERCHANT_STORED_AUTH_RESOLVER_OPTIONS,
  loggerTag: 'MerchantRealtimeNotify',
  storageKey: 'merchant_realtime_notify_state',
  createSocket,
})
