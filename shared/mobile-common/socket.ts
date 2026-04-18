import config from './config'
import createSocket from './socket-io'
import { createConfiguredSupportSocketBridge } from '../../packages/client-sdk/src/support-socket-bridge.js'

export default createConfiguredSupportSocketBridge({
  createSocket,
  config,
})
