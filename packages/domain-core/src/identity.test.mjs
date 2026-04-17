import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRuntimePrincipalIdentity,
  createAdminRuntimeIdentity,
  createSessionDescriptor,
  createSocketSessionIdentity,
  hasEnterpriseSessionShape,
  mergeRuntimePrincipalIdentity,
  normalizeRuntimeNumericId,
  resolveSocketSubjectId,
} from "./identity.js";

test("identity helpers normalize enterprise session claims", () => {
  const claims = {
    sub: "admin_uid_1",
    principal_type: "admin",
    principal_id: "admin_uid_1",
    role: "super_admin",
    session_id: "admin_session_1",
    scope: ["api", "role:super_admin"],
    token_kind: "access",
  };

  assert.deepEqual(createSessionDescriptor(claims), {
    subject: "admin_uid_1",
    principalType: "admin",
    principalId: "admin_uid_1",
    role: "super_admin",
    sessionId: "admin_session_1",
    tokenKind: "access",
    scope: ["api", "role:super_admin"],
  });
  assert.equal(hasEnterpriseSessionShape(claims), true);
  assert.equal(hasEnterpriseSessionShape({ principal_type: "admin" }), false);
});

test("identity helpers build runtime identities from unified claims", () => {
  assert.deepEqual(
    buildRuntimePrincipalIdentity({
      principal_type: "merchant",
      principal_id: "merchant_uid_8",
      principal_legacy_id: 8,
      role: "merchant",
      session_id: "merchant_session_1",
      name: "商户A",
    }),
    {
      id: "merchant_uid_8",
      uid: "merchant_uid_8",
      numericId: "8",
      principalType: "merchant",
      role: "merchant",
      phone: "",
      name: "商户A",
      sessionId: "merchant_session_1",
    },
  );
  assert.equal(normalizeRuntimeNumericId(" 88 "), "88");
  assert.equal(normalizeRuntimeNumericId("merchant_uid"), "");
});

test("identity helpers merge stored admin user with token payload consistently", () => {
  const merged = createAdminRuntimeIdentity([
    {
      id: "admin_uid_1",
      uid: "admin_uid_1",
      numericId: "1",
      type: "super_admin",
      name: "平台超管",
    },
    {
      principal_type: "admin",
      principal_id: "admin_uid_1",
      principal_legacy_id: 1,
      role: "super_admin",
      phone: "13800138000",
      session_id: "admin_session_1",
    },
  ]);

  assert.deepEqual(merged, {
    id: "admin_uid_1",
    uid: "admin_uid_1",
    numericId: "1",
    principalType: "admin",
    role: "super_admin",
    phone: "13800138000",
    name: "平台超管",
    sessionId: "admin_session_1",
    type: "super_admin",
  });
});

test("identity helpers resolve socket identities with numeric preference", () => {
  const tokenIdentity = mergeRuntimePrincipalIdentity([
    {
      principal_type: "admin",
      principal_id: "admin_uid_2",
      principal_legacy_id: 2,
      role: "admin",
      session_id: "admin_session_2",
    },
  ]);

  assert.equal(
    resolveSocketSubjectId("", tokenIdentity, { preferNumericId: true }),
    "2",
  );
  assert.equal(
    resolveSocketSubjectId("claimed-18", tokenIdentity, {
      preferNumericId: true,
    }),
    "claimed-18",
  );
  assert.deepEqual(createSocketSessionIdentity(tokenIdentity), {
    userId: "2",
    role: "admin",
    cacheKey: "admin:2",
  });
});
