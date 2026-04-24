import Vue from 'vue'
import riderOrderStore, { loadRiderData } from './shared-ui/riderOrderStore'
import { heartbeatRiderStatus, fetchRiderOrders } from './shared-ui/api'
import { registerCurrentPushDevice, clearPushRegistrationState } from './shared-ui/push-registration'
import { startPushEventBridge } from './shared-ui/push-events'
import { connectCurrentRealtimeChannel, clearRealtimeState } from './shared-ui/realtime-notify'
import messageManager from './utils/message-manager'
import createSocket from './utils/socket-io'
import config from './shared-ui/config'
import { createRoleAppRootLifecycle } from '../packages/mobile-core/src/role-app-shell.js'
import { createRiderAppRuntime } from '../packages/mobile-core/src/rider-app-runtime.js'
import {
  clearCachedSocketToken as clearCachedSocketTokenCache,
  resolveSocketToken,
} from '../packages/client-sdk/src/realtime-token.js'
import { ensureRiderAuthSession, readRiderAuthIdentity } from './shared-ui/auth-session.js'
import MessagePopup from './components/message-popup.vue'
import DispatchPopup from './components/dispatch-popup.vue'
import notification from './utils/notification'

const SOCKET_TOKEN_KEY = 'socket_token'
const SOCKET_TOKEN_ACCOUNT_KEY = 'socket_token_account_key'

function clearCachedSocketToken() {
  clearCachedSocketTokenCache({
    uniApp: uni,
    tokenStorageKey: SOCKET_TOKEN_KEY,
    tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
  })
}

function readRiderSession() {
  return ensureRiderAuthSession({ uniApp: uni })
}

async function fetchRiderSocketAccessToken({
  riderId,
  authToken,
}: {
  riderId: string
  authToken: string
}) {
  let socketToken = ''
  socketToken = await resolveSocketToken({
    uniApp: uni,
    userId: String(riderId),
    role: 'rider',
    socketUrl: config.SOCKET_URL,
    authToken: String(authToken),
    tokenStorageKey: SOCKET_TOKEN_KEY,
    tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
    missingAuthorizationMessage: 'missing auth token for socket request',
    missingSocketUrlMessage: 'socket url is not configured',
    missingTokenMessage: 'failed to generate socket token'
  })
  return socketToken
}

const riderRootLifecycle = createRoleAppRootLifecycle({
  readSession: readRiderSession,
  startPushEventBridge,
  uniApp: uni,
  loggerTag: 'RiderApp',
  async syncAuthenticatedState() {
    await registerCurrentPushDevice()
  },
  clearUnauthenticatedState() {
    clearPushRegistrationState()
    clearRealtimeState()
  }
})

const riderAppRuntime = createRiderAppRuntime({
  uniApp: uni,
  logger: console,
  loggerTag: 'App',
  riderOrderStore,
  loadRiderData,
  heartbeatRiderStatus,
  fetchRiderOrders,
  clearPushRegistrationState,
  connectCurrentRealtimeChannel,
  messageManager,
  createSocket,
  socketUrl: config.SOCKET_URL,
  readSession: readRiderSession,
  readAuthIdentity() {
    return readRiderAuthIdentity({ uniApp: uni })
  },
  resolveSocketAccessToken: fetchRiderSocketAccessToken,
  clearCachedSocketToken,
  initializeNotification() {
    return notification.init()
  }
})

export default Vue.extend({
  components: {
    MessagePopup,
    DispatchPopup
  },
  data: riderAppRuntime.data,
  computed: riderAppRuntime.computed,
  watch: riderAppRuntime.watch,
  onLaunch() {
    void riderRootLifecycle.onLaunch.call(this)
    return riderAppRuntime.onLaunch.call(this)
  },
  async onShow() {
    await riderRootLifecycle.onShow.call(this)
    return riderAppRuntime.onShow.call(this)
  },
  onHide() {
    riderAppRuntime.onHide.call(this)
    return riderRootLifecycle.onHide.call(this)
  },
  methods: {
    ...riderRootLifecycle.methods,
    ...riderAppRuntime.methods
  }
})
