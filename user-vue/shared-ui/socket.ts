import config from './config'
import createSocket from '../utils/socket-io'
import { createDefaultSupportSocketBridge } from '../../packages/client-sdk/src/support-socket-shell.js'

export default createDefaultSupportSocketBridge({
  createSocket,
  config,
})
