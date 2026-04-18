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
  storageKey: 'merchant_push_registration',
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
