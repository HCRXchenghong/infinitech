import createSocket from './socket-io'
import config from './config'
import { createUniSupportSocketBridge } from '../../packages/client-sdk/src/support-socket.js'

const socketBridge = createUniSupportSocketBridge({
  createSocket,
  socketUrl: config.SOCKET_URL,
  namespace: '/support',
})

export default socketBridge
