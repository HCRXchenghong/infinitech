import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

function assertExists(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`missing required path: ${relativePath}`);
  }
}

function assertContains(relativePath, expectedText) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  if (!source.includes(expectedText)) {
    throw new Error(`expected "${expectedText}" in ${relativePath}`);
  }
}

function assertMatches(relativePath, pattern) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  if (!pattern.test(source)) {
    throw new Error(`expected ${pattern} in ${relativePath}`);
  }
}

function assertNotContains(relativePath, unexpectedText) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  if (source.includes(unexpectedText)) {
    throw new Error(`unexpected "${unexpectedText}" in ${relativePath}`);
  }
}

[
  "packages/contracts/src/index.js",
  "packages/contracts/src/http.cjs",
  "packages/contracts/src/http.test.mjs",
  "packages/contracts/src/identity.cjs",
  "packages/contracts/src/identity.test.mjs",
  "packages/contracts/src/upload.js",
  "packages/contracts/src/upload.test.mjs",
  "packages/client-sdk/src/index.js",
  "packages/client-sdk/src/local-db.js",
  "packages/client-sdk/src/local-db.d.ts",
  "packages/client-sdk/src/local-db.test.mjs",
  "packages/client-sdk/src/mobile-config.js",
  "packages/client-sdk/src/mobile-config.d.ts",
  "packages/client-sdk/src/mobile-config.test.mjs",
  "packages/client-sdk/src/mobile-config-helper.js",
  "packages/client-sdk/src/mobile-config-helper.d.ts",
  "packages/client-sdk/src/mobile-config-helper.test.mjs",
  "packages/client-sdk/src/mobile-capabilities.js",
  "packages/client-sdk/src/mobile-capabilities.test.mjs",
  "packages/client-sdk/src/mobile-utils.js",
  "packages/client-sdk/src/mobile-utils.d.ts",
  "packages/client-sdk/src/mobile-utils.test.mjs",
  "packages/client-sdk/src/notification-audio.js",
  "packages/client-sdk/src/notification-audio.d.ts",
  "packages/client-sdk/src/notification-audio.test.mjs",
  "packages/client-sdk/src/onboarding-invite.js",
  "packages/client-sdk/src/onboarding-invite.test.mjs",
  "packages/client-sdk/src/push-events.js",
  "packages/client-sdk/src/push-events.d.ts",
  "packages/client-sdk/src/push-events.test.mjs",
  "packages/client-sdk/src/push-registration.js",
  "packages/client-sdk/src/push-registration.d.ts",
  "packages/client-sdk/src/push-registration.test.mjs",
  "packages/client-sdk/src/realtime-notify.js",
  "packages/client-sdk/src/realtime-notify.d.ts",
  "packages/client-sdk/src/realtime-notify.test.mjs",
  "packages/client-sdk/src/realtime-token.js",
  "packages/client-sdk/src/realtime-token.test.mjs",
  "packages/client-sdk/src/rtc-contact.js",
  "packages/client-sdk/src/rtc-contact.d.ts",
  "packages/client-sdk/src/rtc-contact.test.mjs",
  "packages/client-sdk/src/rtc-media.js",
  "packages/client-sdk/src/rtc-media.d.ts",
  "packages/client-sdk/src/rtc-media.test.mjs",
  "packages/client-sdk/src/rtc-runtime.js",
  "packages/client-sdk/src/rtc-runtime.d.ts",
  "packages/client-sdk/src/rtc-runtime.test.mjs",
  "packages/client-sdk/src/socket-io.js",
  "packages/client-sdk/src/socket-io.d.ts",
  "packages/client-sdk/src/socket-io.test.mjs",
  "packages/client-sdk/src/stored-auth-identity.js",
  "packages/client-sdk/src/stored-auth-identity.test.mjs",
  "packages/client-sdk/src/support-socket.js",
  "packages/client-sdk/src/support-socket.d.ts",
  "packages/client-sdk/src/support-socket.test.mjs",
  "packages/client-sdk/src/uni-request.js",
  "packages/client-sdk/src/uni-request.test.mjs",
  "packages/domain-core/src/index.js",
  "packages/domain-core/src/errand-settings.js",
  "packages/domain-core/src/errand-settings.test.mjs",
  "packages/domain-core/src/identity.js",
  "packages/domain-core/src/identity.cjs",
  "packages/domain-core/src/identity.test.mjs",
  "packages/domain-core/src/notification-content.js",
  "packages/domain-core/src/notification-content.test.mjs",
  "packages/domain-core/src/onboarding-invite-content.js",
  "packages/domain-core/src/onboarding-invite-content.test.mjs",
  "packages/mobile-core/src/index.js",
  "packages/mobile-core/src/upload.test.mjs",
  "packages/mobile-core/src/medicine-home.js",
  "packages/mobile-core/src/medicine-home.test.mjs",
  "packages/mobile-core/src/medicine-order.js",
  "packages/mobile-core/src/medicine-order.test.mjs",
  "packages/mobile-core/src/mobile-client-context.js",
  "packages/mobile-core/src/mobile-client-context.test.mjs",
  "packages/mobile-core/src/vip-center.js",
  "packages/mobile-core/src/vip-center.test.mjs",
  "packages/mobile-core/src/charity-page.js",
  "packages/mobile-core/src/charity-page.test.mjs",
  "packages/mobile-core/src/dining-buddy.js",
  "packages/mobile-core/src/dining-buddy.test.mjs",
  "packages/mobile-core/src/auth-portal.js",
  "packages/mobile-core/src/auth-portal.test.mjs",
  "packages/mobile-core/src/client-payment.js",
  "packages/mobile-core/src/client-payment.test.mjs",
  "packages/mobile-core/src/consumer-auth-runtime.js",
  "packages/mobile-core/src/consumer-auth-runtime.test.mjs",
  "packages/mobile-core/src/location.js",
  "packages/mobile-core/src/location.d.ts",
  "packages/mobile-core/src/location.test.mjs",
  "packages/mobile-core/src/platform-runtime.js",
  "packages/mobile-core/src/platform-runtime.d.ts",
  "packages/mobile-core/src/platform-runtime.test.mjs",
  "packages/mobile-core/src/platform-schema.js",
  "packages/mobile-core/src/platform-schema.d.ts",
  "packages/mobile-core/src/platform-schema.test.mjs",
  "packages/mobile-core/src/portal-runtime.js",
  "packages/mobile-core/src/portal-runtime.d.ts",
  "packages/mobile-core/src/portal-runtime.test.mjs",
  "packages/mobile-core/src/rtc-call-page.js",
  "packages/mobile-core/src/rtc-call-page.test.mjs",
  "packages/mobile-core/src/wallet-overview-page.js",
  "packages/mobile-core/src/wallet-overview-page.test.mjs",
  "packages/mobile-core/src/wallet-bills-page.js",
  "packages/mobile-core/src/wallet-bills-page.test.mjs",
  "packages/mobile-core/src/wallet-recharge-page.js",
  "packages/mobile-core/src/wallet-recharge-page.test.mjs",
  "packages/mobile-core/src/wallet-withdraw-page.js",
  "packages/mobile-core/src/wallet-withdraw-page.test.mjs",
  "packages/mobile-core/src/push-event-route.js",
  "packages/mobile-core/src/push-event-route.test.mjs",
  "packages/mobile-core/src/support-runtime.js",
  "packages/mobile-core/src/support-runtime.d.ts",
  "packages/mobile-core/src/support-runtime.test.mjs",
  "packages/mobile-core/src/home-index.js",
  "packages/mobile-core/src/home-index.test.mjs",
  "packages/mobile-core/src/sync-service.js",
  "packages/mobile-core/src/sync-service.d.ts",
  "packages/mobile-core/src/sync-service.test.mjs",
  "packages/mobile-core/src/message-center.js",
  "packages/mobile-core/src/message-center.test.mjs",
  "packages/mobile-core/src/notification-detail.js",
  "packages/mobile-core/src/notification-detail.test.mjs",
  "packages/mobile-core/src/message-chat-page.js",
  "packages/mobile-core/src/message-chat-page.test.mjs",
  "packages/mobile-core/src/customer-service-chat-utils.js",
  "packages/mobile-core/src/customer-service-page.js",
  "packages/mobile-core/src/customer-service-page.test.mjs",
  "packages/mobile-core/src/order-after-sales.js",
  "packages/mobile-core/src/order-after-sales.test.mjs",
  "packages/mobile-core/src/order-after-sales-pages.js",
  "packages/mobile-core/src/order-confirm-page.js",
  "packages/mobile-core/src/order-confirm-page.test.mjs",
  "packages/mobile-core/src/order-contact.js",
  "packages/mobile-core/src/order-contact.test.mjs",
  "packages/mobile-core/src/order-coupon.js",
  "packages/mobile-core/src/order-coupon.test.mjs",
  "packages/mobile-core/src/order-coupon-page.js",
  "packages/mobile-core/src/order-detail-page.js",
  "packages/mobile-core/src/order-detail-page.test.mjs",
  "packages/mobile-core/src/order-list-page.js",
  "packages/mobile-core/src/order-list-page.test.mjs",
  "packages/mobile-core/src/order-payment-options.js",
  "packages/mobile-core/src/order-payment-options.test.mjs",
  "packages/mobile-core/src/order-support-pages.js",
  "packages/mobile-core/src/order-support-pages.test.mjs",
  "packages/mobile-core/src/phone-contact.js",
  "packages/mobile-core/src/phone-contact.test.mjs",
  "packages/mobile-core/src/profile-address.js",
  "packages/mobile-core/src/profile-address.test.mjs",
  "packages/mobile-core/src/profile-favorites.js",
  "packages/mobile-core/src/profile-favorites.test.mjs",
  "packages/mobile-core/src/profile-my-reviews.js",
  "packages/mobile-core/src/profile-my-reviews.test.mjs",
  "packages/mobile-core/src/profile-points-mall.js",
  "packages/mobile-core/src/profile-points-mall.test.mjs",
  "packages/mobile-core/src/profile-edit.js",
  "packages/mobile-core/src/profile-edit.test.mjs",
  "packages/mobile-core/src/profile-coupon-list.js",
  "packages/mobile-core/src/profile-coupon-list.test.mjs",
  "packages/mobile-core/src/profile-home.js",
  "packages/mobile-core/src/profile-home.test.mjs",
  "packages/mobile-core/src/profile-phone-change.js",
  "packages/mobile-core/src/profile-phone-change.test.mjs",
  "packages/mobile-core/src/profile-outreach.js",
  "packages/mobile-core/src/profile-outreach.test.mjs",
  "packages/mobile-core/src/profile-settings.js",
  "packages/mobile-core/src/profile-settings.test.mjs",
  "packages/mobile-core/src/search-page.js",
  "packages/mobile-core/src/search-page.test.mjs",
  "shared/mobile-common/home-index-page.js",
  "shared/mobile-common/auth-password-pages.js",
  "shared/mobile-common/dining-buddy-page.js",
  "shared/mobile-common/mobile-client-context.js",
  "shared/mobile-common/medicine-order-pages.js",
  "shared/mobile-common/search-page.js",
  "shared/mobile-common/message-center-pages.js",
  "shared/mobile-common/notification-detail-page.js",
  "shared/mobile-common/message-chat-page.js",
  "shared/mobile-common/customer-service-chat-utils.js",
  "shared/mobile-common/customer-service-page.js",
  "shared/mobile-common/order-after-sales-pages.js",
  "shared/mobile-common/order-confirm-page.js",
  "shared/mobile-common/order-coupon-page.js",
  "shared/mobile-common/order-detail-page.js",
  "shared/mobile-common/order-list-page.js",
  "shared/mobile-common/order-payment-options.js",
  "shared/mobile-common/order-support-pages.js",
  "shared/mobile-common/phone-contact.js",
  "shared/mobile-common/profile-address-pages.js",
  "shared/mobile-common/profile-favorites-page.js",
  "shared/mobile-common/profile-my-reviews-page.js",
  "shared/mobile-common/profile-points-mall-page.js",
  "shared/mobile-common/profile-vip-center-page-options.js",
  "shared/mobile-common/profile-edit-page.js",
  "shared/mobile-common/profile-coupon-list-page.js",
  "shared/mobile-common/profile-home-page.js",
  "shared/mobile-common/profile-phone-change-page.js",
  "shared/mobile-common/profile-outreach-pages.js",
  "shared/mobile-common/profile-settings-pages.js",
  "shared/mobile-common/wallet-overview-page.js",
  "shared/mobile-common/wallet-bills-page.js",
  "shared/mobile-common/wallet-recharge-page.js",
  "shared/mobile-common/wallet-withdraw-page.js",
  "packages/admin-core/src/index.js",
  "packages/admin-core/src/menu-groups.js",
  "packages/admin-core/src/temporary-credential.js",
  "packages/admin-core/src/paginated-resources.js",
  "packages/admin-core/src/paginated-resources.test.mjs",
  "packages/admin-core/src/payment-center-resources.js",
  "packages/admin-core/src/payment-center-resources.test.mjs",
  "packages/admin-core/src/service-health-resources.js",
  "packages/admin-core/src/service-health-resources.test.mjs",
  "packages/admin-core/src/official-site-resources.js",
  "packages/admin-core/src/official-site-resources.test.mjs",
  "packages/admin-core/src/financial-transaction-resources.js",
  "packages/admin-core/src/financial-transaction-resources.test.mjs",
  "packages/admin-core/src/notification-resources.js",
  "packages/admin-core/src/notification-resources.test.mjs",
  "packages/admin-core/src/content-settings-resources.js",
  "packages/admin-core/src/content-settings-resources.test.mjs",
  "packages/admin-core/src/operations-center-resources.js",
  "packages/admin-core/src/operations-center-resources.test.mjs",
  "packages/admin-core/src/dashboard-resources.js",
  "packages/admin-core/src/dashboard-resources.test.mjs",
  "packages/admin-core/src/api-management-resources.js",
  "packages/admin-core/src/api-management-resources.test.mjs",
  "packages/admin-core/src/system-settings-resources.js",
  "packages/admin-core/src/system-settings-resources.test.mjs",
  "packages/admin-core/src/order-resources.js",
  "packages/admin-core/src/order-resources.test.mjs",
  "packages/admin-core/src/user-management-resources.js",
  "packages/admin-core/src/user-management-resources.test.mjs",
  "packages/admin-core/src/shop-management-resources.js",
  "packages/admin-core/src/shop-management-resources.test.mjs",
  "packages/admin-core/src/merchant-profile-resources.js",
  "packages/admin-core/src/merchant-profile-resources.test.mjs",
  "packages/admin-core/src/home-entry-resources.js",
  "packages/admin-core/src/home-entry-resources.test.mjs",
  "packages/admin-core/src/communication-audit-resources.js",
  "packages/admin-core/src/communication-audit-resources.test.mjs",
  "packages/admin-core/src/home-campaign-resources.js",
  "packages/admin-core/src/home-campaign-resources.test.mjs",
  "packages/admin-core/src/admin-management-resources.js",
  "packages/admin-core/src/admin-management-resources.test.mjs",
  "packages/admin-core/src/dining-buddy-governance-resources.js",
  "packages/admin-core/src/dining-buddy-governance-resources.test.mjs",
  "packages/admin-core/src/chat-console-resources.js",
  "packages/admin-core/src/chat-console-resources.test.mjs",
  "packages/admin-core/src/data-management-resources.js",
  "packages/admin-core/src/data-management-resources.test.mjs",
  "packages/admin-core/src/coupon-resources.js",
  "packages/admin-core/src/coupon-resources.test.mjs",
  "packages/admin-core/src/api-documentation-resources.js",
  "packages/admin-core/src/api-documentation-resources.test.mjs",
  "backend/bank-payout-sidecar/runtime.js",
  "backend/bank-payout-sidecar/runtime.test.mjs",
  "backend/alipay-sidecar/runtime.js",
  "backend/alipay-sidecar/runtime.test.mjs",
  "backend/bff/test/controllers/uploadController.test.js",
  "backend/bff/test/middleware/requireRequestAuth.test.js",
  "backend/go/internal/handler/file_upload_handler_test.go",
  "packages/admin-core/src/DesktopShellApp.vue",
  "admin-vue/src/views/dataManagementRuntimeHelpers.js",
  "admin-win/src/App.vue",
  "admin-mac/src/App.vue",
].forEach(assertExists);

