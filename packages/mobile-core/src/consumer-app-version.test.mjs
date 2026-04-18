import test from "node:test";
import assert from "node:assert/strict";

import { getAppVersionLabel, readAppVersion } from "./consumer-app-version.js";

test("consumer app version prefers app base info before runtime fallbacks", () => {
  assert.equal(
    readAppVersion({
      uniApp: {
        getAppBaseInfo() {
          return { appVersion: "1.2.3" };
        },
      },
      plusRuntime: {
        runtime: { version: "9.9.9" },
      },
    }),
    "1.2.3",
  );
});

test("consumer app version falls back to plus runtime and system info", () => {
  assert.equal(
    readAppVersion({
      uniApp: {
        getSystemInfoSync() {
          return { version: "2.0.0" };
        },
      },
      plusRuntime: {
        runtime: { version: "1.9.0" },
      },
    }),
    "1.9.0",
  );
  assert.equal(
    getAppVersionLabel({
      uniApp: {
        getSystemInfoSync() {
          return { appVersion: "3.0.1" };
        },
      },
    }),
    "v3.0.1",
  );
  assert.equal(getAppVersionLabel({ uniApp: {} }), "未识别");
});
