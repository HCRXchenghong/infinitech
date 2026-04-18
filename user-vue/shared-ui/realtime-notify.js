import config from "./config";
import createSocket from "../utils/socket-io.js";
import { createConsumerRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-bridges.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createConsumerRealtimeNotifyBindings({
  uniApp: uni,
  loggerTag: "UserRealtimeNotify",
  storageKey: "user_realtime_notify_state",
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
});
