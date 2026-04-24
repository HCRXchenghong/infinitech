import test from "node:test";
import assert from "node:assert/strict";

import { createRoleAppRootLifecycle } from "./role-app-shell.js";

function instantiateLifecycle(component) {
  const instance = {};

  for (const hookName of ["onLaunch", "onShow", "onHide"]) {
    if (typeof component[hookName] === "function") {
      instance[hookName] = component[hookName].bind(instance);
    }
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("role app shell authenticates public routes without redirecting", async () => {
  const calls = [];
  const lifecycle = createRoleAppRootLifecycle({
    logger: {
      error() {},
    },
    startPushEventBridge() {
      calls.push("startPushEventBridge");
    },
    bindNotificationSoundBridge() {
      calls.push("bindNotificationSoundBridge");
    },
    readSession() {
      return { isAuthenticated: true };
    },
    publicRoutes: ["pages/login/index"],
    loginRoute: "/pages/login/index",
    getCurrentPagesFn() {
      return [{ route: "pages/login/index" }];
    },
    syncAuthenticatedState() {
      calls.push("syncAuthenticatedState");
    },
    clearUnauthenticatedState() {
      calls.push("clearUnauthenticatedState");
    },
    uniApp: {
      reLaunch() {
        calls.push("reLaunch");
      },
    },
  });
  const app = instantiateLifecycle(lifecycle);

  await app.onLaunch();
  await app.onShow();

  assert.deepEqual(calls, [
    "startPushEventBridge",
    "bindNotificationSoundBridge",
    "syncAuthenticatedState",
    "bindNotificationSoundBridge",
    "syncAuthenticatedState",
  ]);
});

test("role app shell clears unauthenticated public routes without redirecting", async () => {
  const calls = [];
  const lifecycle = createRoleAppRootLifecycle({
    logger: {
      error() {},
    },
    readSession() {
      return { isAuthenticated: false };
    },
    publicRoutes: ["pages/login/index"],
    loginRoute: "/pages/login/index",
    getCurrentPagesFn() {
      return [{ route: "pages/login/index" }];
    },
    clearUnauthenticatedState() {
      calls.push("clear");
    },
    uniApp: {
      reLaunch() {
        calls.push("reLaunch");
      },
    },
  });
  const app = instantiateLifecycle(lifecycle);

  const result = await app.checkAuth();

  assert.equal(result, false);
  assert.deepEqual(calls, ["clear"]);
});

test("role app shell redirects unauthenticated private routes to login", async () => {
  const redirects = [];
  const lifecycle = createRoleAppRootLifecycle({
    logger: {
      error() {},
    },
    readSession() {
      return { isAuthenticated: false };
    },
    loginRoute: "/pages/login/index",
    getCurrentPagesFn() {
      return [{ route: "pages/orders/index" }];
    },
    clearUnauthenticatedState() {},
    uniApp: {
      reLaunch(payload) {
        redirects.push(payload);
      },
    },
  });
  const app = instantiateLifecycle(lifecycle);

  const result = await app.checkAuth();

  assert.equal(result, false);
  assert.deepEqual(redirects, [{ url: "/pages/login/index" }]);
});

test("role app shell tolerates authenticated sync failures and keeps lifecycle usable", async () => {
  const errors = [];
  const lifecycle = createRoleAppRootLifecycle({
    logger: {
      error(...args) {
        errors.push(args);
      },
    },
    readSession() {
      return { isAuthenticated: true };
    },
    getCurrentPagesFn() {
      return [{ route: "pages/home/index" }];
    },
    syncAuthenticatedState() {
      throw new Error("sync failed");
    },
  });
  const app = instantiateLifecycle(lifecycle);

  const result = await app.checkAuth();

  assert.equal(result, true);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0][0]), /\[RoleApp\] sync authenticated runtime failed:/);
});
