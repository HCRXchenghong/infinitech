import config from './config'
import createSocket from '../utils/socket-io'
import { MERCHANT_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
import { createRoleRealtimeNotifyBindings } from '../../packages/client-sdk/src/role-notify-bridges.js'

declare const uni: any

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRoleRealtimeNotifyBindings({
  uniApp: uni,
  ...MERCHANT_STORED_AUTH_RESOLVER_OPTIONS,
  loggerTag: 'MerchantRealtimeNotify',
  storageKey: 'merchant_realtime_notify_state',
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
