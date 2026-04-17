import config, { getConfig, updateConfig } from './config'
import { createMobileConfigHelper } from '../../packages/client-sdk/src/mobile-config-helper.js'

const configHelper = createMobileConfigHelper({
  config,
  getConfig,
  updateConfig,
  uniApp: uni,
  logger: console,
})

export const {
  checkServerConnection,
  autoDetectServer,
  updateConfigAndVerify,
  configWizard,
  getConfigInfo,
} = configHelper
