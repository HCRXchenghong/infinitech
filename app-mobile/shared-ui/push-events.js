import { ackPushMessage } from "./api";
import { createConsumerPushEventBridge } from "../../packages/mobile-core/src/consumer-notify-bridges.js";

export const startPushEventBridge = createConsumerPushEventBridge({
  loggerTag: "AppMobilePushBridge",
  ackPushMessage,
});
