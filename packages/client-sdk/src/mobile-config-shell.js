import config, { getConfig, setManifest, updateConfig } from "./mobile-config.js";

export function createManifestBoundMobileConfig(options = {}) {
  const setManifestImpl = options.setManifestImpl || setManifest;
  const configValue = options.config || config;
  const updateConfigImpl = options.updateConfigImpl || updateConfig;
  const getConfigImpl = options.getConfigImpl || getConfig;

  setManifestImpl(options.manifest || null);

  return {
    config: configValue,
    updateConfig: updateConfigImpl,
    getConfig: getConfigImpl,
  };
}
