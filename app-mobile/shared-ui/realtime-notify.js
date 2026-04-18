import config from "./config";
import createSocket from "../utils/socket-io";
import { createConsumerRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-bridges.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createConsumerRealtimeNotifyBindings({
  uniApp: uni,
  loggerTag: "AppRealtimeNotify",
  storageKey: "app_realtime_notify_state",
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
});
