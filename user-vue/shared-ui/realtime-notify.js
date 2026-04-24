import config from "./config";
import createSocket from "../utils/socket-io.js";
import { createConsumerUserRealtimeNotifyBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createConsumerUserRealtimeNotifyBindings({
  config,
  createSocket,
});