[
  [
    "app-mobile/pages/order/list/page-logic.js",
    "../../../../packages/mobile-core/src/order-list-page.js",
  ],
  [
    "app-mobile/pages/order/detail/page-logic.js",
    "../../../../packages/mobile-core/src/order-detail-page.js",
  ],
  [
    "app-mobile/pages/order/confirm/index.vue",
    "../../../../packages/mobile-core/src/order-confirm-page.js",
  ],
  [
    "app-mobile/pages/message/chat/page-logic.js",
    "../../../../packages/mobile-core/src/message-chat-page.js",
  ],
  [
    "app-mobile/pages/profile/customer-service/page-logic.js",
    "../../../../packages/mobile-core/src/customer-service-page.js",
  ],
  [
    "app-mobile/pages/order/refund/index.vue",
    "../../../../packages/mobile-core/src/order-after-sales-pages.js",
  ],
  [
    "app-mobile/pages/order/review/index.vue",
    "../../../../packages/mobile-core/src/order-after-sales-pages.js",
  ],
  [
    "app-mobile/pages/profile/wallet/index.vue",
    "../../../../packages/mobile-core/src/wallet-overview-page.js",
  ],
  [
    "app-mobile/pages/profile/wallet/bills/page-logic.js",
    "../../../../../packages/mobile-core/src/wallet-bills-page.js",
  ],
  [
    "app-mobile/pages/profile/wallet/recharge/index.vue",
    "../../../../../packages/mobile-core/src/wallet-recharge-page.js",
  ],
  [
    "app-mobile/pages/profile/wallet/withdraw/index.vue",
    "../../../../../packages/mobile-core/src/wallet-withdraw-page.js",
  ],
  [
    "user-vue/pages/order/list/page-logic.js",
    "../../../../packages/mobile-core/src/order-list-page.js",
  ],
  [
    "user-vue/pages/order/detail/page-logic.js",
    "../../../../packages/mobile-core/src/order-detail-page.js",
  ],
  [
    "user-vue/pages/order/confirm/index.vue",
    "../../../../packages/mobile-core/src/order-confirm-page.js",
  ],
  [
    "user-vue/pages/message/chat/page-logic.js",
    "../../../../packages/mobile-core/src/message-chat-page.js",
  ],
  [
    "user-vue/pages/profile/customer-service/page-logic.js",
    "../../../../packages/mobile-core/src/customer-service-page.js",
  ],
  [
    "user-vue/pages/order/refund/index.vue",
    "../../../../packages/mobile-core/src/order-after-sales-pages.js",
  ],
  [
    "user-vue/pages/order/review/index.vue",
    "../../../../packages/mobile-core/src/order-after-sales-pages.js",
  ],
  [
    "user-vue/pages/profile/wallet/index.vue",
    "../../../../packages/mobile-core/src/wallet-overview-page.js",
  ],
  [
    "user-vue/pages/profile/wallet/bills/page-logic.js",
    "../../../../../packages/mobile-core/src/wallet-bills-page.js",
  ],
  [
    "user-vue/pages/profile/wallet/recharge/index.vue",
    "../../../../../packages/mobile-core/src/wallet-recharge-page.js",
  ],
  [
    "user-vue/pages/profile/wallet/withdraw/index.vue",
    "../../../../../packages/mobile-core/src/wallet-withdraw-page.js",
  ],
  [
    "app-mobile/pages/auth/reset-password/index.vue",
    "../../../../packages/mobile-core/src/auth-portal.js",
  ],
  [
    "app-mobile/pages/auth/set-password/index.vue",
    "../../../../packages/mobile-core/src/auth-portal.js",
  ],
  [
    "app-mobile/pages/search/index/index.vue",
    "../../../../packages/mobile-core/src/search-page.js",
  ],
  [
    "app-mobile/pages/message/index/index.vue",
    "../../../../packages/mobile-core/src/message-center.js",
  ],
  [
    "app-mobile/pages/message/notification-list/index.vue",
    "../../../../packages/mobile-core/src/message-center.js",
  ],
  [
    "app-mobile/pages/message/notification-detail/index.vue",
    "../../../../packages/mobile-core/src/notification-detail.js",
  ],
  [
    "app-mobile/pages/dining-buddy/index.vue",
    "../../../packages/mobile-core/src/dining-buddy.js",
  ],
  [
    "app-mobile/pages/medicine/order.vue",
    "../../../packages/mobile-core/src/medicine-order.js",
  ],
  [
    "app-mobile/pages/medicine/tracking.vue",
    "../../../packages/mobile-core/src/medicine-order.js",
  ],
  [
    "app-mobile/pages/profile/cooperation/index.vue",
    "../../../../packages/mobile-core/src/profile-outreach.js",
  ],
  [
    "app-mobile/pages/profile/address-edit/index.vue",
    "../../../../packages/mobile-core/src/profile-address.js",
  ],
  [
    "app-mobile/pages/profile/address-list/index.vue",
    "../../../../packages/mobile-core/src/profile-address.js",
  ],
  [
    "app-mobile/pages/profile/favorites/index.vue",
    "../../../../packages/mobile-core/src/profile-favorites.js",
  ],
  [
    "app-mobile/pages/profile/my-reviews/index.vue",
    "../../../../packages/mobile-core/src/profile-my-reviews.js",
  ],
  [
    "app-mobile/pages/profile/points-mall/index.vue",
    "../../../../packages/mobile-core/src/profile-points-mall.js",
  ],
  [
    "app-mobile/pages/profile/coupon-list/index.vue",
    "../../../../packages/mobile-core/src/profile-coupon-list.js",
  ],
  [
    "app-mobile/pages/profile/phone-change/index.vue",
    "../../../../packages/mobile-core/src/profile-phone-change.js",
  ],
  [
    "app-mobile/pages/profile/invite-friends/index.vue",
    "../../../../packages/mobile-core/src/profile-outreach.js",
  ],
  [
    "user-vue/pages/auth/reset-password/index.vue",
    "../../../../packages/mobile-core/src/auth-portal.js",
  ],
  [
    "user-vue/pages/auth/set-password/index.vue",
    "../../../../packages/mobile-core/src/auth-portal.js",
  ],
  [
    "user-vue/pages/search/index/index.vue",
    "../../../../packages/mobile-core/src/search-page.js",
  ],
  [
    "user-vue/pages/message/index/index.vue",
    "../../../../packages/mobile-core/src/message-center.js",
  ],
  [
    "user-vue/pages/message/notification-list/index.vue",
    "../../../../packages/mobile-core/src/message-center.js",
  ],
  [
    "user-vue/pages/message/notification-detail/index.vue",
    "../../../../packages/mobile-core/src/notification-detail.js",
  ],
  [
    "user-vue/pages/dining-buddy/index.vue",
    "../../../packages/mobile-core/src/dining-buddy.js",
  ],
  [
    "user-vue/pages/medicine/order.vue",
    "../../../packages/mobile-core/src/medicine-order.js",
  ],
  [
    "user-vue/pages/medicine/tracking.vue",
    "../../../packages/mobile-core/src/medicine-order.js",
  ],
  [
    "user-vue/pages/profile/cooperation/index.vue",
    "../../../../packages/mobile-core/src/profile-outreach.js",
  ],
  [
    "user-vue/pages/profile/address-edit/index.vue",
    "../../../../packages/mobile-core/src/profile-address.js",
  ],
  [
    "user-vue/pages/profile/address-list/index.vue",
    "../../../../packages/mobile-core/src/profile-address.js",
  ],
  [
    "user-vue/pages/profile/favorites/index.vue",
    "../../../../packages/mobile-core/src/profile-favorites.js",
  ],
  [
    "user-vue/pages/profile/my-reviews/index.vue",
    "../../../../packages/mobile-core/src/profile-my-reviews.js",
  ],
  [
    "user-vue/pages/profile/points-mall/index.vue",
    "../../../../packages/mobile-core/src/profile-points-mall.js",
  ],
  [
    "user-vue/pages/profile/coupon-list/index.vue",
    "../../../../packages/mobile-core/src/profile-coupon-list.js",
  ],
  [
    "user-vue/pages/profile/phone-change/index.vue",
    "../../../../packages/mobile-core/src/profile-phone-change.js",
  ],
  [
    "user-vue/pages/profile/invite-friends/index.vue",
    "../../../../packages/mobile-core/src/profile-outreach.js",
  ],
].forEach(([relativePath, sharedImport]) => {
  assertContains(relativePath, sharedImport);
});

[
  ["merchant-app/pages/login/index.vue", "@/shared-ui/merchantAccountPages"],
  ["merchant-app/pages/index/index.vue", "@/shared-ui/merchantOrders"],
  ["merchant-app/pages/orders/list.vue", "@/shared-ui/merchantOrders"],
  ["merchant-app/pages/orders/detail.vue", "@/shared-ui/merchantOrders"],
  ["merchant-app/pages/store/index.vue", "@/shared-ui/merchantStoreHome"],
  ["merchant-app/pages/store/create.vue", "@/shared-ui/storeFormPage"],
  ["merchant-app/pages/store/settings.vue", "@/shared-ui/storeFormPage"],
  ["merchant-app/pages/store/wallet.vue", "@/shared-ui/merchantWallet"],
  ["merchant-app/pages/menu/list.vue", "@/shared-ui/merchantMenuPage"],
  ["merchant-app/pages/menu/add.vue", "@/shared-ui/productEditorPage"],
  ["merchant-app/pages/menu/edit.vue", "@/shared-ui/productEditorPage"],
  ["merchant-app/pages/messages/chat.vue", "@/shared-ui/merchantChatPage"],
  ["rider-app/pages/hall/index-logic.ts", "../../shared-ui/riderOrderStore"],
  ["rider-app/pages/tasks/index-logic.ts", "../../shared-ui/riderOrderStore"],
  ["rider-app/pages/profile/index-logic.ts", "../../shared-ui/riderOrderStore"],
  [
    "rider-app/pages/profile/wallet-bills/index-logic.ts",
    "../../../../packages/mobile-core/src/wallet-bills-page.js",
  ],
  [
    "rider-app/pages/profile/wallet-recharge/index.vue",
    "../../../../packages/mobile-core/src/wallet-recharge-page.js",
  ],
  [
    "rider-app/pages/profile/wallet-withdraw/index.vue",
    "../../../../packages/mobile-core/src/wallet-withdraw-page.js",
  ],
].forEach(([relativePath, sharedImport]) => {
  assertContains(relativePath, sharedImport);
});

assertMatches(
  "backend/bff/src/utils/requestMeta.js",
  /onboarding\\\/invites\\\/\[\^\/]\+\\\/upload/,
);
assertMatches(
  "backend/bff/src/utils/requestMeta.js",
  /official-site\\\/exposures\\\/assets/,
);
assertNotContains(
  "backend/bff/src/utils/requestMeta.js",
  '{ method: "POST", pattern: /^\\/api\\/upload$/ }',
);

