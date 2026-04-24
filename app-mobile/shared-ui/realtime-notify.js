import config from "./config";
import createSocket from "../utils/socket-io";
import { createDefaultConsumerRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createDefaultConsumerRealtimeNotifyBindings({
  config,
  loggerTag: "AppRealtimeNotify",
  storageKey: "app_realtime_notify_state",
  createSocket,
});
