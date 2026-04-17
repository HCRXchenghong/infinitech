import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { createStoredAuthIdentityResolver } from '../../packages/client-sdk/src/stored-auth-identity.js'
import { createPushRegistrationManager } from '../../packages/client-sdk/src/push-registration.js'

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
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'rider_push_registration',
  resolveAuthIdentity: resolveRiderIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
