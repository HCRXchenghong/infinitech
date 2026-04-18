import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { createRolePushRegistrationBindings } from '../../packages/client-sdk/src/role-notify-bridges.js'

declare const uni: any

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createRolePushRegistrationBindings({
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
  storageKey: 'rider_push_registration',
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
