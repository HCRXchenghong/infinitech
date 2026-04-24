import config from "./config";
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from "./api";
import { createConsumerAppPushRegistrationBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createConsumerAppPushRegistrationBindings({
  config,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
});
