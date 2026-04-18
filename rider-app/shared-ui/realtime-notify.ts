import config from './config'
import createSocket from '../utils/socket-io'
import { createRoleRealtimeNotifyBindings } from '../../packages/client-sdk/src/role-notify-bridges.js'

declare const uni: any

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRoleRealtimeNotifyBindings({
  uniApp: uni,
  allowedAuthModes: ['rider'],
  tokenKeys: ['token', 'access_token'],
  profileKey: 'riderProfile',
  idSources: [
    'storage:riderId',
    'profile:id',
    'profile:userId',
    'profile:user_id',
  ],
  role: 'rider',
  userType: 'rider',
  loggerTag: 'RiderRealtimeNotify',
  storageKey: 'rider_realtime_notify_state',
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
