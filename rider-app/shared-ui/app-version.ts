import { getAppVersionLabel as getSharedAppVersionLabel } from "../../packages/mobile-core/src/consumer-app-version.js";

export function getAppVersionLabel(): string {
  return getSharedAppVersionLabel();
}
