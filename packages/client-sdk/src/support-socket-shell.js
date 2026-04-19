import { createConfiguredSupportSocketBridge } from "./support-socket-bridge.js";

export function createDefaultSupportSocketBridge(options = {}) {
  const createConfiguredSupportSocketBridgeImpl =
    options.createConfiguredSupportSocketBridgeImpl || createConfiguredSupportSocketBridge;
  const {
    createConfiguredSupportSocketBridgeImpl: _createConfiguredSupportSocketBridgeImpl,
    ...rest
  } = options;

  return createConfiguredSupportSocketBridgeImpl(rest);
}
