import config from './config'
import createSocket from '../utils/socket-io'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

declare const uni: any

const resolveMerchantIdentity = createStoredAuthIdentityResolver({
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
})

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'MerchantRealtimeNotify',
  storageKey: 'merchant_realtime_notify_state',
  resolveAuthIdentity: resolveMerchantIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