assertContains(
  "admin-vue/src/utils/request.js",
  "/api/official-site/exposures/assets",
);
assertContains("admin-vue/src/router/index.js", "adminProtectedRoutes");
assertContains(
  "admin-vue/src/config/menuGroups.js",
  "@infinitech/admin-core/menu-groups",
);
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "createOnboardingInviteApi",
);
assertContains("admin-vue/src/views/Users.vue", "createOnboardingInviteApi");
assertContains(
  "admin-vue/src/views/Merchants.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "createOnboardingInviteApi",
);
assertContains("merchant-app/shared-ui/api.ts", "createMobilePushApi");
assertContains("merchant-app/shared-ui/api.ts", "extractSMSResult");
assertContains("rider-app/shared-ui/api.ts", "createMobilePushApi");
assertContains("rider-app/shared-ui/api.ts", "extractSMSResult");
assertContains("rider-app/shared-ui/api.ts", "createRiderPreferenceApi");
assertContains("user-vue/shared-ui/api.js", "createMobilePushApi");
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "../../../../packages/domain-core/src/notification-content.js",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "../../../../packages/domain-core/src/notification-content.js",
);
assertContains("user-vue/shared-ui/api.js", "extractSMSResult");
assertContains("app-mobile/shared-ui/api.js", "createMobilePushApi");
assertContains("app-mobile/shared-ui/api.js", "extractSMSResult");
assertContains(
  "rider-app/pages/profile/order-settings.vue",
  "extractRiderPreferenceSettings",
);
assertContains(
  "rider-app/components/dispatch-popup-logic.ts",
  "extractRiderPreferenceSettings",
);
assertContains("admin-vue/src/views/Users.vue", "extractTemporaryCredential(");
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "normalizePaymentCenterConfig",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "extractPaymentCallbackDetail",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "buildPaymentCallbackQuery",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "createPaymentCallbackFilterState",
);
assertContains(
  "admin-vue/src/views/BlankPage.vue",
  "createDefaultPaymentGatewaySummary",
);
assertContains(
  "admin-vue/src/views/BlankPage.vue",
  "createDefaultServiceHealthStatus",
);
assertContains(
  "admin-vue/src/views/SystemLogs.vue",
  "normalizeServiceHealthStatus",
);
assertContains("admin-vue/src/views/SystemLogs.vue", "createSystemLogFilters");
assertContains("admin-vue/src/views/SystemLogs.vue", "buildSystemLogListQuery");
assertContains(
  "admin-vue/src/views/SystemLogs.vue",
  "getSystemLogServiceSignals",
);
assertContains(
  "admin-vue/src/views/SystemLogs.vue",
  "SYSTEM_LOG_SOURCE_OPTIONS",
);
assertContains(
  "admin-vue/src/views/SystemLogs.vue",
  "buildSystemLogDeletePayload",
);
assertNotContains(
  "admin-vue/src/views/SystemLogs.vue",
  "function actionTagType(actionType)",
);
assertNotContains(
  "admin-vue/src/views/SystemLogs.vue",
  "function parseServiceDetail(detail)",
);
assertContains(
  "admin-vue/src/views/Dashboard.vue",
  "extractServiceHealthStatus",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "buildAdminOfficialSiteSupportSummaryCards",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "createAdminOfficialSiteSupportFilters",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "buildAdminOfficialSiteSupportListQuery",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "buildAdminOfficialSiteExposureUpdatePayload",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "buildAdminOfficialSiteCooperationUpdatePayload",
);
assertContains(
  "admin-vue/src/views/OfficialSiteCenter.vue",
  "OFFICIAL_SITE_SUPPORT_STATUS_OPTIONS",
);
assertContains(
  "admin-vue/src/utils/officialSiteApi.js",
  "extractOfficialSiteRecordCollection",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "buildFinanceOverviewKpiCards",
);
assertContains(
  "admin-vue/src/views/TransactionLogs.vue",
  "formatFinancialTransactionType",
);
assertContains(
  "admin-vue/src/views/OfficialNotificationsPage.vue",
  "extractAdminNotificationPage",
);
assertContains(
  "admin-vue/src/views/NotificationPreviewPage.vue",
  "parseNotificationDisplayBlocks",
);
assertContains(
  "admin-vue/src/views/notificationEditorPageHelpers.js",
  "@infinitech/domain-core",
);
assertContains(
  "admin-vue/src/views/notificationEditorHelpers.js",
  "@infinitech/domain-core",
);
assertContains(
  "admin-vue/src/views/ContentSettings.vue",
  "extractAdminCarouselPage",
);
assertContains(
  "admin-vue/src/views/ContentSettings.vue",
  "buildAdminPushMessageStats",
);
assertContains(
  "admin-vue/src/views/contentSettingsHelpers.js",
  "@infinitech/admin-core",
);
assertContains(
  "admin-vue/src/views/OperationsCenter.vue",
  "extractOperationsCooperationPage",
);
assertContains(
  "admin-vue/src/views/OperationsCenter.vue",
  "createOperationsGoodFormState",
);
assertContains("admin-vue/src/views/Dashboard.vue", "buildDashboardStatsCards");
assertContains(
  "admin-vue/src/views/RiderRanks.vue",
  "extractDashboardRankItems",
);
assertContains(
  "admin-vue/src/views/dashboardHelpers.js",
  "@infinitech/admin-core",
);
assertContains("admin-vue/vite.config.mts", '"@infinitech/domain-core"');
assertContains("admin-vue/src/utils/runtime.js", "createAdminRuntimeIdentity");
assertContains("admin-vue/src/utils/runtime.js", "createSocketSessionIdentity");
assertContains(
  "socket-server/socketIdentity.js",
  "../packages/domain-core/src/identity.js",
);
assertContains("socket-server/socketIdentity.js", "resolveSocketSubjectId(");
assertContains(
  "packages/domain-core/src/identity.js",
  "export function createAdminRuntimeIdentity(",
);
assertContains(
  "packages/domain-core/src/identity.js",
  "export function createSocketSessionIdentity(",
);
assertContains(
  "backend/go/internal/handler/sms_handler.go",
  "respondSMSRequestSuccess",
);
assertContains(
  "backend/go/internal/handler/file_upload_handler.go",
  "resolveGeneralUploadPolicy(c)",
);
assertContains(
  "backend/go/internal/handler/file_upload_handler.go",
  "upload_domain 不能为空",
);
assertContains(
  "backend/go/internal/handler/file_upload_handler.go",
  "buildGeneralUploadOwnerScope(c, policy.domain)",
);
assertContains(
  "backend/go/internal/handler/file_upload_handler.go",
  "uploadDomainServiceSound",
);
assertContains(
  "backend/go/internal/handler/upload_handler.go",
  'buildMirroredPublicAssetPayload(url, finalFilename, "merchant_or_admin_image"',
);
assertContains(
  "backend/bff/src/controllers/uploadController.js",
  'forwardFields: ["upload_domain"]',
);
assertContains(
  "backend/bff/src/middleware/requireRequestAuth.js",
  "extractVerifiedAuthIdentity(req, { normalizeType: true })",
);
assertContains(
  "backend/bff/src/middleware/requireRequestAuth.js",
  "req.authIdentity = identity",
);
assertContains(
  "backend/bff/src/middleware/requireRequestAuth.js",
  'buildErrorEnvelopePayload(req, 401, "未授权，请先登录")',
);
assertContains(
  "backend/bff/src/middleware/requireAdminAuth.js",
  "buildErrorEnvelopePayload(req, 401,",
);
assertContains(
  "backend/bff/src/middleware/inviteRuntimeGuard.js",
  "buildErrorEnvelopePayload(req, 403, getPublicRuntimeGuardMessage(sourcePort))",
);
assertContains(
  "backend/bff/src/middleware/apiRateLimiter.js",
  'buildErrorEnvelopePayload(req, 429, "请求过于频繁，请稍后再试")',
);
assertContains(
  "backend/bff/src/index.js",
  'sendBffStatus(req, res, 200, "ok")',
);
assertContains("backend/bff/src/index.js", 'error: "go api not ready"');
assertContains(
  "backend/bff/src/routes/admin.js",
  "buildSuccessEnvelopePayload(req, 'admin route health ok', payload, {",
);
assertContains(
  "backend/bff/src/routes/admin.js",
  "createRateLimitHandler('登录尝试过于频繁，请稍后再试')",
);
assertContains(
  "backend/bff/src/services/adminController/qrCommon.js",
  "function sendAdminQrError(req, res, status, message, options = {})",
);
assertContains(
  "backend/bff/src/services/adminController/qrLogin.js",
  'return sendAdminQrSuccess(req, res, "二维码登录会话创建成功", {',
);
assertContains(
  "backend/bff/src/services/systemLogsService.js",
  'return respondSystemLogSuccess(req, res, "系统日志加载成功", {',
);
assertContains(
  "backend/bff/src/services/adminSettings/proxyClient.js",
  "buildNormalizedErrorPayload(",
);
assertContains(
  "backend/bff/src/services/adminSettings/proxyClient.js",
  'function normalizeSettingsProxyPayload(req, response, defaultErrorMessage = "请求后端服务失败，请稍后重试") {',
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  'return respondSettingsError(req, res, 400, "没有上传文件");',
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  'return respondSettingsSuccess(req, res, "全量数据清理完成", {',
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  "function respondSettingsProxyResponse(req, res, response, options = {}) {",
);
assertContains(
  "backend/bff/src/controllers/financialController.js",
  "function respondFinancialError(req, res, status, message, options = {})",
);
assertContains(
  "backend/bff/src/controllers/financialController.js",
  "function sendNormalizedFinancialResponse(req, res, response, defaultErrorMessage) {",
);
assertContains(
  "backend/bff/src/controllers/riderController.js",
  "buildNormalizedErrorPayload(req, error, status, fallbackMessage)",
);
assertContains(
  "backend/bff/src/controllers/riderController.js",
  "function sendResolvedRiderResponse(req, res, response, fallbackMessage) {",
);
assertContains(
  "backend/bff/src/controllers/adminWalletController.js",
  "function sendWalletSuccess(req, res, message, payload) {",
);
assertContains(
  "backend/bff/src/controllers/adminWalletController.js",
  "function withAdminWalletProxyOptions(req, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/multipartProxy.js",
  'buildErrorEnvelopePayload(req, 400, options.missingFileMessage || "没有上传文件")',
);
assertContains(
  "backend/bff/src/middleware/uploadsProxy.js",
  'buildErrorEnvelopePayload(req, 405, "Method not allowed")',
);
assertContains(
  "backend/bff/src/utils/authIdentity.js",
  "../../../../packages/contracts/src/identity.cjs",
);
assertContains(
  "backend/bff/src/utils/authIdentity.js",
  "../../../../packages/domain-core/src/identity.cjs",
);
assertContains(
  "backend/bff/src/utils/authIdentity.js",
  "function verifySignedTokenSignature(",
);
assertContains(
  "backend/bff/src/utils/authIdentity.js",
  "function extractVerifiedAuthIdentity(req, options = {})",
);
assertContains(
  "packages/mobile-core/src/upload.js",
  "normalizeUploadDomain(uploadDomain)",
);
assertContains("packages/contracts/src/http.js", "case 405:");
assertContains(
  "packages/contracts/src/http.js",
  'return "METHOD_NOT_ALLOWED";',
);
assertContains("packages/contracts/src/http.cjs", "case 405:");
assertContains(
  "packages/contracts/src/http.cjs",
  'return "METHOD_NOT_ALLOWED";',
);
assertContains(
  "packages/admin-core/src/upload.js",
  'formData.append("upload_domain"',
);
assertContains(
  "backend/go/internal/handler/shop_handler.go",
  "respondShopPaginated",
);
assertContains(
  "packages/mobile-core/src/sync-service.js",
  "export function createSyncService(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/sync-service.js",
  "export function buildSyncApiUrl(dataset, conditions = {}, options = {}) {",
);
assertContains(
  "packages/mobile-core/src/client-payment.js",
  "export async function invokeClientPayment(result, platform) {",
);
assertContains(
  "packages/mobile-core/src/client-payment.js",
  "export function shouldLaunchClientPayment(result) {",
);
assertContains(
  "packages/mobile-core/src/consumer-auth-runtime.js",
  "export function createConsumerAuthRuntimeStore(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-auth-runtime.js",
  "export function normalizeConsumerAuthRuntimeSettings(payload = {}) {",
);
assertContains(
  "packages/mobile-core/src/push-event-route.js",
  "export function createPushClickUrlResolver(roleOrRoles, options = {}) {",
);
assertContains(
  "packages/mobile-core/src/push-event-route.js",
  "export function buildPushNotificationDetailRoute(",
);
assertContains(
  "packages/mobile-core/src/location.js",
  "export function createLocationService(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/location.js",
  "export function getCurrentLocation(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/platform-runtime.js",
  "export function normalizePlatformRuntimeSettings(payload = {}) {",
);
assertContains(
  "packages/mobile-core/src/platform-runtime.js",
  "export function createPlatformRuntimeLoader(fetcher) {",
);
assertContains(
  "packages/mobile-core/src/platform-schema.js",
  "export function buildMerchantTypeOptions(taxonomySettings = null) {",
);
assertContains(
  "packages/mobile-core/src/platform-schema.js",
  "export function normalizeOrderListItem(order = {}) {",
);
assertContains(
  "packages/mobile-core/src/portal-runtime.js",
  "export function normalizePortalRuntimeSettings(payload = {}, options = {}) {",
);
assertContains(
  "packages/mobile-core/src/portal-runtime.js",
  "export function createPortalRuntimeStore(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/support-runtime.js",
  "export function createSupportRuntimeStore(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/support-runtime.js",
  "export function normalizeSupportRuntimeSettings(payload = {}, defaultSettings = {}) {",
);
assertContains("user-vue/shared-ui/sync.ts", "createSyncService({");
assertContains("app-mobile/shared-ui/sync.ts", "createSyncService({");
assertContains(
  "merchant-app/shared-ui/sync.ts",
  "productShopMode: 'shop-menu'",
);
assertContains("rider-app/shared-ui/sync.ts", "productShopMode: 'shop-menu'");
assertContains(
  "user-vue/shared-ui/client-payment.js",
  "export * from '../../packages/mobile-core/src/client-payment.js'",
);
assertContains(
  "app-mobile/shared-ui/client-payment.js",
  "export * from '../../packages/mobile-core/src/client-payment.js'",
);
assertContains(
  "merchant-app/shared-ui/client-payment.ts",
  "from '../../packages/mobile-core/src/client-payment.js'",
);
assertContains(
  "rider-app/shared-ui/client-payment.ts",
  "from '../../packages/mobile-core/src/client-payment.js'",
);
assertContains(
  "user-vue/shared-ui/auth-runtime.js",
  "createConsumerAuthRuntimeStore({",
);
assertContains(
  "app-mobile/shared-ui/auth-runtime.js",
  "createConsumerAuthRuntimeStore({",
);
assertContains(
  "user-vue/shared-ui/push-events.js",
  "createPushClickUrlResolver(['customer', 'user']",
);
assertContains(
  "app-mobile/shared-ui/push-events.js",
  "createPushClickUrlResolver(['customer', 'user']",
);
assertContains(
  "merchant-app/shared-ui/push-events.ts",
  "createPushClickUrlResolver('merchant')",
);
assertContains(
  "rider-app/shared-ui/push-events.ts",
  "createPushClickUrlResolver('rider')",
);
assertContains(
  "user-vue/shared-ui/location.js",
  "from '../../packages/mobile-core/src/location.js'",
);
assertContains(
  "app-mobile/shared-ui/location.js",
  "from '../../packages/mobile-core/src/location.js'",
);
assertContains(
  "rider-app/shared-ui/location.ts",
  "from '../../packages/mobile-core/src/location.js'",
);
assertContains(
  "shared/mobile-common/platform-runtime.js",
  'export * from "../../packages/mobile-core/src/platform-runtime.js";',
);
assertContains(
  "shared/mobile-common/platform-schema.js",
  'export * from "../../packages/mobile-core/src/platform-schema.js";',
);
assertContains(
  "user-vue/shared-ui/platform-runtime.js",
  "from '../../packages/mobile-core/src/platform-runtime.js'",
);
assertContains(
  "app-mobile/shared-ui/platform-runtime.js",
  "from '../../packages/mobile-core/src/platform-runtime.js'",
);
assertContains(
  "merchant-app/shared-ui/platform-runtime.ts",
  "from '../../packages/mobile-core/src/platform-runtime.js'",
);
assertContains(
  "rider-app/shared-ui/platform-runtime.ts",
  "from '../../packages/mobile-core/src/platform-runtime.js'",
);
assertContains(
  "user-vue/shared-ui/platform-schema.js",
  "export * from '../../packages/mobile-core/src/platform-schema.js'",
);
assertContains(
  "app-mobile/shared-ui/platform-schema.js",
  "export * from '../../packages/mobile-core/src/platform-schema.js'",
);
assertContains(
  "merchant-app/shared-ui/platform-schema.js",
  "export * from '../../packages/mobile-core/src/platform-schema.js'",
);
assertContains(
  "rider-app/shared-ui/platform-schema.js",
  "export * from '../../packages/mobile-core/src/platform-schema.js'",
);
assertContains(
  "merchant-app/shared-ui/portal-runtime.ts",
  "createPortalRuntimeStore<MerchantPortalRuntimeSettings>({",
);
assertContains(
  "rider-app/shared-ui/portal-runtime.ts",
  "createPortalRuntimeStore<RiderPortalRuntimeSettings>({",
);
assertContains(
  "user-vue/shared-ui/support-runtime.js",
  "createSupportRuntimeStore({",
);
assertContains(
  "app-mobile/shared-ui/support-runtime.js",
  "createSupportRuntimeStore({",
);
assertContains(
  "merchant-app/shared-ui/support-runtime.ts",
  "createSupportRuntimeStore({",
);
assertContains(
  "rider-app/shared-ui/support-runtime.ts",
  "createSupportRuntimeStore({",
);
assertContains(
  "admin-vue/src/views/Merchants.vue",
  "extractTemporaryCredential(",
);
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "extractTemporaryCredential(",
);
assertContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "extractTemporaryCredential(",
);
assertContains(
  "admin-vue/src/router/index.js",
  "resolveProtectedView(item.name)",
);
assertNotContains(
  "admin-vue/src/router/index.js",
  'protectedViewMap[item.name] || (() => import("@/views/BlankPage.vue"))',
);

assertContains(
  "backend/go/internal/middleware/route_guard.go",
  `{path: "/api/upload", methods: methods("POST"), guard: guardAnyAuth}`,
);

