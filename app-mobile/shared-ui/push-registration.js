import config from "./config";
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from "./api";
import { createConsumerPushRegistrationBindings } from "../../packages/mobile-core/src/consumer-notify-bridges.js";

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createConsumerPushRegistrationBindings({
  uniApp: uni,
  storageKey: "app_mobile_push_registration",
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? "dev" : "prod"),
});
