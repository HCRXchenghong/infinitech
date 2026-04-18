import config from './config'
import createSocket from '../utils/socket-io.js'
import { createConfiguredSupportSocketBridge } from '../../packages/client-sdk/src/support-socket-bridge.js'

export default createConfiguredSupportSocketBridge({
  createSocket,
  config,
})
