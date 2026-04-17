import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSocketTokenAccountKey,
  extractSocketTokenResult,
} from "./realtime-token.js";

test("buildSocketTokenAccountKey normalizes runtime values consistently", () => {
  assert.equal(buildSocketTokenAccountKey(" 1001 ", " Rider "), "rider:1001");
  assert.equal(buildSocketTokenAccountKey("", "user"), "");
});

test("extractSocketTokenResult prefers standardized envelope data", () => {
  assert.deepEqual(
    extractSocketTokenResult({
      request_id: "req-socket-1",
      code: "OK",
      message: "Socket token issued successfully",
      data: {
        token: "socket-token-1",
        userId: "u-1",
        role: "User",
      },
    }),
    {
      token: "socket-token-1",
      userId: "u-1",
      role: "user",
    },
  );
});

test("extractSocketTokenResult falls back to legacy root fields", () => {
  assert.deepEqual(
    extractSocketTokenResult({
      token: "socket-token-2",
      user_id: "merchant-9",
      role: "MERCHANT",
    }),
    {
      token: "socket-token-2",
      userId: "merchant-9",
      role: "merchant",
    },
  );
});
