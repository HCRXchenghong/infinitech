import manifest from '../manifest.json'
import { setManifest } from '../../shared/mobile-common/config'
setManifest(manifest)
export { default, updateConfig, getConfig } from '../../shared/mobile-common/config'
