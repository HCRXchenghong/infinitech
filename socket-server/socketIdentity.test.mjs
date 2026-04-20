import test from "node:test";
import assert from "node:assert/strict";

function encodeBase64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const { validateSocketIdentity } = await import(`./socketIdentity.js?test=${Date.now()}`);

test("validateSocketIdentity accepts standardized auth verify envelopes", async () => {
  const originalFetch = globalThis.fetch;
  const tokenPayload = {
    sub: "25072402000011",
    principal_type: "user",
    principal_id: "25072402000011",
    principal_legacy_id: 18,
    role: "customer",
    session_id: "user_session_1",
    scope: ["api", "principal:user", "role:customer"],
    token_kind: "access",
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
  };
  const token = `${encodeBase64Url(tokenPayload)}.signature`;

  globalThis.fetch = async (url, init) => {
    assert.equal(url, "http://127.0.0.1:1029/api/auth/verify");
    assert.equal(init.method, "POST");
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          request_id: "req-socket-auth-1",
          code: "OK",
          message: "令牌校验成功",
          success: true,
          data: {
            valid: true,
            identity: {
              principalType: "user",
              principalId: "25072402000011",
              legacyId: "18",
              role: "customer",
              sessionId: "user_session_1",
              phone: "13800001001",
              scope: ["api", "principal:user", "role:customer"],
            },
          },
        });
      },
    };
  };

  try {
    const identity = await validateSocketIdentity({
      role: "user",
      claimedUserId: "",
      authHeader: `Bearer ${token}`,
      requestId: "req-socket-auth-1",
    });

    assert.equal(identity.role, "user");
    assert.equal(identity.socketUserId, "18");
    assert.equal(identity.verifiedBy, "/api/auth/verify");
    assert.equal(identity.payload.principal_id, "25072402000011");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
