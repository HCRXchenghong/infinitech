import { ackPushMessage } from "./api";
import { createConsumerAppPushEventBridgeStarter } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const startPushEventBridge = createConsumerAppPushEventBridgeStarter({
  ackPushMessage,
});
