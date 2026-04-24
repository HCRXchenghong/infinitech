import { createConsumerUserErrandRuntimeBindings } from "../../packages/mobile-core/src/consumer-errand-runtime-shell.js";
import {
  isErrandServiceEnabled,
  loadPlatformRuntimeSettings,
} from "./platform-runtime.js";

export const { ensureErrandServiceOpen } = createConsumerUserErrandRuntimeBindings({
  loadPlatformRuntimeSettings,
  isErrandServiceEnabled,
});
