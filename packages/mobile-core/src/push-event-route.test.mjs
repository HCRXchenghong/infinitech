import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPushNotificationDetailRoute,
  createPushClickUrlResolver,
} from "./push-event-route.js";

test("buildPushNotificationDetailRoute keeps notification detail urls stable", () => {
  assert.equal(
    buildPushNotificationDetailRoute({
      notificationId: "notice-1",
      messageId: "message-2",
    }),
    "/pages/message/notification-detail/index?id=notice-1&messageId=message-2",
  );
  assert.equal(
    buildPushNotificationDetailRoute({ notificationId: "" }),
    "",
  );
});

test("createPushClickUrlResolver prefers typed role routes over generic routes", () => {
  const resolveConsumerRoute = createPushClickUrlResolver(["customer", "user"], {
    buildFallbackUrl: buildPushNotificationDetailRoute,
  });
  const resolveMerchantRoute = createPushClickUrlResolver("merchant");

  assert.equal(
    resolveConsumerRoute({
      route: "/pages/default",
      payload: {
        routeByUserType: {
          customer: "/pages/customer-only",
        },
      },
    }),
    "/pages/customer-only",
  );
  assert.equal(
    resolveMerchantRoute({
      route: "/pages/default",
      payload: {
        routeByUserType: {
          merchant: "/pages/merchant-only",
        },
      },
    }),
    "/pages/merchant-only",
  );
});

test("createPushClickUrlResolver falls back to route and consumer notification detail pages", () => {
  const resolveConsumerRoute = createPushClickUrlResolver(["customer", "user"], {
    buildFallbackUrl: buildPushNotificationDetailRoute,
  });

  assert.equal(
    resolveConsumerRoute({
      route: "/pages/default",
    }),
    "/pages/default",
  );
  assert.equal(
    resolveConsumerRoute({
      notificationId: "notice-1",
      messageId: "message-2",
    }),
    "/pages/message/notification-detail/index?id=notice-1&messageId=message-2",
  );
});
