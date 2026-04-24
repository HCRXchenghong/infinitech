import { ackPushMessage } from "./api";
import { createDefaultConsumerPushEventBridgeStarter } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const startPushEventBridge = createDefaultConsumerPushEventBridgeStarter({
  loggerTag: "UserPushBridge",
  ackPushMessage,
});
