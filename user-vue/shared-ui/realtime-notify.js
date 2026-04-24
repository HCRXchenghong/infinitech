import config from "./config";
import createSocket from "../utils/socket-io.js";
import { createDefaultConsumerRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createDefaultConsumerRealtimeNotifyBindings({
  config,
  loggerTag: "UserRealtimeNotify",
  storageKey: "user_realtime_notify_state",
  createSocket,
});
