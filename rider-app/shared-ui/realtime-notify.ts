import config from './config'
import createSocket from '../utils/socket-io'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

declare const uni: any

const resolveRiderIdentity = createStoredAuthIdentityResolver({
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
})

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'RiderRealtimeNotify',
  storageKey: 'rider_realtime_notify_state',
  resolveAuthIdentity: resolveRiderIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
