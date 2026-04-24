import config from "./config";
import createSocket from "../utils/socket-io";
import { createConsumerAppRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createConsumerAppRealtimeNotifyBindings({
  config,
  createSocket,
});
