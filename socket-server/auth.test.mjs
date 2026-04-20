import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "socket-auth-test-secret";
process.env.SOCKET_REDIS_ENABLED = "false";

const {
  authMiddleware,
  buildSocketTokenPayload,
  generateToken,
  signSocketTokenPayload,
  verifyToken,
  verifyUnifiedSocketToken,
} = await import(`./auth.js?test=${Date.now()}`);

test("generateToken issues standardized socket session claims", async () => {
  const token = await generateToken("18", "admin", { ttlMs: 60_000 });
  const payload = verifyToken(token);

  assert.ok(payload);
  assert.equal(payload.sub, "18");
  assert.equal(payload.principal_type, "admin");
  assert.equal(payload.principal_id, "18");
  assert.equal(payload.principal_legacy_id, 18);
  assert.equal(payload.role, "admin");
  assert.equal(payload.token_kind, "socket_access");
  assert.equal(typeof payload.session_id, "string");
  assert.equal("userId" in payload, false);
  assert.equal("sessionId" in payload, false);
  assert.equal("type" in payload, false);
  assert.equal("timestamp" in payload, false);
  assert.deepEqual(payload.scope, [
    "socket",
    "principal:admin",
    "token:socket_access",
    "role:admin",
  ]);
});

test("authMiddleware authenticates standardized socket tokens against stored session", async () => {
  const token = await generateToken("88", "rider", {
    ttlMs: 60_000,
    authToken: "Bearer rider-business-token",
    authPayload: { sub: "rider_uid_88", principal_type: "rider" },
    metadata: { issuer: "auth.test" },
  });
  const socket = {
    handshake: {
      auth: { token },
    },
  };

  await new Promise((resolve, reject) => {
    authMiddleware(socket, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(socket.userId, "88");
  assert.equal(socket.userRole, "rider");
  assert.equal(typeof socket.sessionId, "string");
  assert.equal(socket.authToken, "Bearer rider-business-token");
  assert.deepEqual(socket.authPayload, {
    sub: "rider_uid_88",
    principal_type: "rider",
  });
  assert.deepEqual(socket.socketAuthMetadata, {
    issuer: "auth.test",
  });
  assert.equal(socket.authenticated, true);
});

test("verifyToken rejects legacy jwt-shaped socket tokens after migration cutover", () => {
  const legacyHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url");
  const legacyPayload = Buffer.from(
    JSON.stringify({
      userId: "support-session-token",
      role: "site_visitor",
      sessionId: "legacy-session-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString("base64url");
  const legacySignature = Buffer.from("legacy-signature").toString("base64url");
  const legacyToken = `${legacyHeader}.${legacyPayload}.${legacySignature}`;

  assert.equal(verifyToken(legacyToken), null);
});

test("verifyUnifiedSocketToken rejects expired standardized tokens", () => {
  const payload = buildSocketTokenPayload(
    "merchant_9",
    "merchant",
    "expired-session-1",
    Date.now() + 30_000,
    { nowMs: Date.now() },
  );
  payload.exp = Math.floor(Date.now() / 1000) - 1;

  const token = signSocketTokenPayload(payload);
  assert.equal(verifyUnifiedSocketToken(token), null);
});
