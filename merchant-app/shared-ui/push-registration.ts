import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createPushRegistrationManager } from '../../packages/client-sdk/src/push-registration.js'

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
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'merchant_push_registration',
  resolveAuthIdentity: resolveMerchantIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
