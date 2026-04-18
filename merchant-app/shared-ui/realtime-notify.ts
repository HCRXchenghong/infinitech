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
  allowedAuthModes: ['merchant'],
  tokenKeys: ['token'],
  profileKey: 'merchantProfile',
  idSources: [
    'profile:id',
    'profile:role_id',
    'profile:userId',
    'profile:user_id',
    'storage:merchantId',
    'storage:merchant_id',
  ],
  role: 'merchant',
  userType: 'merchant',
  loggerTag: 'MerchantRealtimeNotify',
  storageKey: 'merchant_realtime_notify_state',
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
