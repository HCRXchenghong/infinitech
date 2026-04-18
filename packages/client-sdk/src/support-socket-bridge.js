import { createUniSupportSocketBridge } from "./support-socket.js";

function trimValue(value) {
  return String(value || "").trim();
}

export function createConfiguredSupportSocketBridge(options = {}) {
  const createSocket =
    typeof options.createSocket === "function" ? options.createSocket : null;

  if (!createSocket) {
    throw new Error("createSocket is required");
  }

  const config =
    options.config && typeof options.config === "object" ? options.config : {};
  const namespace = trimValue(options.namespace || "/support") || "/support";
  const socketUrl = trimValue(options.socketUrl || config.SOCKET_URL);

  return createUniSupportSocketBridge({
    ...options,
    createSocket,
    socketUrl,
    namespace,
  });
}
