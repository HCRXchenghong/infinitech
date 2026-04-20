import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

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
  assert.equal(payload.userId, "18");
  assert.equal(payload.token_kind, "socket_access");
  assert.equal(payload.type, "socket_access");
  assert.equal(typeof payload.session_id, "string");
  assert.equal(payload.sessionId, payload.session_id);
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

test("verifyToken accepts legacy jwt socket tokens during migration", () => {
  const legacyToken = jwt.sign(
    {
      userId: "support-session-token",
      role: "site_visitor",
      sessionId: "legacy-session-1",
      timestamp: Date.now(),
    },
    process.env.JWT_SECRET,
    { expiresIn: 60 },
  );

  const payload = verifyToken(legacyToken);
  assert.ok(payload);
  assert.equal(payload.userId, "support-session-token");
  assert.equal(payload.principal_type, "site_visitor");
  assert.equal(payload.principal_id, "support-session-token");
  assert.equal(payload.role, "site_visitor");
  assert.equal(payload.session_id, "legacy-session-1");
  assert.deepEqual(payload.scope, [
    "socket",
    "principal:site_visitor",
    "token:socket_access",
    "role:site_visitor",
  ]);
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
