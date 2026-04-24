import { ackPushMessage } from "./api";
import { createConsumerUserPushEventBridgeStarter } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const startPushEventBridge = createConsumerUserPushEventBridgeStarter({
  ackPushMessage,
});
