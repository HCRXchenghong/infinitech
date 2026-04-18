import { createConsumerErrandRuntimeBindings } from "../../packages/mobile-core/src/consumer-errand-runtime.js";
import {
  isErrandServiceEnabled,
  loadPlatformRuntimeSettings,
} from "./platform-runtime.js";

export const { ensureErrandServiceOpen } = createConsumerErrandRuntimeBindings({
  uniApp: uni,
  clientScope: "user-vue",
  loadPlatformRuntimeSettings,
  isErrandServiceEnabled,
});
