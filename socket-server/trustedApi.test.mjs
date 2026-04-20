import test from "node:test";
import assert from "node:assert/strict";

import {
  isTrustedSocketApiRequest,
  resolveTrustedSocketApiSecret,
  validateTrustedSocketApiConfig,
  validateTrustedSocketStatsRequest,
  validateTrustedSocketTokenRequest,
} from "./trustedApi.js";

test("resolveTrustedSocketApiSecret only accepts SOCKET_SERVER_API_SECRET", () => {
  assert.deepEqual(
    resolveTrustedSocketApiSecret({
      SOCKET_SERVER_API_SECRET: "socket-secret",
      TOKEN_API_SECRET: "legacy-secret",
    }),
    {
      secret: "socket-secret",
      source: "SOCKET_SERVER_API_SECRET",
    },
  );

  assert.deepEqual(
    resolveTrustedSocketApiSecret({
      TOKEN_API_SECRET: "legacy-secret",
    }),
    {
      secret: "",
      source: "",
    },
  );
});

test("validateTrustedSocketApiConfig requires secret in production-like environments", () => {
  assert.throws(
    () =>
      validateTrustedSocketApiConfig({
        ENV: "production",
      }),
    /SOCKET_SERVER_API_SECRET is required for socket-server in production-like environments/,
  );

  assert.deepEqual(
    validateTrustedSocketApiConfig({
      NODE_ENV: "staging",
      SOCKET_SERVER_API_SECRET: "socket-secret",
    }),
    {
      env: "staging",
      productionLike: true,
      trustedSocketApiSecret: "socket-secret",
      trustedSocketApiSecretSource: "SOCKET_SERVER_API_SECRET",
    },
  );
});

test("isTrustedSocketApiRequest accepts only dedicated trusted headers", () => {
  const secret = "socket-secret";

  assert.equal(
    isTrustedSocketApiRequest(
      { headers: { "x-socket-server-secret": secret } },
      secret,
    ),
    true,
  );
  assert.equal(
    isTrustedSocketApiRequest(
      { headers: { authorization: `Bearer ${secret}` } },
      secret,
    ),
    true,
  );
  assert.equal(
    isTrustedSocketApiRequest(
      { headers: { "x-api-secret": "other-secret" } },
      secret,
    ),
    false,
  );
  assert.equal(
    isTrustedSocketApiRequest(
      { headers: { "x-token-api-secret": secret } },
      secret,
    ),
    false,
  );
});

test("validateTrustedSocketTokenRequest only allows site visitor trusted issuance", () => {
  assert.deepEqual(
    validateTrustedSocketTokenRequest({
      userId: "support-session-token",
      role: "site_visitor",
    }),
    {
      userId: "support-session-token",
      role: "site_visitor",
    },
  );

  assert.throws(
    () =>
      validateTrustedSocketTokenRequest({
        userId: "1",
        role: "admin",
      }),
    /trusted socket token role is not allowed: admin/,
  );
});

test("validateTrustedSocketStatsRequest requires a trusted service secret", () => {
  assert.deepEqual(
    validateTrustedSocketStatsRequest(
      {
        headers: {
          "x-socket-server-secret": "socket-secret",
        },
      },
      "socket-secret",
    ),
    {
      verifiedBy: "socket-service-secret",
    },
  );

  assert.throws(
    () =>
      validateTrustedSocketStatsRequest(
        {
          headers: {
            authorization: "Bearer wrong-secret",
          },
        },
        "socket-secret",
      ),
    /Socket server stats endpoint requires trusted service credentials/,
  );
});
