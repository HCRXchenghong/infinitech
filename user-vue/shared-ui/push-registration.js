import config from "./config";
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from "./api";
import { createConsumerUserPushRegistrationBindings } from "../../packages/mobile-core/src/consumer-notify-shell.js";

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createConsumerUserPushRegistrationBindings({
  config,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
});
