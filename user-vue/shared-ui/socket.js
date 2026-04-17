import createSocket from '../utils/socket-io.js'
import config from './config'
import { createUniSupportSocketBridge } from '../../packages/client-sdk/src/support-socket.js'

export default createUniSupportSocketBridge({
  createSocket,
  socketUrl: config.SOCKET_URL,
  namespace: '/support',
})
