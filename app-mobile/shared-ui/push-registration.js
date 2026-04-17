import config from './config'
import { registerPushDevice, unregisterPushDevice, ackPushMessage as ackPushMessageApi } from './api'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createPushRegistrationManager } from '../../packages/client-sdk/src/push-registration.js'

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
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'app_mobile_push_registration',
  resolveAuthIdentity: resolveUserIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