assertContains(
  "backend/go/internal/service/auth_service.go",
  "VerifyTokenIdentity(",
);
assertContains(
  "backend/go/internal/service/payment_runtime.go",
  `"allowStubBlocked"`,
);
assertContains(
  "backend/go/internal/handler/rider_cert_storage.go",
  "private://rider-cert/",
);
assertContains(
  "backend/go/cmd/main.go",
  `r.GET("/uploads/certs/*filepath", blockLegacyPrivateDocument)`,
);
assertContains(
  "backend/go/internal/service/admin_bootstrap.go",
  "BOOTSTRAP_ADMIN_PASSWORD is required to create the initial bootstrap admin",
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  `Cache-Control", "no-store, no-cache, must-revalidate, private"`,
);
assertContains(
  "backend/go/internal/handler/response_envelope.go",
  `"request_id": currentRequestID(c)`,
);
assertContains(
  "backend/go/internal/handler/response_envelope.go",
  "func respondMirroredSuccessEnvelope(c *gin.Context, message string, data interface{})",
);
assertContains(
  "backend/go/internal/handler/admin_wallet_handler.go",
  'respondMirroredSuccessEnvelope(c, "支付回调记录加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/admin_wallet_handler.go",
  "respondAdminWalletInvalidRequest(c)",
);
assertContains(
  "backend/go/internal/handler/dining_buddy_admin_handler.go",
  "func respondDiningBuddySuccess(c *gin.Context, message string, data interface{})",
);
assertContains(
  "backend/go/internal/handler/dining_buddy_admin_handler.go",
  'respondDiningBuddySuccess(c, "同频饭友组局列表加载成功", gin.H{"parties": items})',
);
assertContains(
  "backend/go/internal/handler/dining_buddy_admin_handler.go",
  'respondDiningBuddyInvalidRequest(c, "invalid request payload")',
);
assertContains(
  "backend/go/internal/handler/dining_buddy_handler.go",
  'respondDiningBuddyPaginated(c, "同频饭友组局列表加载成功", "parties", parties, countDiningBuddyItems(parties), limit)',
);
assertContains(
  "backend/go/internal/handler/dining_buddy_handler.go",
  'respondDiningBuddySuccess(c, "同频饭友组局创建成功", party)',
);
assertContains(
  "backend/go/internal/handler/dining_buddy_handler.go",
  'respondDiningBuddyPaginated(c, "同频饭友消息列表加载成功", "messages", messages, total, int(total))',
);
assertContains(
  "backend/go/internal/handler/dining_buddy_handler.go",
  'respondDiningBuddySuccess(c, "同频饭友消息发送成功", message)',
);
assertContains(
  "backend/go/internal/handler/invite_handler.go",
  'respondInviteSuccess(c, "邀请码加载成功", payload, gin.H{"inviteCode": code.Code, "userId": code.UserID})',
);
assertContains(
  "backend/go/internal/handler/invite_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "邀请代码列表加载成功", "records", list, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/invite_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "邀请记录列表加载成功", "records", list, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/user_address_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "用户地址列表加载成功", "addresses", result, int64(len(result)), 1, len(result))',
);
assertContains(
  "backend/go/internal/handler/user_address_handler.go",
  'respondUserAddressSuccess(c, "用户地址创建成功", gin.H{"address": result}, gin.H{"address": result})',
);
assertContains(
  "backend/go/internal/handler/user_address_handler.go",
  'respondUserAddressSuccess(c, "默认地址设置成功", gin.H{"address": result}, gin.H{"address": result})',
);
assertContains(
  "backend/go/internal/handler/order_handler.go",
  'respondOrderMirroredSuccess(c, "订单创建成功", result)',
);
assertContains(
  "backend/go/internal/handler/order_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "用户订单列表加载成功", "orders", result, int64(len(items)), 1, len(items))',
);
assertContains(
  "backend/go/internal/handler/order_handler.go",
  'respondOrderMirroredSuccess(c, "订单异常已上报", result)',
);
assertContains(
  "backend/go/internal/handler/user_handler.go",
  'respondUserMirroredSuccess(c, "用户资料加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/user_handler.go",
  'respondSuccessEnvelope(c, "用户资料更新成功", gin.H{"user": result}, gin.H{"user": result})',
);
assertContains(
  "backend/go/internal/handler/user_handler.go",
  'respondUserMirroredSuccess(c, firstNonEmptyText(extractMapText(result, "message"), "手机号修改成功"), result)',
);
assertContains(
  "backend/go/internal/handler/featured_product_handler.go",
  'respondFeaturedProductSuccess(c, "今日推荐商品加载成功", gin.H{"products": products})',
);
assertContains(
  "backend/go/internal/handler/featured_product_handler.go",
  'respondFeaturedProductSuccess(c, "今日推荐商品位置更新成功", gin.H{"id": idStr, "position": req.Position, "updated": true})',
);
assertContains(
  "backend/go/internal/handler/mobile_map_handler.go",
  'respondMobileMapSuccess(c, "地图搜索成功", result)',
);
assertContains(
  "backend/go/internal/handler/mobile_map_handler.go",
  'respondMobileMapSuccess(c, "逆地理编码成功", result)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  "func respondAdminSettingsSuccess(c *gin.Context, message string, data interface{})",
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler_platform.go",
  'respondAdminSettingsSuccess(c, "首页入口配置加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler_platform.go",
  'respondAdminSettingsSuccess(c, "跑腿配置保存成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler_platform.go",
  'respondAdminSettingsInvalidRequest(c, "请求参数错误")',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler_wechat.go",
  'respondAdminSettingsSuccess(c, "微信登录配置加载成功", service.BuildWechatLoginConfigAdminView(cfg))',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler_wechat.go",
  'respondAdminSettingsInvalidRequest(c, "invalid request parameters")',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsSuccess(c, "短信配置加载成功", service.BuildSMSProviderConfigAdminView(cfg))',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsSuccess(c, "天气配置保存成功", serializeWeatherConfig(cfg))',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "服务配置加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "公共运行时配置加载成功", payload)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "服务配置保存成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "公益公开配置加载成功", payload)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "会员公开配置加载成功", payload)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "天气信息加载成功", normalized)',
);
assertContains(
  "backend/go/internal/handler/wallet_handler.go",
  'respondWalletMirroredSuccess(c, "钱包余额加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/wallet_handler.go",
  "respondErrorEnvelope(c, status, code, err.Error(), nil)",
);
assertContains(
  "backend/go/internal/handler/financial_handler.go",
  'respondWalletMirroredSuccess(c, "财务概览加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/payment_handler.go",
  'respondWalletMirroredSuccess(c, "订单支付发起成功", result)',
);
assertContains(
  "backend/go/internal/handler/official_site_handler.go",
  "func respondOfficialSitePaginated(c *gin.Context, message string, records interface{}, total int64, page, limit int)",
);
assertContains(
  "backend/go/internal/handler/official_site_handler.go",
  'respondOfficialSiteMirroredSuccess(c, "官网曝光提交成功", gin.H{',
);
assertContains(
  "backend/go/internal/handler/official_site_handler.go",
  'respondOfficialSiteMirroredSuccess(c, "官网曝光素材上传成功", payload)',
);
assertContains(
  "backend/go/internal/handler/official_site_handler.go",
  'respondOfficialSitePaginated(c, "官网曝光列表加载成功", records, int64(len(records)), 1, len(records))',
);
assertContains(
  "backend/go/internal/handler/official_site_handler.go",
  'respondOfficialSitePaginated(c, "官网客服会话列表加载成功", records, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/coupon_handler.go",
  "func respondCouponPaginated(c *gin.Context, message string, items interface{}, total int64, page, limit int)",
);
assertContains(
  "backend/go/internal/handler/coupon_handler.go",
  'respondCouponMirroredSuccess(c, "优惠券创建成功", result)',
);
assertContains(
  "backend/go/internal/handler/coupon_handler.go",
  'respondCouponPaginated(c, "优惠券列表加载成功", items, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/coupon_handler.go",
  'respondSuccessEnvelope(c, "可用优惠券列表加载成功", coupons, nil)',
);
assertContains(
  "backend/go/internal/handler/coupon_handler.go",
  'respondCouponMirroredSuccess(c, "领券链接信息加载成功", gin.H{',
);
assertContains(
  "backend/go/internal/handler/after_sales_handler.go",
  'respondAfterSalesMirroredSuccess(c, "售后申请提交成功", result)',
);
assertContains(
  "backend/go/internal/handler/after_sales_handler.go",
  'respondAfterSalesMirroredSuccess(c, "售后列表加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/after_sales_handler.go",
  'respondSuccessEnvelope(c, "用户售后列表加载成功", result, nil)',
);
assertContains(
  "backend/go/internal/handler/groupbuy_handler.go",
  'respondSuccessEnvelope(c, "团购券列表加载成功", result, nil)',
);
assertContains(
  "backend/go/internal/handler/groupbuy_handler.go",
  'respondGroupbuyMirroredSuccess(c, "团购券核销码加载成功", result)',
);
assertContains(
  "backend/go/internal/handler/groupbuy_handler.go",
  'respondGroupbuyMirroredSuccess(c, "团购券核销成功", result)',
);
assertContains(
  "backend/go/internal/handler/points_handler.go",
  'respondPointsMirroredSuccess(c, "积分余额加载成功", gin.H{"userId": userID, "balance": balance})',
);
assertContains(
  "backend/go/internal/handler/points_handler.go",
  'respondSuccessEnvelope(c, "积分商品列表加载成功", goods, nil)',
);
assertContains(
  "backend/go/internal/handler/points_handler.go",
  'respondPointsPaginated(c, "积分兑换记录加载成功", records, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/cooperation_handler.go",
  'respondCooperationMirroredSuccess(c, "反馈与合作提交成功", payload)',
);
assertContains(
  "backend/go/internal/handler/cooperation_handler.go",
  'respondCooperationPaginated(c, "反馈与合作列表加载成功", list, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/home_feed_handler.go",
  'respondHomeFeedMirroredSuccess(c, "首页信息流加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/home_feed_handler.go",
  'respondHomeFeedMirroredSuccess(c, "首页推广计划创建成功", gin.H{"campaign": campaign})',
);
assertContains(
  "backend/go/internal/handler/notification_handler.go",
  "func writeNotificationServiceError(c *gin.Context, err error, fallbackStatus int)",
);
assertContains(
  "backend/go/internal/handler/notification_handler.go",
  'respondSuccessEnvelope(c, "通知列表加载成功", payload, gin.H{',
);
assertContains(
  "backend/go/internal/handler/notification_handler.go",
  'respondNotificationMirroredSuccess(c, "通知详情加载成功", detail)',
);
assertContains(
  "backend/go/internal/handler/notification_handler.go",
  'respondNotificationPaginated(c, "管理通知列表加载成功", "notifications", list, total, page, pageSize)',
);
assertContains(
  "backend/go/internal/handler/message_handler.go",
  "func writeMessageServiceError(c *gin.Context, err error, fallbackStatus int)",
);
assertContains(
  "backend/go/internal/handler/message_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "会话列表加载成功", "conversations", conversations, int64(len(conversations)), 1, len(conversations))',
);
assertContains(
  "backend/go/internal/handler/message_handler.go",
  'respondPaginatedEnvelope(c, responseCodeOK, "消息历史加载成功", "messages", messages, int64(len(messages)), 1, len(messages))',
);
assertContains(
  "backend/go/internal/handler/message_handler.go",
  'respondMessageMirroredSuccess(c, "消息同步成功", gin.H{',
);
assertContains(
  "backend/go/internal/handler/op_notification_handler.go",
  "func writeOpNotificationServiceError(c *gin.Context, err error, fallbackStatus int)",
);
assertContains(
  "backend/go/internal/handler/op_notification_handler.go",
  'respondSuccessEnvelope(c, "运营通知列表加载成功", gin.H{',
);
assertContains(
  "backend/go/internal/handler/op_notification_handler.go",
  'respondOpNotificationMirroredSuccess(c, "运营通知已标记为已读", gin.H{"id": idRaw, "read": true})',
);
assertContains(
  "backend/go/internal/handler/product_handler.go",
  "func respondProductPaginated(c *gin.Context, message, listKey string, items interface{}, total int64)",
);
assertContains(
  "backend/go/internal/handler/product_handler.go",
  'respondProductPaginated(c, "商品列表加载成功", "products", products, countProductItems(products))',
);
assertContains(
  "backend/go/internal/handler/product_handler.go",
  'respondProductMirroredSuccess(c, "商品详情加载成功", product)',
);
assertContains(
  "backend/go/internal/handler/product_handler.go",
  'respondProductMirroredSuccess(c, "今日推荐商品加载成功", gin.H{"products": products})',
);
assertContains(
  "backend/go/internal/handler/sync_handler.go",
  'respondMirroredSuccessEnvelope(c, "同步状态加载成功", state)',
);
assertContains(
  "backend/go/internal/handler/sync_handler.go",
  'respondMirroredSuccessEnvelope(c, "增量同步数据加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/rider_change_phone_handler.go",
  'respondMirroredSuccessEnvelope(c, "手机号修改成功", response)',
);
assertContains(
  "backend/go/internal/handler/medicine_handler.go",
  'respondMirroredSuccessEnvelope(c, "问药咨询结果加载成功", result)',
);
assertContains(
  "backend/bff/src/utils/apiEnvelope.js",
  "../../../../packages/contracts/src/http.cjs",
);
assertContains(
  "backend/bff/src/controllers/officialSiteController.js",
  'buildSuccessEnvelopePayload(req, "官网客服实时连接令牌签发成功", payload, {',
);
assertContains(
  "backend/bff/src/controllers/officialSiteController.js",
  "function buildOfficialSiteUpstreamPayload(req, status, payload, defaultErrorMessage) {",
);
assertContains(
  "backend/bff/src/controllers/officialSiteController.js",
  'return sendOfficialSiteResponse(req, res, sessionResponse, "support session not found");',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsSuccess(c, "APP 下载配置加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsSuccess(c, "虚拟币比例保存成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "支付提示文案加载成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondSuccessEnvelope(c, "推送消息列表加载成功", items, nil)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondSuccessEnvelope(c, "开放 API 列表加载成功", items, nil)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "图片上传成功", payload)',
);
assertContains(
  "user-vue/pages/order/coupon/index.vue",
  "../../../../packages/mobile-core/src/order-coupon-page.js",
);
assertContains(
  "app-mobile/pages/order/coupon/index.vue",
  "../../../../packages/mobile-core/src/order-coupon-page.js",
);
assertContains(
  "user-vue/pages/profile/coupon-list/index.vue",
  "../../../../packages/mobile-core/src/profile-coupon-list.js",
);
assertContains(
  "app-mobile/pages/profile/coupon-list/index.vue",
  "../../../../packages/mobile-core/src/profile-coupon-list.js",
);
assertContains(
  "packages/mobile-core/src/order-list-page.js",
  "extractEnvelopeData(data)",
);
assertContains(
  "merchant-app/shared-ui/merchantOrders.ts",
  "extractPaginatedItems(afterSalesRes, {",
);
assertContains(
  "packages/mobile-core/src/order-list-page.js",
  "extractEnvelopeData(vouchers)",
);
assertContains(
  "packages/mobile-core/src/order-detail-page.js",
  "extractEnvelopeData(vouchers)",
);
assertContains(
  "user-vue/shared-ui/api.js",
  "extractEnvelopeData(payload) || {}",
);
assertContains(
  "app-mobile/shared-ui/api.js",
  "extractEnvelopeData(payload) || {}",
);
assertContains(
  "user-vue/shared-ui/api.js",
  "const paginated = extractPaginatedItems(response, {",
);
assertContains(
  "app-mobile/shared-ui/api.js",
  "const paginated = extractPaginatedItems(response, {",
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["conversations", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["conversations", "items", "records", "list"]',
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  'listKeys: ["conversations", "items", "records", "list"]',
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  'listKeys: ["products", "items", "records", "list"]',
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  'listKeys: ["categories", "items", "records", "list"]',
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["categories", "items", "records", "list"]',
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["parties", "items", "records", "list"]',
);
assertContains(
  "user-vue/shared-ui/api.js",
  "extractEnvelopeData(response) || {}",
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["addresses", "items", "records", "list"]',
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["orders", "items", "records", "list"]',
);
assertContains(
  "user-vue/shared-ui/api.js",
  'listKeys: ["messages", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["banners", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["parties", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  "extractEnvelopeData(response) || {}",
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["addresses", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["orders", "items", "records", "list"]',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'listKeys: ["messages", "items", "records", "list"]',
);
assertContains(
  "rider-app/shared-ui/api.ts",
  "listKeys: ['conversations', 'items', 'records', 'list']",
);
assertContains(
  "backend/go/internal/handler/admin_settings_handler.go",
  'respondAdminSettingsMirroredSuccess(c, "安装包上传成功", payload)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_export_handler.go",
  'respondAdminSettingsSuccess(c, "系统配置导出成功", data)',
);
assertContains(
  "backend/go/internal/handler/admin_settings_export_handler.go",
  'h.importBundle(c, h.admin.ImportPaymentConfigBundle, "支付配置导入成功")',
);
assertContains(
  "backend/go/internal/handler/onboarding_invite_handler.go",
  'respondEnvelope(c, http.StatusOK, "ONBOARDING_INVITE_CREATED"',
);
assertContains(
  "backend/go/internal/handler/mobile_push_handler.go",
  'respondSuccessEnvelope(c, "推送设备注册成功"',
);
assertContains(
  "backend/go/internal/handler/rider_preferences_handler.go",
  'respondSuccessEnvelope(c, "骑手偏好加载成功"',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  "buildTemporaryCredentialResponse(newPassword)",
);
assertNotContains("backend/go/internal/handler/admin_handler.go", "c.JSON(");
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminSuccess(c, "管理员账号列表加载成功", admins)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminPayload(c, code, adminPayloadMessage(resp, nil, "管理员登录成功"), resp)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminImportSuccess(c, "用户数据导入完成", successCount, errorCount)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminMirroredSuccess(c, "用户订单清理成功", gin.H{"deleted": deleted})',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminSuccess(c, "骑手详情加载成功", rider)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminSuccess(c, "商户详情加载成功", merchant)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondPaginatedEnvelope(c, "ADMIN_ORDER_LISTED", "订单列表加载成功", "orders", orders, total, page, limit)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminMirroredSuccess(c, "统计数据加载成功", stats)',
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminSuccess(c, "订单数据导出成功", data)',
);
assertNotContains("backend/go/internal/handler/payment_handler.go", "c.JSON(");
assertContains(
  "backend/go/internal/handler/payment_handler.go",
  "writePaymentCallbackAcknowledgement(c, service.BuildPaymentCallbackAcknowledgement(channel, verified))",
);
assertNotContains(
  "backend/go/internal/service/admin_service.go",
  "hashPassword(defaultAdminPassword)",
);
assertNotContains(
  "backend/go/internal/repository/admin_models.go",
  "default:super_admin",
);
assertNotContains(
  "backend/bff/src/middleware/requireAdminAuth.js",
  'normalized === "admin" || normalized === "super_admin" || normalized === ""',
);
assertNotContains(
  "backend/bff/src/services/adminController/qrCommon.js",
  'normalized === "admin" || normalized === "super_admin" || normalized === ""',
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  "BOOTSTRAP_ADMIN_PASSWORD: ${BOOTSTRAP_ADMIN_PASSWORD:-123456}",
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  "JWT_SECRET: ${JWT_SECRET:-yuexiang-dev-secret-key-change-in-production-32chars}",
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  "TOKEN_API_SECRET: ${TOKEN_API_SECRET:-compose-token-api-secret}",
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  "BANK_PAYOUT_ALLOW_STUB: ${BANK_PAYOUT_ALLOW_STUB:-true}",
);
assertContains(
  "backend/docker/docker-compose.yml",
  "ALIPAY_SIDECAR_API_SECRET: ${ALIPAY_SIDECAR_API_SECRET:?ALIPAY_SIDECAR_API_SECRET is required}",
);
assertContains(
  "backend/docker/docker-compose.yml",
  "BANK_PAYOUT_SIDECAR_API_SECRET: ${BANK_PAYOUT_SIDECAR_API_SECRET:?BANK_PAYOUT_SIDECAR_API_SECRET is required}",
);
assertContains(
  "backend/docker/docker-compose.yml",
  "ALIPAY_SIDECAR_ALLOW_STUB: ${ALIPAY_SIDECAR_ALLOW_STUB:-false}",
);
assertContains("package.json", '"verify:sidecar-tests":');
assertContains("package.json", "verify:backend-runtime");
assertContains(
  "backend/go/internal/service/payment_runtime.go",
  "SidecarAPISecret",
);
assertContains(
  "backend/go/internal/service/sidecar_auth.go",
  'const sidecarSecretHeader = "X-Sidecar-Secret"',
);
assertNotContains(
  "backend/go/internal/handler/admin_handler.go",
  '"newPassword":         newPassword',
);
assertNotContains("packages/contracts/src/http.js", "payload?.newPassword");
assertNotContains("backend/bank-payout-sidecar/server.js", "body.allowStub");
assertNotContains("backend/bank-payout-sidecar/server.js", "body.mockStatus");
assertNotContains(
  "backend/docker/docker-compose.yml",
  "RABBITMQ_DEFAULT_PASS: admin_password",
);
assertNotContains(
  "backend/go/.env.example",
  "JWT_SECRET=yuexiang-dev-secret-key-change-in-production-32chars",
);
assertNotContains("scripts/verify-im-e2e.mjs", "DEFAULT_JWT_SECRET");
assertNotContains(
  "scripts/verify-im-e2e.mjs",
  "process.env.JWT_SECRET || DEFAULT_JWT_SECRET",
);
assertNotContains(
  "socket-server/.env.example",
  "SOCKET_ENABLE_LEGACY_LOGIN=false",
);
assertNotContains("socket-server/.env.example", "SOCKET_LEGACY_LOGIN_USERS");
assertNotContains("socket-server/package.json", "routes.js");
if (fs.existsSync(path.join(repoRoot, "socket-server/routes.js"))) {
  throw new Error("unexpected legacy socket-server/routes.js module");
}
assertNotContains(
  "admin-app/pages/work-password/work-password.vue",
  "response.newPassword ? response.newPassword : '123456'",
);
assertNotContains("admin-vue/src/views/Users.vue", "密码重置成功！新密码为：");
assertNotContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "骑手密码重置成功！新密码为：",
);
assertNotContains("admin-vue/src/views/Merchants.vue", "新密码：<strong");
assertNotContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "新密码：${newPassword}",
);
assertNotContains(
  "scripts/install-all.mjs",
  "console.log(`  密码:   ${runtimeValues.BOOTSTRAP_ADMIN_PASSWORD}`)",
);
assertNotContains(
  "scripts/install-all.mjs",
  "console.log(`  密码: ${runtimeValues.SYSTEM_LOG_DELETE_PASSWORD}`)",
);
assertNotContains(
  "scripts/lib/management/cli.mjs",
  "console.log(`初始密码：${payload.newPassword}`)",
);
assertNotContains(
  "scripts/lib/management/cli.mjs",
  "console.log(`新密码：${payload.newPassword}`)",
);
assertNotContains("scripts/lib/management/cli.mjs", "revealSensitive: true");
assertNotContains(
  "scripts/lib/management/menu.mjs",
  "输入管理员类型 admin/super_admin', 'super_admin'",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'pragma', 'expires', 'x-content-type-options'];",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function buildResolvedErrorPayload(req, response, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "if (options.normalizeErrorResponse && Number(response?.status || 200) >= 400) {",
);
assertContains(
  "backend/bff/src/utils/apiEnvelope.js",
  "../../../../packages/contracts/src/http.cjs",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "buildErrorEnvelopePayload(req, status, message, {",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "legacy: { statusCode: status }",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "function buildResolvedGoErrorPayload(req, status, payload, fallbackMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "return sendResolvedGoResponse(req, res, response, '微信登录会话不存在或已失效');",
);
assertNotContains("backend/bff/src/controllers/authController.js", "debug:");
assertContains(
  "backend/bff/src/middleware/errorHandler.js",
  "buildErrorEnvelopePayload(req, 413, '文件大小不能超过10MB'",
);
assertContains(
  "package.json",
  '"verify:contracts-tests": "node --test packages/contracts/src/http.test.mjs packages/contracts/src/identity.test.mjs packages/contracts/src/upload.test.mjs"',
);
assertContains(
  "package.json",
  '"verify:domain-core-tests": "node --test packages/domain-core/src/identity.test.mjs packages/domain-core/src/notification-content.test.mjs packages/domain-core/src/onboarding-invite-content.test.mjs packages/domain-core/src/errand-settings.test.mjs"',
);
assertContains("package.json", '"verify:mobile-core-tests":');
assertContains(
  "package.json",
  "packages/mobile-core/src/sync-service.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/client-payment.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/rtc-call-page.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-auth-runtime.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/push-event-route.test.mjs",
);
assertContains("package.json", "packages/mobile-core/src/location.test.mjs");
assertContains(
  "package.json",
  "packages/mobile-core/src/platform-runtime.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/platform-schema.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/portal-runtime.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/support-runtime.test.mjs",
);
assertContains(
  "package.json",
  '"verify:admin-core-tests": "node --test packages/admin-core/src/paginated-resources.test.mjs packages/admin-core/src/system-log-resources.test.mjs packages/admin-core/src/payment-center-resources.test.mjs packages/admin-core/src/service-health-resources.test.mjs packages/admin-core/src/official-site-resources.test.mjs packages/admin-core/src/financial-transaction-resources.test.mjs packages/admin-core/src/notification-resources.test.mjs packages/admin-core/src/content-settings-resources.test.mjs packages/admin-core/src/operations-center-resources.test.mjs packages/admin-core/src/dashboard-resources.test.mjs packages/admin-core/src/system-settings-resources.test.mjs packages/admin-core/src/api-management-resources.test.mjs packages/admin-core/src/order-resources.test.mjs packages/admin-core/src/user-management-resources.test.mjs packages/admin-core/src/shop-management-resources.test.mjs packages/admin-core/src/merchant-profile-resources.test.mjs packages/admin-core/src/home-entry-resources.test.mjs packages/admin-core/src/communication-audit-resources.test.mjs packages/admin-core/src/home-campaign-resources.test.mjs packages/admin-core/src/admin-management-resources.test.mjs packages/admin-core/src/dining-buddy-governance-resources.test.mjs packages/admin-core/src/chat-console-resources.test.mjs packages/admin-core/src/data-management-resources.test.mjs packages/admin-core/src/coupon-resources.test.mjs packages/admin-core/src/api-documentation-resources.test.mjs"',
);
assertContains(
  "package.json",
  '"verify:modernization": "node scripts/architecture/verify-modernization-baseline.mjs && npm run verify:mobile-types && npm run verify:admin-stack && npm run verify:contracts-tests && npm run verify:domain-core-tests && npm run verify:mobile-core-tests && npm run verify:admin-core-tests && npm run verify:client-sdk-tests && npm run verify:backend-runtime && npm run verify:management-tests"',
);
assertContains(
  "package.json",
  '"verify:client-sdk-tests": "node --test packages/client-sdk/src/local-db.test.mjs packages/client-sdk/src/mobile-capabilities.test.mjs packages/client-sdk/src/mobile-config.test.mjs packages/client-sdk/src/mobile-config-helper.test.mjs packages/client-sdk/src/mobile-utils.test.mjs packages/client-sdk/src/notification-audio.test.mjs packages/client-sdk/src/onboarding-invite.test.mjs packages/client-sdk/src/push-events.test.mjs packages/client-sdk/src/push-registration.test.mjs packages/client-sdk/src/realtime-notify.test.mjs packages/client-sdk/src/realtime-token.test.mjs packages/client-sdk/src/rtc-contact.test.mjs packages/client-sdk/src/rtc-media.test.mjs packages/client-sdk/src/rtc-runtime.test.mjs packages/client-sdk/src/socket-io.test.mjs packages/client-sdk/src/stored-auth-identity.test.mjs packages/client-sdk/src/support-socket.test.mjs packages/client-sdk/src/uni-request.test.mjs"',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./local-db.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./mobile-config.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./mobile-config-helper.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./push-events.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./push-registration.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./realtime-notify.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./rtc-contact.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./rtc-media.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./rtc-runtime.js";',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./local-db": "./src/local-db.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./mobile-config": "./src/mobile-config.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./mobile-config-helper": "./src/mobile-config-helper.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./push-events": "./src/push-events.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./push-registration": "./src/push-registration.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./realtime-notify": "./src/realtime-notify.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./rtc-contact": "./src/rtc-contact.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./rtc-media": "./src/rtc-media.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./rtc-runtime": "./src/rtc-runtime.js"',
);
assertContains("packages/client-sdk/src/local-db.js", "export class LocalDB {");
assertContains(
  "packages/client-sdk/src/local-db.js",
  "export function createLocalDB(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/local-db.js",
  "export function resetLocalDBForTest() {",
);
assertContains(
  "packages/client-sdk/src/mobile-config.js",
  "export function createMobileConfigRuntime(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/mobile-config-helper.js",
  "export function createMobileConfigHelper(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/mobile-utils.js",
  "export function formatUserId(id, _role) {",
);
assertContains(
  "packages/client-sdk/src/mobile-utils.js",
  'export function showConfirm(content, title = "提示", options = {}) {',
);
assertContains(
  "packages/client-sdk/src/mobile-utils.js",
  "export function getOrderStatusColor(status) {",
);
assertContains(
  "packages/client-sdk/src/notification-audio.js",
  "export function createUniNotificationAudioManager(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/notification-audio.js",
  "export function classifyNotificationEnvelopeKind(envelope = {}) {",
);
assertContains(
  "packages/client-sdk/src/push-events.js",
  "export function extractPushEventEnvelope(rawMessage) {",
);
assertContains(
  "packages/client-sdk/src/push-events.js",
  "export function createPushEventBridgeController(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/push-registration.js",
  "export function createPushRegistrationManager(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/push-registration.js",
  "export function extractPushDeviceToken(pushInfo = {}) {",
);
assertContains(
  "packages/client-sdk/src/realtime-notify.js",
  "export function createRealtimeNotifyBridge(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/realtime-token.js",
  "export function extractSocketTokenResult(payload = {}) {",
);
assertContains(
  "packages/client-sdk/src/realtime-token.js",
  "export function buildSocketTokenAccountKey(userId, role) {",
);
assertContains(
  "packages/client-sdk/src/rtc-contact.js",
  "export function createRTCContactHelper(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/rtc-contact.js",
  "export function createUniRTCContactBridge(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/rtc-media.js",
  "export function createRTCMediaSession(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/rtc-media.js",
  "export function canUseRTCMedia(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/rtc-runtime.js",
  "export function createRTCRuntimeSettingsLoader(fetcher) {",
);
assertContains(
  "packages/client-sdk/src/rtc-runtime.js",
  "export const DEFAULT_RTC_RUNTIME_SETTINGS = {",
);
assertContains(
  "packages/client-sdk/src/socket-io.js",
  'export default function createSocket(url, namespace = "", token = "") {',
);
assertContains(
  "packages/client-sdk/src/support-socket.js",
  "export function createSupportSocketService(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/support-socket.js",
  "export function createUniSupportSocketBridge(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/uni-request.js",
  "export function createUniRequestClient(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/uni-request.js",
  "export function buildUniNetworkErrorMessage(error, context = {}, options = {}) {",
);
assertContains(
  "packages/client-sdk/src/stored-auth-identity.js",
  "export function createStoredAuthIdentityResolver(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/stored-auth-identity.js",
  "return () => resolveStoredAuthIdentity(options);",
);
assertContains(
  "shared/mobile-common/notification-audio.js",
  'export * from "../../packages/client-sdk/src/notification-audio.js";',
);
assertContains(
  "shared/mobile-common/push-events.js",
  'export * from "../../packages/client-sdk/src/push-events.js";',
);
assertContains(
  "shared/mobile-common/push-registration.js",
  'export * from "../../packages/client-sdk/src/push-registration.js";',
);
assertContains(
  "shared/mobile-common/realtime-notify.js",
  'export * from "../../packages/client-sdk/src/realtime-notify.js";',
);
assertContains(
  "shared/mobile-common/rtc-contact.js",
  'export * from "../../packages/client-sdk/src/rtc-contact.js";',
);
assertContains(
  "shared/mobile-common/rtc-media.js",
  'export * from "../../packages/client-sdk/src/rtc-media.js";',
);
assertContains(
  "shared/mobile-common/rtc-runtime.js",
  'export * from "../../packages/client-sdk/src/rtc-runtime.js";',
);
assertContains(
  "shared/mobile-common/rtc-call-page.js",
  'export * from "../../packages/mobile-core/src/rtc-call-page.js";',
);
assertContains(
  "shared/mobile-common/mobile-client-context.js",
  'export * from "../../packages/mobile-core/src/mobile-client-context.js";',
);
assertContains(
  "shared/mobile-common/dining-buddy-page.js",
  'export * from "../../packages/mobile-core/src/dining-buddy.js";',
);
assertContains(
  "shared/mobile-common/medicine-order-pages.js",
  'export * from "../../packages/mobile-core/src/medicine-order.js";',
);
assertContains(
  "shared/mobile-common/message-center-pages.js",
  'export * from "../../packages/mobile-core/src/message-center.js";',
);
assertContains(
  "shared/mobile-common/notification-detail-page.js",
  'export * from "../../packages/mobile-core/src/notification-detail.js";',
);
assertContains(
  "shared/mobile-common/message-chat-page.js",
  'export * from "../../packages/mobile-core/src/message-chat-page.js";',
);
assertContains(
  "shared/mobile-common/customer-service-chat-utils.js",
  'export * from "../../packages/mobile-core/src/customer-service-chat-utils.js";',
);
assertContains(
  "shared/mobile-common/customer-service-page.js",
  'export * from "../../packages/mobile-core/src/customer-service-page.js";',
);
assertContains(
  "shared/mobile-common/home-index-page.js",
  'export * from "../../packages/mobile-core/src/home-index.js";',
);
assertContains(
  "shared/mobile-common/auth-password-pages.js",
  'export * from "../../packages/mobile-core/src/auth-portal.js";',
);
assertContains(
  "shared/mobile-common/order-list-page.js",
  'export * from "../../packages/mobile-core/src/order-list-page.js";',
);
assertContains(
  "shared/mobile-common/order-detail-page.js",
  'export * from "../../packages/mobile-core/src/order-detail-page.js";',
);
assertContains(
  "shared/mobile-common/order-confirm-page.js",
  'export * from "../../packages/mobile-core/src/order-confirm-page.js";',
);
assertContains(
  "shared/mobile-common/order-after-sales-pages.js",
  'export * from "../../packages/mobile-core/src/order-after-sales-pages.js";',
);
assertContains(
  "shared/mobile-common/order-coupon-page.js",
  'export * from "../../packages/mobile-core/src/order-coupon-page.js";',
);
assertContains(
  "shared/mobile-common/order-payment-options.js",
  'export * from "../../packages/mobile-core/src/order-payment-options.js";',
);
assertContains(
  "shared/mobile-common/order-support-pages.js",
  'export * from "../../packages/mobile-core/src/order-support-pages.js";',
);
assertContains(
  "shared/mobile-common/phone-contact.js",
  'export * from "../../packages/mobile-core/src/phone-contact.js";',
);
assertContains(
  "shared/mobile-common/search-page.js",
  'export * from "../../packages/mobile-core/src/search-page.js";',
);
assertContains(
  "shared/mobile-common/profile-address-pages.js",
  'export * from "../../packages/mobile-core/src/profile-address.js";',
);
assertContains(
  "shared/mobile-common/profile-favorites-page.js",
  'export * from "../../packages/mobile-core/src/profile-favorites.js";',
);
assertContains(
  "shared/mobile-common/profile-my-reviews-page.js",
  'export * from "../../packages/mobile-core/src/profile-my-reviews.js";',
);
assertContains(
  "shared/mobile-common/profile-points-mall-page.js",
  'export * from "../../packages/mobile-core/src/profile-points-mall.js";',
);
assertContains(
  "shared/mobile-common/profile-vip-center-page-options.js",
  'export * from "../../packages/mobile-core/src/vip-center.js";',
);
assertContains(
  "shared/mobile-common/profile-edit-page.js",
  'export * from "../../packages/mobile-core/src/profile-edit.js";',
);
assertContains(
  "shared/mobile-common/profile-coupon-list-page.js",
  'export * from "../../packages/mobile-core/src/profile-coupon-list.js";',
);
assertContains(
  "shared/mobile-common/profile-home-page.js",
  'export * from "../../packages/mobile-core/src/profile-home.js";',
);
assertContains(
  "shared/mobile-common/profile-phone-change-page.js",
  'export * from "../../packages/mobile-core/src/profile-phone-change.js";',
);
assertContains(
  "shared/mobile-common/profile-outreach-pages.js",
  'export * from "../../packages/mobile-core/src/profile-outreach.js";',
);
assertContains(
  "shared/mobile-common/profile-settings-pages.js",
  'export * from "../../packages/mobile-core/src/profile-settings.js";',
);
assertContains(
  "shared/mobile-common/wallet-overview-page.js",
  'export * from "../../packages/mobile-core/src/wallet-overview-page.js";',
);
assertContains(
  "shared/mobile-common/wallet-bills-page.js",
  'export * from "../../packages/mobile-core/src/wallet-bills-page.js";',
);
assertContains(
  "shared/mobile-common/wallet-recharge-page.js",
  'export * from "../../packages/mobile-core/src/wallet-recharge-page.js";',
);
assertContains(
  "shared/mobile-common/wallet-withdraw-page.js",
  'export * from "../../packages/mobile-core/src/wallet-withdraw-page.js";',
);
assertContains(
  "shared/mobile-common/db.js",
  'export { default } from "../../packages/client-sdk/src/local-db.js";',
);
assertContains(
  "shared/mobile-common/config.ts",
  'from "../../packages/client-sdk/src/mobile-config.js"',
);
assertContains(
  "shared/mobile-common/utils.ts",
  'export * from "../../packages/client-sdk/src/mobile-utils.js";',
);
assertContains(
  "shared/mobile-common/socket-io.ts",
  'export { default } from "../../packages/client-sdk/src/socket-io.js"',
);
assertContains(
  "shared/mobile-common/socket.ts",
  "createUniSupportSocketBridge({",
);
assertContains(
  "user-vue/utils/socket-io.ts",
  "from '../../packages/client-sdk/src/socket-io.js'",
);
assertContains(
  "app-mobile/utils/socket-io.ts",
  "from '../../packages/client-sdk/src/socket-io.js'",
);
assertContains(
  "merchant-app/utils/socket-io.ts",
  "from '../../packages/client-sdk/src/socket-io.js'",
);
assertContains(
  "rider-app/utils/socket-io.ts",
  "from '../../packages/client-sdk/src/socket-io.js'",
);
assertContains(
  "user-vue/shared-ui/notification-sound.js",
  "from '../../packages/client-sdk/src/notification-audio.js'",
);
assertContains(
  "app-mobile/shared-ui/notification-sound.js",
  "from '../../packages/client-sdk/src/notification-audio.js'",
);
assertContains(
  "merchant-app/shared-ui/notification-sound.ts",
  "from '../../packages/client-sdk/src/notification-audio.js'",
);
assertContains(
  "rider-app/utils/notification.ts",
  "from '../../packages/client-sdk/src/notification-audio.js'",
);
assertContains(
  "user-vue/shared-ui/db.js",
  "from '../../packages/client-sdk/src/local-db.js'",
);
assertContains(
  "app-mobile/shared-ui/db.js",
  "from '../../packages/client-sdk/src/local-db.js'",
);
assertContains(
  "merchant-app/shared-ui/db.js",
  "from '../../packages/client-sdk/src/local-db.js'",
);
assertContains(
  "rider-app/shared-ui/db.js",
  "from '../../packages/client-sdk/src/local-db.js'",
);
assertContains(
  "user-vue/shared-ui/config.ts",
  "from '../../packages/client-sdk/src/mobile-config.js'",
);
assertContains(
  "app-mobile/shared-ui/config.ts",
  "from '../../packages/client-sdk/src/mobile-config.js'",
);
assertContains(
  "merchant-app/shared-ui/config.ts",
  "from '../../packages/client-sdk/src/mobile-config.js'",
);
assertContains(
  "rider-app/shared-ui/config.ts",
  "from '../../packages/client-sdk/src/mobile-config.js'",
);
assertContains(
  "user-vue/shared-ui/config-helper.ts",
  "createMobileConfigHelper({",
);
assertContains(
  "app-mobile/shared-ui/config-helper.ts",
  "createMobileConfigHelper({",
);
assertContains(
  "user-vue/shared-ui/utils.ts",
  "from '../../packages/client-sdk/src/mobile-utils.js'",
);
assertContains(
  "app-mobile/shared-ui/utils.ts",
  "from '../../packages/client-sdk/src/mobile-utils.js'",
);
assertContains(
  "merchant-app/shared-ui/utils.ts",
  "from '../../packages/client-sdk/src/mobile-utils.js'",
);
assertContains(
  "rider-app/shared-ui/utils.ts",
  "from '../../packages/client-sdk/src/mobile-utils.js'",
);
assertContains("user-vue/shared-ui/api.js", "createUniRequestClient({");
assertContains("app-mobile/shared-ui/api.js", "createUniRequestClient({");
assertContains("merchant-app/shared-ui/api.ts", "createUniRequestClient({");
assertContains("rider-app/shared-ui/api.ts", "createUniRequestClient({");
assertContains(
  "user-vue/shared-ui/push-registration.js",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "user-vue/shared-ui/push-registration.js",
  "from '../../packages/client-sdk/src/push-registration.js'",
);
assertContains(
  "app-mobile/shared-ui/push-registration.js",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "app-mobile/shared-ui/push-registration.js",
  "from '../../packages/client-sdk/src/push-registration.js'",
);
assertContains(
  "merchant-app/shared-ui/push-registration.ts",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "merchant-app/shared-ui/push-registration.ts",
  "from '../../packages/client-sdk/src/push-registration.js'",
);
assertContains(
  "rider-app/shared-ui/push-registration.ts",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "rider-app/shared-ui/push-registration.ts",
  "from '../../packages/client-sdk/src/push-registration.js'",
);
assertContains(
  "user-vue/shared-ui/realtime-notify.js",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "user-vue/shared-ui/realtime-notify.js",
  "from '../../packages/client-sdk/src/realtime-notify.js'",
);
assertContains(
  "app-mobile/shared-ui/realtime-notify.js",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "app-mobile/shared-ui/realtime-notify.js",
  "from '../../packages/client-sdk/src/realtime-notify.js'",
);
assertContains(
  "merchant-app/shared-ui/realtime-notify.ts",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "merchant-app/shared-ui/realtime-notify.ts",
  "from '../../packages/client-sdk/src/realtime-notify.js'",
);
assertContains(
  "rider-app/shared-ui/realtime-notify.ts",
  "createStoredAuthIdentityResolver({",
);
assertContains(
  "rider-app/shared-ui/realtime-notify.ts",
  "from '../../packages/client-sdk/src/realtime-notify.js'",
);
assertContains(
  "user-vue/shared-ui/push-events.js",
  "from '../../packages/client-sdk/src/push-events.js'",
);
assertContains(
  "app-mobile/shared-ui/push-events.js",
  "from '../../packages/client-sdk/src/push-events.js'",
);
assertContains(
  "merchant-app/shared-ui/push-events.ts",
  "from '../../packages/client-sdk/src/push-events.js'",
);
assertContains(
  "rider-app/shared-ui/push-events.ts",
  "from '../../packages/client-sdk/src/push-events.js'",
);
assertContains(
  "admin-vue/src/utils/socket.js",
  "extractSocketTokenResult(data).token",
);
assertContains(
  "merchant-app/shared-ui/merchantChatPage.ts",
  "extractSocketTokenResult(payload).token",
);
assertContains(
  "user-vue/shared-ui/rtc-contact.js",
  "createUniRTCContactBridge({",
);
assertContains(
  "app-mobile/shared-ui/rtc-contact.js",
  "createUniRTCContactBridge({",
);
assertContains(
  "user-vue/shared-ui/rtc-runtime.js",
  "from '../../packages/client-sdk/src/rtc-runtime.js'",
);
assertContains(
  "app-mobile/shared-ui/rtc-runtime.js",
  "from '../../packages/client-sdk/src/rtc-runtime.js'",
);
assertContains(
  "user-vue/shared-ui/rtc-media.js",
  "from '../../packages/client-sdk/src/rtc-media.js'",
);
assertContains(
  "app-mobile/shared-ui/rtc-media.js",
  "from '../../packages/client-sdk/src/rtc-media.js'",
);
assertContains(
  "rider-app/App-logic.ts",
  "const tokenResult = extractSocketTokenResult(resData)",
);
assertContains("admin-vue/src/views/Users.vue", "extractAdminUserPage");
assertContains("admin-vue/src/views/Users.vue", "createAdminUserListParams");
assertContains(
  "admin-vue/src/views/Users.template.html",
  "vipLabel(row.vip_level)",
);
assertContains("admin-vue/src/views/Merchants.vue", "extractAdminMerchantPage");
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/components/OldUserInviteFlow.vue",
  "createOnboardingInviteApi",
);
assertContains("admin-vue/src/views/ridersHelpers.js", "extractAdminRiderPage");
assertContains(
  "admin-vue/src/views/ContactPhoneAudits.vue",
  "extractContactPhoneAuditPage",
);
assertContains(
  "admin-vue/src/views/ContactPhoneAudits.vue",
  "buildAdminContactPhoneAuditQuery",
);
assertContains(
  "admin-vue/src/views/ContactPhoneAudits.vue",
  "getAdminCommunicationRoleLabel",
);
assertContains(
  "admin-vue/src/views/RTCCallAudits.vue",
  "extractRTCCallAuditPage",
);
assertContains(
  "admin-vue/src/views/RTCCallAudits.vue",
  "createAdminRTCCallReviewAction",
);
assertContains(
  "admin-vue/src/views/RTCCallAudits.vue",
  "mergeAdminRTCCallAuditRecords",
);
assertContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "extractRTCCallAuditPage",
);
assertContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "getAdminRTCCallStatusLabel",
);
assertContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "createAdminRTCCallAuditSummary",
);
assertContains("admin-vue/src/views/Login.vue", "extractEnvelopeData(data)");
assertContains(
  "admin-vue/src/views/ShopManageDetail.vue",
  "extractShopReviewPage",
);
assertContains(
  "admin-vue/src/views/ShopManageDetail.vue",
  "createAdminShopBasicFormState",
);
assertContains(
  "admin-vue/src/views/ShopManageDetail.vue",
  "buildAdminShopReviewPayload",
);
assertNotContains(
  "admin-vue/src/views/ShopManageDetail.vue",
  "./shopManageDetailHelpers",
);
assertContains(
  "admin-vue/src/views/ridersReviewActionHelpers.js",
  "extractRiderReviewPage",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "extractPaymentCallbackPage",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "buildWithdrawReviewPayload",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "buildBankPayoutCompletePayload",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "formatAdminWalletOperationActor",
);
assertNotContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "function canReplayPaymentCallback(row)",
);
assertNotContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "function canWithdrawAction(row, action)",
);
assertNotContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "function isWithdrawGatewaySubmitted(row)",
);
assertNotContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "resetBankPayoutForm",
);
assertContains(
  "admin-vue/src/views/BlankPage.vue",
  "extractWithdrawRequestPage",
);
assertContains(
  "admin-vue/src/views/NotificationEditorPage.vue",
  "extractUploadAsset",
);
assertContains("admin-vue/src/views/MerchantProfile.vue", "extractUploadAsset");
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "createAdminMerchantEditFormState",
);
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "validateAdminMerchantLicenseFile",
);
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "extractMerchantShopPage",
);
assertNotContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "const MAX_LICENSE_FILE_SIZE",
);
assertContains("admin-vue/src/views/settingsHelpers.js", "extractUploadAsset");
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/HomeEntrySettings.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/HomeEntrySettings.vue",
  "buildAdminHomeEntryPreviewEntries",
);
assertContains(
  "admin-vue/src/views/HomeEntrySettings.vue",
  "validateAdminHomeEntries",
);
assertNotContains(
  "admin-vue/src/views/HomeEntrySettings.vue",
  "function createEntry(source = {})",
);
assertNotContains(
  "admin-vue/src/views/ContactPhoneAudits.vue",
  "function roleLabel(role)",
);
assertNotContains(
  "admin-vue/src/views/RTCCallAudits.vue",
  "function statusLabel(value)",
);
assertNotContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "function statusLabel(value)",
);
assertContains(
  "admin-vue/src/views/MerchantTaxonomySettings.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/RiderRankSettings.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "createDiningBuddyRuntimeForm",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "buildDiningBuddyRuntimePayload",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "buildDiningBuddyPartyListQuery",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "buildDiningBuddyReportActionPayload",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "buildDiningBuddyRestrictionPayload",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "DINING_BUDDY_PARTY_STATUS_OPTIONS",
);
assertNotContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "function createRuntimeForm(source = {})",
);
assertNotContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "function createSensitiveForm(source = {})",
);
assertNotContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "function createRestrictionForm(source = {})",
);
assertContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "extractAdminManagementPage(data).items",
);
assertContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "createAdminManagementFormState",
);
assertContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "buildAdminManagementPayload",
);
assertContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "ADMIN_MANAGEMENT_ROLE_OPTIONS",
);
assertContains(
  "admin-vue/src/views/OfficialNotifications.vue",
  "extractAdminNotificationPage(data).items",
);
assertContains(
  "admin-vue/src/views/OfficialNotificationsPage.vue",
  "extractAdminNotificationPage(data).items",
);
assertContains(
  "admin-vue/src/views/OperationsCenter.vue",
  "extractOperationsCooperationPage(data).items",
);
assertContains(
  "admin-vue/src/views/ContentSettings.vue",
  "extractAdminCarouselPage(data).items",
);
assertContains(
  "admin-vue/src/views/ShopMenuManage.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "extractMerchantShopPage(data)",
);
assertContains(
  "admin-vue/src/views/chatConsoleApi.js",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/chatConsoleApi.js",
  "extractPaginatedItems(data, { listKeys: ['messages', 'items', 'records', 'list'] }).items",
);
assertContains(
  "admin-vue/src/views/RiderRanks.vue",
  "extractDashboardRankItems(data)",
);
assertContains("admin-vue/src/views/Orders.vue", "extractAdminOrderPage(data)");
assertContains("admin-vue/src/views/Orders.vue", "buildAdminOrderDetail(row)");
assertContains(
  "admin-vue/src/views/Dashboard.vue",
  "extractDashboardRankItems(weekUserRes.value?.data)",
);
assertContains(
  "admin-vue/src/views/AfterSales.vue",
  "extractAfterSalesPage(data)",
);
assertContains(
  "admin-vue/src/views/DiningBuddyGovernance.vue",
  "extractPaginatedItems(data, { listKeys: ['parties', 'items'] }).items",
);
assertContains(
  "admin-vue/src/views/NotificationPreviewPage.vue",
  "extractEnvelopeData(data) || {}",
);
assertContains(
  "admin-vue/src/views/settingsActionHelpers.js",
  "extractErrorMessage(error, '未知错误')",
);
assertContains(
  "admin-vue/src/views/TransactionLogs.vue",
  "extractFinancialTransactionLogPage(res.data)",
);
assertContains(
  "admin-vue/src/views/Merchants.vue",
  "extractMerchantShopPage(shopsRes.data)",
);
assertContains(
  "admin-vue/src/views/useChatConsole.js",
  "extractUploadAsset(data)",
);
assertContains(
  "admin-vue/src/views/useChatConsole.js",
  "createIncomingDisplayMessage",
);
assertContains(
  "admin-vue/src/views/useChatConsole.js",
  "from '@infinitech/admin-core'",
);
assertNotContains(
  "admin-vue/src/views/useChatConsole.js",
  "./chatConsoleHelpers",
);
assertContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "extractAdminHomeCampaignPage(data).items",
);
assertContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "createAdminHomeCampaignForm",
);
assertContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "buildAdminHomeCampaignPayload(form)",
);
assertContains(
  "admin-vue/src/utils/platform-settings.js",
  "extractEnvelopeData(data) || {}",
);
assertContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "searchAdminRTCTargets(searchForm.keyword)",
);
assertContains(
  "admin-vue/src/views/SystemLogs.vue",
  "extractSystemLogPage(payload)",
);
assertContains(
  "admin-vue/src/utils/adminRtc.js",
  "extractPaginatedItems(payload, {",
);
assertContains(
  "packages/admin-core/src/system-log-resources.js",
  "export function extractSystemLogPage(payload = {})",
);
assertContains(
  "packages/admin-core/src/paginated-resources.js",
  "export function extractAfterSalesPage(payload = {})",
);
assertContains(
  "packages/admin-core/src/paginated-resources.js",
  "export function extractFinancialTransactionLogPage(payload = {})",
);
assertContains(
  "admin-vue/src/utils/officialSiteApi.js",
  "extractOfficialSiteRecordCollection",
);
assertContains(
  "admin-vue/src/utils/officialSiteApi.js",
  "export const extractErrorMessage = extractContractErrorMessage",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "buildPublicApiPayload(apiForm)",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "resolvePublicApiPermissionSelection(",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "normalizePublicApiList(payload)",
);
assertNotContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "function normalizePermissionList(value)",
);
assertNotContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "function normalizeApiRecord(item = {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "buildSharedServiceSettingsPayload",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "@infinitech/admin-core",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "mergeWechatLoginConfig(extractEnvelopeData(wechatLoginResp.value.data) || {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "mergeServiceSettings(extractEnvelopeData(serviceResp.value.data) || {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "sms.value = normalizeSMSConfig(extractEnvelopeData(smsResp.value.data) || {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "mergeVIPSettings(extractEnvelopeData(vipResp.value.data) || {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "buildNextRiderReportReasons(",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "buildNextVIPBenefits(",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "buildNextCharityLeaderboardItems(",
);
assertNotContains(
  "admin-vue/src/views/settingsHelpers.js",
  "charitySettings.value.leaderboard.push(createEmptyCharityLeaderboardItem())",
);
assertNotContains(
  "admin-vue/src/views/settingsHelpers.js",
  "vipSettings.value.levels.push(createEmptyVIPLevel())",
);
assertNotContains(
  "admin-vue/src/views/settingsHelpers.js",
  "const reasons = normalizeServiceStringList(serviceSettings.value.rider_exception_report_reasons, [], 20);",
);
assertContains(
  "admin-vue/src/views/Dashboard.vue",
  "const payload = extractEnvelopeData(data) || {}",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "const payload = extractEnvelopeData(res.data) || {};",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "const payload = extractEnvelopeData(res.data) || res.data || {};",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "buildFinanceCenterParams",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "createFinanceWalletActionForm",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "buildFinanceDeductPayload",
);
assertContains(
  "admin-vue/src/views/settingsHelpers/sms.js",
  "normalizeSMSConfig(extractEnvelopeData(res.data) || {})",
);
assertContains(
  "admin-vue/src/views/settingsHelpers/weather.js",
  "buildWeatherConfigPayload(weather.value)",
);
assertContains(
  "admin-vue/src/views/settingsHelpers/weather.js",
  "mergeWeatherConfig(extractEnvelopeData(res.data) || {})",
);
assertContains(
  "admin-vue/src/utils/notificationSound.js",
  "normalizeSoundRuntime(extractEnvelopeData(data) || data || {})",
);
assertContains(
  "admin-vue/src/views/Dashboard.vue",
  "weatherData.value = extractEnvelopeData(data) || data || { available: false }",
);
assertContains(
  "admin-vue/src/views/dataManagementHelpers.js",
  "buildDataManagementSummaryCards(exportSummary.value, summaryLoaded.value)",
);
assertContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "DATA_MANAGEMENT_BUSINESS_TYPES.map(async (item) => [",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "buildWeatherConfigPayload(weather.value)",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "createPublicApiFormState()",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "resolvePublicApiPermissionSelection(",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "normalizePublicApiList(payload)",
);
assertContains(
  "admin-vue/src/views/smsConfigHelpers.js",
  "@infinitech/admin-core",
);
assertContains(
  "admin-vue/src/views/vipSettingsHelpers.js",
  "@infinitech/admin-core",
);
assertContains(
  "scripts/push-delivery-drill.mjs",
  "extractPaginatedItems(deliveriesResponse.data).items",
);
assertContains(
  "scripts/push-delivery-drill.mjs",
  "const payload = extractEnvelopeData(stats);",
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  'assetFields: ["ios_url", "android_url", "mini_program_qr_url"]',
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  'assetFields: ["imageUrl", "image_url", "url", "asset_url"]',
);
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "await request.delete(`/api/riders/${rider.id}`);",
);
assertContains(
  "admin-vue/src/views/dashboardHelpers.js",
  "export { extractErrorMessage } from '@infinitech/contracts'",
);
assertNotContains(
  "admin-vue/src/views/ContentSettings.vue",
  "function extractErrorMessage(error, fallback)",
);
assertNotContains(
  "admin-vue/src/views/OperationsCenter.vue",
  "function extractErrorMessage(error, fallback)",
);
assertNotContains(
  "admin-vue/src/views/ApiPermissions.vue",
  "function extractErrorMessage(error, fallback)",
);
assertContains(
  "admin-vue/src/views/ApiPermissions.vue",
  "buildPublicApiSummary(apiList.value)",
);
assertContains(
  "admin-vue/src/views/ApiPermissions.vue",
  "normalizePublicApiPermissionList(row.permissions)",
);
assertContains(
  "admin-vue/src/views/ApiPermissions.vue",
  "PUBLIC_API_PERMISSION_OPTIONS",
);
assertNotContains(
  "admin-vue/src/views/ApiPermissions.vue",
  "function normalizePermissions(value)",
);
assertNotContains(
  "admin-vue/src/views/settingsHelpers.js",
  "function extractErrorMessage(error, fallback)",
);
assertNotContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "function extractErrorMessage(error, fallback)",
);
assertNotContains(
  "admin-vue/src/views/ShopMenuManage.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/utils/officialSiteApi.js",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "function createEmptyForm()",
);
assertNotContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "function buildPayload()",
);
assertNotContains(
  "admin-vue/src/views/HomeCampaigns.vue",
  "function formatStatus(status)",
);
assertNotContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "function resolveRoleLabel(type)",
);
assertNotContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "function formatTime(raw)",
);
assertNotContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "extractPaginatedItems(data",
);
assertNotContains(
  "admin-vue/src/views/SystemLogs.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/AfterSales.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/TransactionLogs.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/NotificationPreviewPage.vue",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/settingsActionHelpers.js",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/dataManagementHelpers.js",
  "error?.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "error?.response?.data?.error",
);
assertContains(
  "admin-vue/src/views/couponManagementHelpers.js",
  "extractPaginatedItems(data)",
);
assertContains(
  "admin-vue/src/views/couponManagementHelpers.js",
  "buildCouponAdminListParams(filters)",
);
assertContains(
  "admin-vue/src/views/couponManagementHelpers.js",
  "validateCouponCreateDraft(createForm)",
);
assertContains(
  "admin-vue/src/views/CouponLanding.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/CouponLanding.vue",
  "formatCouponDisplayAmount(coupon.value)",
);
assertContains(
  "admin-vue/src/views/CouponLanding.vue",
  "getCouponClaimBlockedText(coupon.value)",
);
assertContains(
  "admin-vue/src/views/ApiDocumentation.vue",
  "@infinitech/admin-core",
);
assertContains(
  "admin-vue/src/views/ApiDocumentation.vue",
  "buildApiDocumentationQuickStartCurl(apiBaseUrl.value)",
);
assertContains(
  "admin-vue/src/views/ApiDocumentation.vue",
  "buildApiDocumentationRequestExamples(apiBaseUrl.value)",
);
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "@infinitech/domain-core",
);
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "validateOnboardingInviteSubmission(inviteType.value, form)",
);
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "buildOnboardingInviteSubmitPayload(inviteType.value, form)",
);
assertContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "@infinitech/domain-core",
);
assertContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "validateErrandSettings(form)",
);
assertContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "buildErrandSettingsPayload(form)",
);
assertContains(
  "user-vue/pages/errand/home/index.vue",
  "buildErrandHomeViewModel(runtime.errandSettings || {})",
);
assertContains(
  "app-mobile/pages/errand/home/index.vue",
  "buildErrandHomeViewModel(runtime.errandSettings || {})",
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./vip-center.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./profile-points-mall.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./profile-outreach.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./medicine-home.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./medicine-order.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./mobile-client-context.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./charity-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./auth-portal.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./home-index.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./search-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./message-center.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./notification-detail.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-after-sales.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-coupon.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-support-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./profile-edit.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./profile-home.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-after-sales-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-confirm-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-contact.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-coupon-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-detail-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-list-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./order-payment-options.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./phone-contact.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./profile-settings.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./rtc-call-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./wallet-overview-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./wallet-bills-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./wallet-recharge-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./wallet-withdraw-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./dining-buddy.js";',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./mobile-client-context": "./src/mobile-client-context.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./medicine-order": "./src/medicine-order.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./rtc-call-page": "./src/rtc-call-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./wallet-overview-page": "./src/wallet-overview-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./wallet-bills-page": "./src/wallet-bills-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./wallet-recharge-page": "./src/wallet-recharge-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./wallet-withdraw-page": "./src/wallet-withdraw-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./dining-buddy": "./src/dining-buddy.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./medicine-home": "./src/medicine-home.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./search-page": "./src/search-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./message-center": "./src/message-center.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./notification-detail": "./src/notification-detail.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-after-sales": "./src/order-after-sales.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-after-sales-pages": "./src/order-after-sales-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-confirm-page": "./src/order-confirm-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-contact": "./src/order-contact.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-coupon": "./src/order-coupon.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-coupon-page": "./src/order-coupon-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-detail-page": "./src/order-detail-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-list-page": "./src/order-list-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-payment-options": "./src/order-payment-options.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./order-support-pages": "./src/order-support-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./phone-contact": "./src/phone-contact.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./profile-edit": "./src/profile-edit.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./profile-home": "./src/profile-home.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./profile-outreach": "./src/profile-outreach.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./profile-points-mall": "./src/profile-points-mall.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./profile-settings": "./src/profile-settings.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./vip-center": "./src/vip-center.js"',
);
assertContains(
  "user-vue/pages/profile/vip-center/vip-data.js",
  "packages/mobile-core/src/vip-center.js",
);
assertContains(
  "app-mobile/pages/profile/vip-center/vip-data.js",
  "packages/mobile-core/src/vip-center.js",
);
assertContains(
  "user-vue/pages/profile/vip-center/page-options.js",
  "../../../../packages/mobile-core/src/vip-center.js",
);
assertContains(
  "app-mobile/pages/profile/vip-center/page-options.js",
  "../../../../packages/mobile-core/src/vip-center.js",
);
assertContains(
  "user-vue/pages/profile/points-mall/index.vue",
  "../../../../packages/mobile-core/src/profile-points-mall.js",
);
assertContains(
  "app-mobile/pages/profile/points-mall/index.vue",
  "../../../../packages/mobile-core/src/profile-points-mall.js",
);
assertContains(
  "user-vue/pages/profile/cooperation/index.vue",
  "../../../../packages/mobile-core/src/profile-outreach.js",
);
assertContains(
  "app-mobile/pages/profile/cooperation/index.vue",
  "../../../../packages/mobile-core/src/profile-outreach.js",
);
assertContains(
  "user-vue/pages/profile/invite-friends/index.vue",
  "../../../../packages/mobile-core/src/profile-outreach.js",
);
assertContains(
  "app-mobile/pages/profile/invite-friends/index.vue",
  "../../../../packages/mobile-core/src/profile-outreach.js",
);
assertContains(
  "user-vue/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "app-mobile/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "user-vue/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "app-mobile/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/notification-detail.js",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/notification-detail.js",
);
assertContains(
  "user-vue/shared-ui/feature-runtime.js",
  "../../packages/mobile-core/src/mobile-client-context.js",
);
assertContains(
  "app-mobile/shared-ui/feature-runtime.js",
  "../../packages/mobile-core/src/mobile-client-context.js",
);
assertContains(
  "user-vue/pages/errand/home/index.vue",
  "../../../../packages/mobile-core/src/mobile-client-context.js",
);
assertContains(
  "app-mobile/pages/errand/home/index.vue",
  "../../../../packages/mobile-core/src/mobile-client-context.js",
);
assertContains(
  "user-vue/pages/dining-buddy/index.vue",
  "../../../packages/mobile-core/src/dining-buddy.js",
);
assertContains(
  "app-mobile/pages/dining-buddy/index.vue",
  "../../../packages/mobile-core/src/dining-buddy.js",
);
assertContains(
  "user-vue/pages/medicine/order.vue",
  "../../../packages/mobile-core/src/medicine-order.js",
);
assertContains(
  "app-mobile/pages/medicine/order.vue",
  "../../../packages/mobile-core/src/medicine-order.js",
);
assertContains(
  "user-vue/pages/medicine/tracking.vue",
  "../../../packages/mobile-core/src/medicine-order.js",
);
assertContains(
  "app-mobile/pages/medicine/tracking.vue",
  "../../../packages/mobile-core/src/medicine-order.js",
);
assertContains(
  "user-vue/pages/medicine/home.vue",
  "../../../packages/mobile-core/src/phone-contact.js",
);
assertContains(
  "app-mobile/pages/medicine/home.vue",
  "../../../packages/mobile-core/src/phone-contact.js",
);
assertContains(
  "user-vue/pages/shop/detail/shop-detail-logic.js",
  "../../../../packages/mobile-core/src/phone-contact.js",
);
assertContains(
  "app-mobile/pages/shop/detail/shop-detail-logic.js",
  "../../../../packages/mobile-core/src/phone-contact.js",
);
assertContains(
  "user-vue/pages/medicine/home.vue",
  "normalizeMedicineRuntimeSettings(response)",
);
assertContains(
  "app-mobile/pages/medicine/home.vue",
  "normalizeMedicineRuntimeSettings(response)",
);
assertContains(
  "user-vue/pages/charity/index.vue",
  "packages/mobile-core/src/charity-page.js",
);
assertContains(
  "app-mobile/pages/charity/index.vue",
  "packages/mobile-core/src/charity-page.js",
);
assertContains(
  "user-vue/pages/charity/index.vue",
  "buildCharityLeaderboardToShow(",
);
assertContains(
  "app-mobile/pages/charity/index.vue",
  "buildCharityLeaderboardToShow(",
);
assertContains(
  "user-vue/pages/charity/index.vue",
  "normalizeCharityJoinUrl(url)",
);
assertContains(
  "app-mobile/pages/charity/index.vue",
  "normalizeCharityJoinUrl(url)",
);
[
  "user-vue/pages/auth/reset-password/index.vue",
  "app-mobile/pages/auth/reset-password/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "validatePhone() {");
  assertNotContains(relativePath, "requestSMSCode(phone, 'reset')");
});
[
  "user-vue/pages/auth/set-password/index.vue",
  "app-mobile/pages/auth/set-password/index.vue",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    "const resetData = uni.getStorageSync('reset_password_data')",
  );
  assertNotContains(relativePath, "url: '/api/set-new-password'");
});
[
  "user-vue/pages/search/index/index.vue",
  "app-mobile/pages/search/index/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const HISTORY_KEY = 'searchHistory'");
  assertNotContains(relativePath, "function normalizeShopList(response) {");
});
[
  "user-vue/pages/auth/login/index.vue",
  "app-mobile/pages/auth/login/index.vue",
  "user-vue/pages/auth/register/index.vue",
  "app-mobile/pages/auth/register/index.vue",
  "user-vue/pages/auth/wechat-callback/index.vue",
  "app-mobile/pages/auth/wechat-callback/index.vue",
].forEach((relativePath) => {
  assertContains(relativePath, "packages/mobile-core/src/auth-portal.js");
});
assertContains(
  "user-vue/pages/auth/login/index.vue",
  "buildConsumerWechatStartUrl(",
);
assertContains(
  "app-mobile/pages/auth/login/index.vue",
  "buildConsumerWechatStartUrl(",
);
assertContains(
  "user-vue/pages/auth/register/index.vue",
  "normalizeConsumerInviteCode(",
);
assertContains(
  "app-mobile/pages/auth/register/index.vue",
  "normalizeConsumerInviteCode(",
);
assertContains(
  "user-vue/pages/auth/wechat-callback/index.vue",
  "buildConsumerAuthUserProfile(result.user)",
);
assertContains(
  "app-mobile/pages/auth/wechat-callback/index.vue",
  "buildConsumerAuthUserProfile(result.user)",
);
assertContains(
  "user-vue/pages/index/index.vue",
  "../../../packages/mobile-core/src/home-index.js",
);
assertContains(
  "app-mobile/pages/index/index.vue",
  "../../../packages/mobile-core/src/home-index.js",
);
assertContains("user-vue/pages/index/index.vue", "createHomeIndexPage({");
assertContains("app-mobile/pages/index/index.vue", "createHomeIndexPage({");
assertContains(
  "user-vue/pages/order/coupon/index.vue",
  "../../../../packages/mobile-core/src/order-coupon-page.js",
);
assertContains(
  "app-mobile/pages/order/coupon/index.vue",
  "../../../../packages/mobile-core/src/order-coupon-page.js",
);
assertContains(
  "user-vue/pages/order/coupon/index.vue",
  "createOrderCouponPage({",
);
assertContains(
  "app-mobile/pages/order/coupon/index.vue",
  "createOrderCouponPage({",
);
assertContains(
  "packages/mobile-core/src/order-confirm-page.js",
  "extractConsumerAvailableOrderCoupons(response)",
);
assertContains(
  "packages/mobile-core/src/order-confirm-page.js",
  "resolveConsumerOrderCouponUserId(profile)",
);
assertContains(
  "user-vue/pages/order/remark/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "app-mobile/pages/order/remark/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "user-vue/pages/order/remark/index.vue",
  "createOrderRemarkPage({",
);
assertContains(
  "app-mobile/pages/order/remark/index.vue",
  "createOrderRemarkPage({",
);
assertContains(
  "user-vue/pages/rtc/call/index.vue",
  "../../../../packages/mobile-core/src/rtc-call-page.js",
);
assertContains(
  "app-mobile/pages/rtc/call/index.vue",
  "../../../../packages/mobile-core/src/rtc-call-page.js",
);
assertContains("user-vue/pages/rtc/call/index.vue", "createRTCCallPage({");
assertContains("app-mobile/pages/rtc/call/index.vue", "createRTCCallPage({");
assertContains(
  "user-vue/pages/order/tableware/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "app-mobile/pages/order/tableware/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "user-vue/pages/order/tableware/index.vue",
  "createOrderTablewarePage({",
);
assertContains(
  "app-mobile/pages/order/tableware/index.vue",
  "createOrderTablewarePage({",
);
assertContains(
  "user-vue/pages/pay/success/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "app-mobile/pages/pay/success/index.vue",
  "../../../../packages/mobile-core/src/order-support-pages.js",
);
assertContains(
  "user-vue/pages/pay/success/index.vue",
  "createOrderPaySuccessPage()",
);
assertContains(
  "app-mobile/pages/pay/success/index.vue",
  "createOrderPaySuccessPage()",
);
assertContains(
  "user-vue/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "app-mobile/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "user-vue/pages/message/index/index.vue",
  "createMessageCenterPage({",
);
assertContains(
  "app-mobile/pages/message/index/index.vue",
  "createMessageCenterPage({",
);
assertContains(
  "user-vue/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "app-mobile/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/message-center.js",
);
assertContains(
  "user-vue/pages/message/notification-list/index.vue",
  "createNotificationListPage({",
);
assertContains(
  "app-mobile/pages/message/notification-list/index.vue",
  "createNotificationListPage({",
);
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/notification-detail.js",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/notification-detail.js",
);
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "createNotificationDetailPage({",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "createNotificationDetailPage({",
);
assertContains(
  "user-vue/pages/profile/edit/index.vue",
  "../../../../packages/mobile-core/src/profile-edit.js",
);
assertContains(
  "app-mobile/pages/profile/edit/index.vue",
  "../../../../packages/mobile-core/src/profile-edit.js",
);
assertContains(
  "user-vue/pages/profile/edit/index.vue",
  "createProfileEditPage({",
);
assertContains(
  "app-mobile/pages/profile/edit/index.vue",
  "createProfileEditPage({",
);
assertContains(
  "user-vue/pages/profile/index/index.vue",
  "../../../../packages/mobile-core/src/profile-home.js",
);
assertContains(
  "app-mobile/pages/profile/index/index.vue",
  "../../../../packages/mobile-core/src/profile-home.js",
);
assertContains(
  "user-vue/pages/profile/index/index.vue",
  "createProfileHomePage({",
);
assertContains(
  "app-mobile/pages/profile/index/index.vue",
  "createProfileHomePage({",
);
assertContains(
  "user-vue/pages/profile/settings/index.vue",
  "../../../../../packages/mobile-core/src/profile-settings.js",
);
assertContains(
  "app-mobile/pages/profile/settings/index.vue",
  "../../../../../packages/mobile-core/src/profile-settings.js",
);
assertContains(
  "user-vue/pages/profile/settings/index.vue",
  "createProfileSettingsPage({",
);
assertContains(
  "app-mobile/pages/profile/settings/index.vue",
  "createProfileSettingsPage({",
);
assertContains(
  "user-vue/pages/profile/settings/detail/index.vue",
  "../../../../../../packages/mobile-core/src/profile-settings.js",
);
assertContains(
  "app-mobile/pages/profile/settings/detail/index.vue",
  "../../../../../../packages/mobile-core/src/profile-settings.js",
);
assertContains(
  "user-vue/pages/profile/settings/detail/index.vue",
  "createProfileSettingsDetailPage({",
);
assertContains(
  "app-mobile/pages/profile/settings/detail/index.vue",
  "createProfileSettingsDetailPage({",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "buildApiKeyMarkdownText",
);
assertContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "buildApiDocumentationText",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "extractErrorMessage(error",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "extractEnvelopeData(res.data)",
);
assertNotContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "function buildParams()",
);
assertNotContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "function fmtDate(d)",
);
assertContains("admin-vue/src/views/Login.vue", "extractSMSResult(data)");
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "paymentCallbackStatusTag",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "getWithdrawReviewActionTitle",
);
assertContains(
  "admin-vue/src/views/dataManagementHelpers.js",
  "const payload = extractEnvelopeData(response.data) || {};",
);
assertContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "const payload = extractEnvelopeData(response.data) || {};",
);
assertContains(
  "packages/admin-core/src/index.js",
  'export * from "./data-management-resources.js";',
);
assertContains(
  "packages/admin-core/src/index.js",
  'export * from "./coupon-resources.js";',
);
assertContains(
  "packages/admin-core/src/index.js",
  'export * from "./api-documentation-resources.js";',
);
assertContains(
  "admin-vue/src/views/dataManagementHelpers.js",
  "validateDataManagementImportFile(file)",
);
assertContains(
  "admin-vue/src/views/dataManagementHelpers.js",
  "buildDataManagementImportConfirmMessage(dataType, data.length)",
);
assertContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "isPlatformBackupPayload(allData)",
);
assertContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "DATA_MANAGEMENT_CONFIG_SCOPES.map(async (item) => [",
);
assertContains(
  "admin-vue/src/views/dataManagementRuntimeHelpers.js",
  "extractErrorMessage(error, '未知错误')",
);
assertNotContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "function buildPlatformBackupSummary(allData)",
);
assertNotContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "function formatExportDate()",
);
assertNotContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "function buildErrorMessage(prefix, error)",
);
assertNotContains(
  "admin-vue/src/views/couponManagementHelpers.js",
  "function sourceText(source)",
);
assertNotContains(
  "admin-vue/src/views/couponManagementHelpers.js",
  "function couponRuleText(row)",
);
assertNotContains(
  "admin-vue/src/views/CouponLanding.vue",
  "function formatMoney(value)",
);
assertNotContains(
  "admin-vue/src/views/CouponLanding.vue",
  "function formatDateTime(raw)",
);
assertNotContains(
  "admin-vue/src/views/settingsApiManagementHelpers.js",
  "./settingsDocBuilders",
);
assertNotContains(
  "admin-vue/src/views/ApiDocumentation.vue",
  "const permissionRows = [",
);
assertNotContains(
  "admin-vue/src/views/ApiDocumentation.vue",
  "function buildMarkdown()",
);
assertNotContains(
  "admin-vue/src/views/InviteLanding.vue",
  "function validatePhone(phone)",
);
assertNotContains(
  "admin-vue/src/views/InviteLanding.vue",
  "function formatDateTime(value)",
);
assertNotContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "function createService(source = {})",
);
assertNotContains(
  "admin-vue/src/views/ErrandSettings.vue",
  "function validateServices()",
);
assertNotContains("user-vue/pages/errand/home/index.vue", "const routes = {");
assertNotContains("app-mobile/pages/errand/home/index.vue", "const routes = {");
assertNotContains(
  "user-vue/pages/profile/vip-center/page-options.js",
  "function mapRewardList(list = [])",
);
assertNotContains(
  "app-mobile/pages/profile/vip-center/page-options.js",
  "function mapRewardList(list = [])",
);
assertNotContains(
  "user-vue/pages/profile/vip-center/page-options.js",
  "const EMPTY_LEVEL = {",
);
assertNotContains(
  "app-mobile/pages/profile/vip-center/page-options.js",
  "const EMPTY_LEVEL = {",
);
assertNotContains(
  "user-vue/pages/medicine/home.vue",
  "function normalizeRuntimeSettings(raw)",
);
assertNotContains(
  "app-mobile/pages/medicine/home.vue",
  "function normalizeRuntimeSettings(raw)",
);
assertNotContains(
  "user-vue/pages/charity/index.vue",
  "const DEFAULT_SETTINGS = {",
);
assertNotContains(
  "app-mobile/pages/charity/index.vue",
  "const DEFAULT_SETTINGS = {",
);
assertNotContains(
  "user-vue/pages/charity/index.vue",
  "function normalizeSettings(payload = {})",
);
assertNotContains(
  "app-mobile/pages/charity/index.vue",
  "function normalizeSettings(payload = {})",
);
assertNotContains(
  "user-vue/pages/charity/index.vue",
  "function normalizeText(value, fallback = '')",
);
assertNotContains(
  "app-mobile/pages/charity/index.vue",
  "function normalizeText(value, fallback = '')",
);
assertNotContains(
  "user-vue/pages/dining-buddy/index.vue",
  "const QUIZ_STORAGE_KEY =",
);
assertNotContains(
  "app-mobile/pages/dining-buddy/index.vue",
  "const QUIZ_STORAGE_KEY =",
);
[
  "user-vue/pages/auth/login/index.vue",
  "app-mobile/pages/auth/login/index.vue",
  "user-vue/pages/auth/register/index.vue",
  "app-mobile/pages/auth/register/index.vue",
  "user-vue/pages/auth/wechat-callback/index.vue",
  "app-mobile/pages/auth/wechat-callback/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "function trimValue(value) {");
  assertNotContains(relativePath, "function encodeQuery(params = {}) {");
  assertNotContains(relativePath, "function buildPageUrl(path, params = {}) {");
});
assertNotContains(
  "user-vue/pages/index/index.vue",
  "function normalizeSelectedAddress(value) {",
);
assertNotContains(
  "app-mobile/pages/index/index.vue",
  "function normalizeSelectedAddress(value) {",
);
assertNotContains("user-vue/pages/index/index.vue", "const featureRoutes = {");
assertNotContains(
  "app-mobile/pages/index/index.vue",
  "const featureRoutes = {",
);
[
  "user-vue/pages/order/coupon/index.vue",
  "app-mobile/pages/order/coupon/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "function formatDiscountLabel(amount) {");
  assertNotContains(relativePath, "extractEnvelopeData(res)");
  assertNotContains(
    relativePath,
    "const userId = profile.phone || profile.id || profile.userId",
  );
});
[
  "user-vue/pages/order/refund/index.vue",
  "app-mobile/pages/order/refund/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "normalizeBizType(bizType) {");
  assertNotContains(relativePath, "formatOrderData(data) {");
});
[
  "user-vue/pages/order/review/index.vue",
  "app-mobile/pages/order/review/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "formatOrderData(data) {");
  assertNotContains(relativePath, "const shop = data.shop || {}");
});
[
  "user-vue/pages/medicine/order.vue",
  "app-mobile/pages/medicine/order.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const DEFAULT_ADDRESS = '请选择送药地址'");
  assertNotContains(relativePath, "buildErrandOrderPayload(");
});
[
  "user-vue/pages/medicine/tracking.vue",
  "app-mobile/pages/medicine/tracking.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const TEXTS = {");
  assertNotContains(relativePath, "createPhoneContactHelper");
});
[
  "user-vue/pages/index/index.vue",
  "app-mobile/pages/index/index.vue",
  "user-vue/pages/dining-buddy/index.vue",
  "app-mobile/pages/dining-buddy/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "clientId: '");
});
[
  "user-vue/pages/order/confirm/index.vue",
  "app-mobile/pages/order/confirm/index.vue",
  "user-vue/pages/order/detail/page-logic.js",
  "app-mobile/pages/order/detail/page-logic.js",
].forEach((relativePath) => {
  assertNotContains(relativePath, "platform: '");
});
[
  "user-vue/pages/profile/wallet/recharge/index.vue",
  "app-mobile/pages/profile/wallet/recharge/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "clientPaymentPlatform: '");
  assertNotContains(relativePath, "idempotencyKeyPrefix: 'customer_");
});
[
  "user-vue/pages/profile/wallet/withdraw/index.vue",
  "app-mobile/pages/profile/wallet/withdraw/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "idempotencyKeyPrefix: 'customer_");
});
[
  "user-vue/pages/shop/detail/index.vue",
  "app-mobile/pages/shop/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    `:style="{ color: isCollected ? '#f59e0b' : '#fff' }"`,
  );
});
[
  "user-vue/pages/shop/detail/shop-detail-logic.js",
  "app-mobile/pages/shop/detail/shop-detail-logic.js",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    "title: (err && err.error) || (err && err.data && err.data.error) || '领取失败'",
  );
  assertNotContains(
    relativePath,
    "title: (error && error.error) || '操作失败'",
  );
});
assertNotContains(
  "packages/mobile-core/src/order-confirm-page.js",
  "const userId = profile.phone || profile.id || profile.userId",
);
assertNotContains(
  "packages/mobile-core/src/order-confirm-page.js",
  "this.availableCoupons = res && Array.isArray(res.data) ? res.data : []",
);
[
  "user-vue/pages/order/remark/index.vue",
  "app-mobile/pages/order/remark/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "remark: useUserOrderStore().state.remark");
  assertNotContains(relativePath, "saveRemark()");
});
[
  "user-vue/pages/order/tableware/index.vue",
  "app-mobile/pages/order/tableware/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "options: [");
  assertNotContains(relativePath, "setTableware(v)");
});
[
  "user-vue/pages/pay/success/index.vue",
  "app-mobile/pages/pay/success/index.vue",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    "uni.switchTab({ url: '/pages/order/list/index' })",
  );
  assertNotContains(
    relativePath,
    "uni.switchTab({ url: '/pages/index/index' })",
  );
});
[
  "user-vue/pages/message/index/index.vue",
  "app-mobile/pages/message/index/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const SESSION_VISIBLE_MAX_AGE =");
  assertNotContains(relativePath, "const UI_TEXT = {");
  assertNotContains(relativePath, "normalizeSession(item = {})");
});
[
  "user-vue/pages/message/notification-list/index.vue",
  "app-mobile/pages/message/notification-list/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const NOTIFICATION_READ_EVENT =");
  assertNotContains(relativePath, "async loadNotifications()");
  assertNotContains(relativePath, "handleNotificationRead(payload = {})");
});
[
  "user-vue/pages/message/notification-detail/index.vue",
  "app-mobile/pages/message/notification-detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const NOTIFICATION_READ_EVENT =");
  assertNotContains(relativePath, "async ackPushOpened(messageId)");
  assertNotContains(relativePath, "async markAsRead(id)");
});
[
  "user-vue/pages/profile/edit/index.vue",
  "app-mobile/pages/profile/edit/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "presetBg: [");
  assertNotContains(relativePath, "normalizeUserPayload(payload)");
  assertNotContains(relativePath, "async uploadImage(filePath, loadingText)");
});
[
  "user-vue/pages/profile/index/index.vue",
  "app-mobile/pages/profile/index/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const DEFAULT_TOOLS = [");
  assertNotContains(relativePath, "const DEFAULT_MORE_ENTRIES = [");
  assertNotContains(relativePath, "normalizeUserPayload(payload)");
});
[
  "user-vue/pages/profile/settings/index.vue",
  "app-mobile/pages/profile/settings/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const SETTINGS_STORAGE_KEY = 'appSettings'");
  assertNotContains(relativePath, "const DEFAULT_SETTINGS = {");
  assertNotContains(relativePath, "phoneMasked()");
});
[
  "user-vue/pages/profile/settings/detail/index.vue",
  "app-mobile/pages/profile/settings/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const SETTINGS_STORAGE_KEY = 'appSettings'");
  assertNotContains(relativePath, "const DEFAULT_SETTINGS = {");
  assertNotContains(relativePath, "calculateCacheSize()");
});
assertNotContains("admin-vue/src/views/Users.vue", "e.response?.data?.error");
assertNotContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "e.response?.data?.error",
);
assertNotContains(
  "admin-vue/src/views/FeaturedProducts.vue",
  "e.response?.data?.error",
);
assertNotContains("admin-vue/src/views/Orders.vue", "e.response?.data?.error");
assertNotContains(
  "admin-vue/src/views/MerchantDetail.vue",
  "e.response?.data?.error",
);
assertContains(
  "backend/go/internal/handler/shop_handler.go",
  'respondShopPaginated(c, "店铺评论加载成功", "list"',
);
assertContains(
  "backend/go/internal/handler/auth_handler.go",
  'respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "登录成功"), result)',
);
assertContains(
  "backend/go/internal/handler/auth_handler_wechat.go",
  'respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "微信登录会话加载成功"), result)',
);
assertContains(
  "backend/go/internal/handler/captcha_handler.go",
  'respondCaptchaInvalidRequest(c, "sessionId is required")',
);
assertNotContains("backend/go/internal/handler/rider_handler.go", "c.JSON(");
assertContains(
  "backend/go/internal/handler/rider_handler.go",
  'respondRiderMirroredSuccess(c, "骑手资料加载成功", payload)',
);
assertContains(
  "backend/go/internal/handler/rider_handler.go",
  'respondRiderMirroredSuccess(c, "骑手在线状态更新成功", gin.H{',
);
assertContains(
  "backend/go/internal/service/auth_service.go",
  'RefreshToken string                 `json:"refreshToken,omitempty"`',
);
assertContains(
  "backend/go/internal/service/auth_service.go",
  'ExpiresIn    int64                  `json:"expiresIn,omitempty"`',
);
assertContains(
  "backend/go/internal/handler/shop_handler.go",
  'respondShopPaginated(c, "商户店铺列表加载成功", "shops"',
);
assertContains(
  "backend/go/internal/handler/rider_handler.go",
  'respondEnvelope(c, http.StatusOK, "RIDER_REVIEW_LISTED"',
);
assertNotContains(
  "socket-server/index.js",
  "origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*'",
);
assertContains(
  "socket-server/index.js",
  "ALLOWED_ORIGINS is required for socket-server in production-like environments",
);
assertContains(
  "socket-server/index.js",
  "Socket server public upload hosting is disabled. Use authenticated API asset routes instead.",
);
assertContains("socket-server/index.js", "buildSuccessEnvelopePayload");
assertContains("socket-server/index.js", "buildErrorEnvelopePayload");
assertContains(
  "backend/bff/src/config/index.js",
  "BFF requires BFF_CORS_ORIGINS or explicit ADMIN_WEB_BASE_URL/SITE_WEB_BASE_URL in production-like environments",
);

console.log("modernization baseline checks passed");
