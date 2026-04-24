import config from "./config";
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from "./api";
import { createDefaultConsumerPushRegistrationBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createDefaultConsumerPushRegistrationBindings({
  config,
  storageKey: "user_vue_push_registration",
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
});
