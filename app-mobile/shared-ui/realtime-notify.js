import config from './config'
import createSocket from '../utils/socket-io'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

const resolveUserIdentity = createStoredAuthIdentityResolver({
  uniApp: uni,
  allowedAuthModes: ['user'],
  allowEmptyAuthMode: true,
  tokenKeys: ['token'],
  profileKey: 'userProfile',
  idSources: [
    'profile:id',
    'profile:userId',
    'profile:user_id',
    'storage:userId',
    'storage:user_id',
    'profile:phone',
  ],
  role: 'user',
  userType: 'customer',
})

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'AppRealtimeNotify',
  storageKey: 'app_realtime_notify_state',
  resolveAuthIdentity: resolveUserIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
