import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { MERCHANT_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
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
  ...MERCHANT_STORED_AUTH_RESOLVER_OPTIONS,
  storageKey: 'merchant_push_registration',
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
