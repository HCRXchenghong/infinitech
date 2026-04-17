import test from "node:test";
import assert from "node:assert/strict";

import {
  createStoredAuthIdentityResolver,
  resolveStoredAuthIdentity,
} from "./stored-auth-identity.js";

function createUniApp(storage = {}) {
  return {
    getStorageSync(key) {
      return storage[key];
    },
  };
}

test("resolveStoredAuthIdentity allows consumer sessions without explicit auth mode", () => {
  const identity = resolveStoredAuthIdentity({
    uniApp: createUniApp({
      token: "Bearer token-value",
      userProfile: {
        user_id: "user-100",
      },
    }),
    allowedAuthModes: ["user"],
    allowEmptyAuthMode: true,
    tokenKeys: ["token"],
    profileKey: "userProfile",
    idSources: ["profile:id", "profile:userId", "profile:user_id", "storage:userId"],
    role: "user",
    userType: "customer",
  });

  assert.deepEqual(identity, {
    userId: "user-100",
    authToken: "Bearer token-value",
    role: "user",
    userType: "customer",
  });
});

test("resolveStoredAuthIdentity blocks mismatched auth modes", () => {
  const identity = resolveStoredAuthIdentity({
    uniApp: createUniApp({
      authMode: "user",
      token: "Bearer token-value",
      merchantProfile: {
        id: "merchant-1",
      },
    }),
    allowedAuthModes: ["merchant"],
    tokenKeys: ["token"],
    profileKey: "merchantProfile",
    idSources: ["profile:id"],
    role: "merchant",
    userType: "merchant",
  });

  assert.equal(identity, null);
});

test("createStoredAuthIdentityResolver supports rider token fallbacks and id source ordering", () => {
  const resolveIdentity = createStoredAuthIdentityResolver({
    uniApp: createUniApp({
      authMode: "rider",
      access_token: "Bearer rider-token",
      riderId: "rider-storage-id",
      riderProfile: {
        id: "rider-profile-id",
      },
    }),
    allowedAuthModes: ["rider"],
    tokenKeys: ["token", "access_token"],
    profileKey: "riderProfile",
    idSources: ["storage:riderId", "profile:id", "profile:userId"],
    role: "rider",
    userType: "rider",
  });

  assert.deepEqual(resolveIdentity(), {
    userId: "rider-storage-id",
    authToken: "Bearer rider-token",
    role: "rider",
    userType: "rider",
  });
});
