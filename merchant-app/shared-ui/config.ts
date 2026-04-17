import manifest from '../manifest.json'
import { setManifest } from '../../packages/client-sdk/src/mobile-config.js'
setManifest(manifest)
export { default, updateConfig, getConfig } from '../../packages/client-sdk/src/mobile-config.js'
