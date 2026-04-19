import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { RIDER_STORED_AUTH_RESOLVER_OPTIONS } from './auth-session.js'
import { createDefaultRolePushRegistrationBindings } from '../../packages/client-sdk/src/role-notify-shell.js'

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createDefaultRolePushRegistrationBindings({
  config,
  ...RIDER_STORED_AUTH_RESOLVER_OPTIONS,
  storageKey: 'rider_push_registration',
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
})
