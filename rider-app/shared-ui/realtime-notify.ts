import config from './config'
import createSocket from '../utils/socket-io'
import { RIDER_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
import { createRoleRealtimeNotifyBindings } from '../../packages/client-sdk/src/role-notify-bridges.js'

declare const uni: any

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRoleRealtimeNotifyBindings({
  uniApp: uni,
  ...RIDER_STORED_AUTH_RESOLVER_OPTIONS,
  loggerTag: 'RiderRealtimeNotify',
  storageKey: 'rider_realtime_notify_state',
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
