import manifest from '../manifest.json'
import { createManifestBoundMobileConfig } from '../../packages/client-sdk/src/mobile-config-shell.js'

const { config, updateConfig, getConfig } = createManifestBoundMobileConfig({
  manifest,
})

export { updateConfig, getConfig }
export default config
