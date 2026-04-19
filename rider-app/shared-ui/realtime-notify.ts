import config from './config'
import createSocket from '../utils/socket-io'
import { RIDER_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
import { createDefaultRoleRealtimeNotifyBindings } from '../../packages/client-sdk/src/role-notify-shell.js'

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createDefaultRoleRealtimeNotifyBindings({
  config,
  ...RIDER_STORED_AUTH_RESOLVER_OPTIONS,
  loggerTag: 'RiderRealtimeNotify',
  storageKey: 'rider_realtime_notify_state',
  createSocket,
})
