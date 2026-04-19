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

function assertNoLegacyMobileCommonImports(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const queue = [absoluteDir];
  const ignoredDirectories = new Set(["node_modules", "dist", "unpackage"]);
  const allowedExtensions = new Set([".js", ".ts", ".vue", ".mjs", ".cjs"]);

  while (queue.length > 0) {
    const currentDir = queue.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          queue.push(path.join(currentDir, entry.name));
        }
        continue;
      }

      if (!allowedExtensions.has(path.extname(entry.name))) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      const source = fs.readFileSync(absolutePath, "utf8");
      if (source.includes("shared/mobile-common")) {
        const relativePath = path.relative(repoRoot, absolutePath);
        throw new Error(`legacy shared/mobile-common runtime import remains in ${relativePath}`);
      }
    }
  }
}

function assertNoDirectGenerateTokenRequests(relativeDir, allowedRelativePaths = []) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const queue = [absoluteDir];
  const ignoredDirectories = new Set(["node_modules", "dist", "unpackage"]);
  const allowedExtensions = new Set([".js", ".ts", ".vue", ".mjs", ".cjs"]);
  const allowedPaths = new Set(allowedRelativePaths);

  while (queue.length > 0) {
    const currentDir = queue.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          queue.push(path.join(currentDir, entry.name));
        }
        continue;
      }

      if (!allowedExtensions.has(path.extname(entry.name))) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(repoRoot, absolutePath);
      if (allowedPaths.has(relativePath)) {
        continue;
      }

      const source = fs.readFileSync(absolutePath, "utf8");
      if (source.includes("/api/generate-token")) {
        throw new Error(
          `direct socket token requester remains outside shared helper in ${relativePath}`,
        );
      }
    }
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
  "packages/client-sdk/src/error-utils.js",
  "packages/client-sdk/src/error-utils.test.mjs",
  "packages/client-sdk/src/local-db.js",
  "packages/client-sdk/src/local-db.d.ts",
  "packages/client-sdk/src/local-db.test.mjs",
  "packages/client-sdk/src/mobile-config.js",
  "packages/client-sdk/src/mobile-config.d.ts",
  "packages/client-sdk/src/mobile-config.test.mjs",
  "packages/client-sdk/src/mobile-config-shell.js",
  "packages/client-sdk/src/mobile-config-shell.test.mjs",
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
  "packages/client-sdk/src/role-auth-session.js",
  "packages/client-sdk/src/role-auth-session.test.mjs",
  "packages/client-sdk/src/role-auth-shell.js",
  "packages/client-sdk/src/role-auth-shell.test.mjs",
  "packages/client-sdk/src/role-notify-bridges.js",
  "packages/client-sdk/src/role-notify-bridges.d.ts",
  "packages/client-sdk/src/role-notify-bridges.test.mjs",
  "packages/client-sdk/src/role-notify-shell.js",
  "packages/client-sdk/src/role-notify-shell.test.mjs",
  "packages/client-sdk/src/role-push-event-shell.js",
  "packages/client-sdk/src/role-push-event-shell.test.mjs",
  "packages/client-sdk/src/realtime-token.js",
  "packages/client-sdk/src/realtime-token.d.ts",
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
  "packages/client-sdk/src/safe-access.js",
  "packages/client-sdk/src/safe-access.test.mjs",
  "packages/client-sdk/src/socket-io.js",
  "packages/client-sdk/src/socket-io.d.ts",
  "packages/client-sdk/src/socket-io.test.mjs",
  "packages/client-sdk/src/stored-auth-identity.js",
  "packages/client-sdk/src/stored-auth-identity.test.mjs",
  "packages/client-sdk/src/support-socket.js",
  "packages/client-sdk/src/support-socket.d.ts",
  "packages/client-sdk/src/support-socket.test.mjs",
  "packages/client-sdk/src/support-socket-bridge.js",
  "packages/client-sdk/src/support-socket-bridge.d.ts",
  "packages/client-sdk/src/support-socket-bridge.test.mjs",
  "packages/client-sdk/src/support-socket-shell.js",
  "packages/client-sdk/src/support-socket-shell.test.mjs",
  "packages/client-sdk/src/uni-request.js",
  "packages/client-sdk/src/uni-request.test.mjs",
  "packages/admin-core/src/admin-auth-session.js",
  "packages/admin-core/src/admin-auth-session.test.mjs",
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
  "packages/mobile-core/src/MedicineChatPage.vue",
  "packages/mobile-core/src/WelcomeLandingPage.vue",
  "packages/mobile-core/src/vip-center.js",
  "packages/mobile-core/src/vip-center.test.mjs",
  "packages/mobile-core/src/VipCenterPage.vue",
  "packages/mobile-core/src/vip-center-page.scss",
  "packages/mobile-core/src/ShopMenuPage.vue",
  "packages/mobile-core/src/shop-menu-page.scss",
  "packages/mobile-core/src/CharityPage.vue",
  "packages/mobile-core/src/charity-page.scss",
  "packages/mobile-core/src/charity-page.js",
  "packages/mobile-core/src/charity-page.test.mjs",
  "packages/mobile-core/src/DiningBuddyPage.vue",
  "packages/mobile-core/src/dining-buddy-page.scss",
  "packages/mobile-core/src/dining-buddy.js",
  "packages/mobile-core/src/dining-buddy.test.mjs",
  "packages/mobile-core/src/auth-portal.js",
  "packages/mobile-core/src/auth-portal.test.mjs",
  "packages/mobile-core/src/auth-portal-pages.js",
  "packages/mobile-core/src/auth-portal-pages.test.mjs",
  "packages/mobile-core/src/AuthLoginPage.vue",
  "packages/mobile-core/src/auth-login-page.scss",
  "packages/mobile-core/src/AuthRegisterPage.vue",
  "packages/mobile-core/src/auth-register-page.scss",
  "packages/mobile-core/src/AuthResetPasswordPage.vue",
  "packages/mobile-core/src/AuthSetPasswordPage.vue",
  "packages/mobile-core/src/AuthWechatCallbackPage.vue",
  "packages/mobile-core/src/category-pages.js",
  "packages/mobile-core/src/category-pages.test.mjs",
  "packages/mobile-core/src/category-page.scss",
  "packages/mobile-core/src/CategoryListPage.vue",
  "packages/mobile-core/src/CategoryAllPage.vue",
  "packages/mobile-core/src/CategoryBurgerPage.vue",
  "packages/mobile-core/src/CategoryDessertPage.vue",
  "packages/mobile-core/src/CategoryDynamicPage.vue",
  "packages/mobile-core/src/CategoryFoodPage.vue",
  "packages/mobile-core/src/CategoryFruitPage.vue",
  "packages/mobile-core/src/CategoryMarketPage.vue",
  "packages/mobile-core/src/CategoryMedicinePage.vue",
  "packages/mobile-core/src/consumer-errand-pages.js",
  "packages/mobile-core/src/consumer-errand-pages.test.mjs",
  "packages/mobile-core/src/errand-form-pages.scss",
  "packages/mobile-core/src/ErrandBuyPage.vue",
  "packages/mobile-core/src/ErrandDeliverPage.vue",
  "packages/mobile-core/src/ErrandDoPage.vue",
  "packages/mobile-core/src/ErrandPickupPage.vue",
  "packages/mobile-core/src/ErrandDetailPage.vue",
  "packages/mobile-core/src/ErrandLegacyPage.vue",
  "user-vue/pages/auth/login/index.vue",
  "user-vue/pages/auth/register/index.vue",
  "user-vue/pages/auth/reset-password/index.vue",
  "user-vue/pages/auth/set-password/index.vue",
  "user-vue/pages/auth/wechat-callback/index.vue",
  "user-vue/pages/category/all/index.vue",
  "user-vue/pages/category/burger/index.vue",
  "user-vue/pages/category/dessert/index.vue",
  "user-vue/pages/category/food/index.vue",
  "user-vue/pages/category/fruit/index.vue",
  "user-vue/pages/category/index/index.vue",
  "user-vue/pages/category/market/index.vue",
  "user-vue/pages/category/medicine/index.vue",
  "user-vue/pages/errand/buy/index.vue",
  "user-vue/pages/errand/deliver/index.vue",
  "user-vue/pages/errand/do/index.vue",
  "user-vue/pages/errand/pickup/index.vue",
  "user-vue/pages/errand/detail/index.vue",
  "user-vue/pages/errand/index/index.vue",
  "app-mobile/pages/auth/login/index.vue",
  "app-mobile/pages/auth/register/index.vue",
  "app-mobile/pages/auth/reset-password/index.vue",
  "app-mobile/pages/auth/set-password/index.vue",
  "app-mobile/pages/auth/wechat-callback/index.vue",
  "app-mobile/pages/category/all/index.vue",
  "app-mobile/pages/category/burger/index.vue",
  "app-mobile/pages/category/dessert/index.vue",
  "app-mobile/pages/category/food/index.vue",
  "app-mobile/pages/category/fruit/index.vue",
  "app-mobile/pages/category/index/index.vue",
  "app-mobile/pages/category/market/index.vue",
  "app-mobile/pages/category/medicine/index.vue",
  "app-mobile/pages/errand/buy/index.vue",
  "app-mobile/pages/errand/deliver/index.vue",
  "app-mobile/pages/errand/do/index.vue",
  "app-mobile/pages/errand/pickup/index.vue",
  "app-mobile/pages/errand/detail/index.vue",
  "app-mobile/pages/errand/index/index.vue",
  "packages/mobile-core/src/client-payment.js",
  "packages/mobile-core/src/client-payment.test.mjs",
  "packages/mobile-core/src/consumer-app-bootstrap.js",
  "packages/mobile-core/src/consumer-app-bootstrap.test.mjs",
  "packages/mobile-core/src/consumer-app-bridges.js",
  "packages/mobile-core/src/consumer-app-bridges.test.mjs",
  "packages/mobile-core/src/consumer-app-runtime.js",
  "packages/mobile-core/src/consumer-app-shell.js",
  "packages/mobile-core/src/consumer-app-shell.test.mjs",
  "packages/mobile-core/src/consumer-app-runtime.test.mjs",
  "packages/mobile-core/src/consumer-app-session.js",
  "packages/mobile-core/src/consumer-app-session.test.mjs",
  "packages/mobile-core/src/consumer-app-version.js",
  "packages/mobile-core/src/consumer-app-version.test.mjs",
  "packages/mobile-core/src/consumer-api.js",
  "packages/mobile-core/src/consumer-api.test.mjs",
  "packages/mobile-core/src/consumer-legal-runtime.js",
  "packages/mobile-core/src/consumer-legal-runtime.test.mjs",
  "packages/mobile-core/src/consumer-service-runtime.js",
  "packages/mobile-core/src/consumer-service-shell.js",
  "packages/mobile-core/src/consumer-service-shell.test.mjs",
  "packages/mobile-core/src/consumer-service-runtime.test.mjs",
  "packages/mobile-core/src/consumer-auth-runtime.js",
  "packages/mobile-core/src/consumer-auth-runtime.test.mjs",
  "packages/mobile-core/src/consumer-cache.js",
  "packages/mobile-core/src/consumer-cache.test.mjs",
  "packages/mobile-core/src/consumer-errand.js",
  "packages/mobile-core/src/consumer-errand-home.js",
  "packages/mobile-core/src/consumer-errand-home.test.mjs",
  "packages/mobile-core/src/consumer-errand.test.mjs",
  "packages/mobile-core/src/consumer-errand-runtime.js",
  "packages/mobile-core/src/consumer-errand-runtime.test.mjs",
  "packages/mobile-core/src/ErrandHomePage.vue",
  "packages/mobile-core/src/errand-home-page.scss",
  "packages/mobile-core/src/consumer-home-categories.js",
  "packages/mobile-core/src/consumer-home-categories.test.mjs",
  "packages/mobile-core/src/consumer-notification-sound.js",
  "packages/mobile-core/src/consumer-notification-sound.test.mjs",
  "packages/mobile-core/src/consumer-notify-bridges.js",
  "packages/mobile-core/src/consumer-notify-bridges.test.mjs",
  "packages/mobile-core/src/consumer-order-store.js",
  "packages/mobile-core/src/consumer-order-store.test.mjs",
  "packages/mobile-core/src/consumer-runtime-support.js",
  "packages/mobile-core/src/consumer-runtime-support.test.mjs",
  "packages/mobile-core/src/consumer-request-interceptor.js",
  "packages/mobile-core/src/consumer-request-interceptor.test.mjs",
  "packages/mobile-core/src/consumer-rtc-contact.js",
  "packages/mobile-core/src/consumer-rtc-contact.test.mjs",
  "packages/mobile-core/src/featured-page.js",
  "packages/mobile-core/src/featured-page.test.mjs",
  "packages/mobile-core/src/FeaturedPage.vue",
  "packages/mobile-core/src/featured-page.scss",
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
  "packages/mobile-core/src/role-api-shell.js",
  "packages/mobile-core/src/role-api-shell.test.mjs",
  "packages/mobile-core/src/role-portal-runtime-shell.js",
  "packages/mobile-core/src/role-portal-runtime-shell.test.mjs",
  "packages/mobile-core/src/role-runtime-support.js",
  "packages/mobile-core/src/role-runtime-support.test.mjs",
  "app-mobile/shared-ui/app-core/bootstrap.ts",
  "app-mobile/shared-ui/app-core/bridges.ts",
  "app-mobile/shared-ui/app-core/runtime.ts",
  "app-mobile/shared-ui/app-core/session.ts",
  "app-mobile/shared-ui/service-runtime.js",
  "user-vue/shared-ui/app-core/bootstrap.ts",
  "user-vue/shared-ui/app-core/bridges.ts",
  "user-vue/shared-ui/app-core/runtime.ts",
  "user-vue/shared-ui/app-core/session.ts",
  "user-vue/shared-ui/service-runtime.js",
  "packages/mobile-core/src/rtc-call-page.js",
  "packages/mobile-core/src/rtc-call-page.test.mjs",
  "packages/mobile-core/src/wallet-overview-page.js",
  "packages/mobile-core/src/wallet-overview-page.test.mjs",
  "packages/mobile-core/src/WalletBillsPage.vue",
  "packages/mobile-core/src/wallet-bills-page.js",
  "packages/mobile-core/src/wallet-bills-page.scss",
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
  "packages/mobile-core/src/cart-popup-page.js",
  "packages/mobile-core/src/cart-popup-page.test.mjs",
  "packages/mobile-core/src/CartPopupPage.vue",
  "packages/mobile-core/src/cart-popup-page.scss",
  "packages/mobile-core/src/consumer-modal-components.js",
  "packages/mobile-core/src/consumer-modal-components.test.mjs",
  "packages/mobile-core/src/consumer-shop-components.js",
  "packages/mobile-core/src/shop-detail-page.js",
  "packages/mobile-core/src/shop-detail-page.test.mjs",
  "packages/mobile-core/src/ShopDetailPage.vue",
  "packages/mobile-core/src/shop-detail-page.scss",
  "packages/mobile-core/src/product-pages.js",
  "packages/mobile-core/src/product-pages.test.mjs",
  "packages/mobile-core/src/ProductDetailPage.vue",
  "packages/mobile-core/src/product-detail-page.scss",
  "packages/mobile-core/src/ProductPopupDetailPage.vue",
  "packages/mobile-core/src/product-popup-detail-page.scss",
  "packages/mobile-core/src/ShopListPage.vue",
  "packages/mobile-core/src/shop-list-page.scss",
  "packages/mobile-core/src/location-select-page.js",
  "packages/mobile-core/src/location-select-page.test.mjs",
  "packages/mobile-core/src/LocationSelectPage.vue",
  "packages/mobile-core/src/location-select-page.scss",
  "packages/mobile-core/src/ProfileSettingsPage.vue",
  "packages/mobile-core/src/ProfileSettingsDetailPage.vue",
  "packages/mobile-core/src/consumer-shop-components.test.mjs",
  "packages/mobile-core/src/home-index.js",
  "packages/mobile-core/src/home-index.test.mjs",
  "packages/mobile-core/src/home-shell-components.js",
  "packages/mobile-core/src/home-shell-components.test.mjs",
  "packages/mobile-core/src/CartBar.vue",
  "packages/mobile-core/src/CategorySidebar.vue",
  "packages/mobile-core/src/EmptyState.vue",
  "packages/mobile-core/src/FilterBar.vue",
  "packages/mobile-core/src/MenuItem.vue",
  "packages/mobile-core/src/MenuNav.vue",
  "packages/mobile-core/src/PageHeader.vue",
  "packages/mobile-core/src/ShopCard.vue",
  "packages/mobile-core/src/SuccessModal.vue",
  "packages/mobile-core/src/ContactModal.vue",
  "packages/mobile-core/src/PhoneWarningModal.vue",
  "packages/mobile-core/src/CartModal.vue",
  "packages/mobile-core/src/OrderDetailPopup.vue",
  "packages/mobile-core/src/HomeHeader.vue",
  "packages/mobile-core/src/CategoryGrid.vue",
  "packages/mobile-core/src/FeaturedSection.vue",
  "packages/mobile-core/src/HomeShopCard.vue",
  "packages/mobile-core/src/HomeLocationModal.vue",
  "packages/mobile-core/src/home-weather-modal.js",
  "packages/mobile-core/src/home-weather-modal.test.mjs",
  "packages/mobile-core/src/HomeWeatherModal.vue",
  "user-vue/components/HomeHeader.vue",
  "user-vue/components/CategoryGrid.vue",
  "user-vue/components/FeaturedSection.vue",
  "user-vue/components/HomeShopCard.vue",
  "user-vue/components/LocationModal.vue",
  "app-mobile/components/HomeHeader.vue",
  "app-mobile/components/CategoryGrid.vue",
  "app-mobile/components/FeaturedSection.vue",
  "app-mobile/components/HomeShopCard.vue",
  "app-mobile/components/LocationModal.vue",
  "user-vue/components/WeatherModal.vue",
  "app-mobile/components/WeatherModal.vue",
  "user-vue/components/ContactModal.vue",
  "app-mobile/components/ContactModal.vue",
  "user-vue/components/PhoneWarningModal.vue",
  "app-mobile/components/PhoneWarningModal.vue",
  "user-vue/components/CartModal.vue",
  "app-mobile/components/CartModal.vue",
  "user-vue/components/OrderDetailPopup.vue",
  "app-mobile/components/OrderDetailPopup.vue",
  "user-vue/components/CartBar.vue",
  "app-mobile/components/CartBar.vue",
  "user-vue/components/CategorySidebar.vue",
  "app-mobile/components/CategorySidebar.vue",
  "user-vue/components/EmptyState.vue",
  "app-mobile/components/EmptyState.vue",
  "user-vue/components/FilterBar.vue",
  "app-mobile/components/FilterBar.vue",
  "user-vue/components/MenuItem.vue",
  "app-mobile/components/MenuItem.vue",
  "user-vue/components/MenuNav.vue",
  "app-mobile/components/MenuNav.vue",
  "user-vue/components/PageHeader.vue",
  "app-mobile/components/PageHeader.vue",
  "user-vue/components/ShopCard.vue",
  "app-mobile/components/ShopCard.vue",
  "user-vue/components/SuccessModal.vue",
  "app-mobile/components/SuccessModal.vue",
  "packages/mobile-core/src/role-runtime-support.js",
  "packages/mobile-core/src/role-runtime-support.test.mjs",
  "packages/mobile-core/src/role-sync-shell.js",
  "packages/mobile-core/src/role-sync-shell.test.mjs",
  "packages/mobile-core/src/sync-service.js",
  "packages/mobile-core/src/sync-service.d.ts",
  "packages/mobile-core/src/sync-service.test.mjs",
  "packages/mobile-core/src/message-center.js",
  "packages/mobile-core/src/message-center.test.mjs",
  "packages/mobile-core/src/MessageCenterPage.vue",
  "packages/mobile-core/src/message-center-page.scss",
  "packages/mobile-core/src/notification-detail.js",
  "packages/mobile-core/src/notification-detail.test.mjs",
  "packages/mobile-core/src/NotificationListPage.vue",
  "packages/mobile-core/src/notification-list-page.scss",
  "packages/mobile-core/src/NotificationDetailPage.vue",
  "packages/mobile-core/src/notification-detail-page.scss",
  "packages/mobile-core/src/message-chat-page.js",
  "packages/mobile-core/src/message-chat-page.test.mjs",
  "packages/mobile-core/src/MessageChatPage.vue",
  "packages/mobile-core/src/message-chat-page.scss",
  "packages/mobile-core/src/customer-service-chat-utils.js",
  "packages/mobile-core/src/CustomerServicePage.vue",
  "packages/mobile-core/src/customer-service-page.js",
  "packages/mobile-core/src/customer-service-page.scss",
  "packages/mobile-core/src/customer-service-page.test.mjs",
  "packages/mobile-core/src/MedicineHomePage.vue",
  "packages/mobile-core/src/medicine-home-page.scss",
  "packages/mobile-core/src/order-after-sales.js",
  "packages/mobile-core/src/order-after-sales.test.mjs",
  "packages/mobile-core/src/order-after-sales-pages.js",
  "packages/mobile-core/src/OrderRefundPage.vue",
  "packages/mobile-core/src/order-refund-page.scss",
  "packages/mobile-core/src/OrderReviewPage.vue",
  "packages/mobile-core/src/order-review-page.scss",
  "packages/mobile-core/src/OrderConfirmPage.vue",
  "packages/mobile-core/src/order-confirm-page.js",
  "packages/mobile-core/src/order-confirm-page.scss",
  "packages/mobile-core/src/order-confirm-page.test.mjs",
  "packages/mobile-core/src/order-contact.js",
  "packages/mobile-core/src/order-contact.test.mjs",
  "packages/mobile-core/src/order-coupon.js",
  "packages/mobile-core/src/order-coupon.test.mjs",
  "packages/mobile-core/src/order-coupon-page.js",
  "packages/mobile-core/src/order-detail-page.js",
  "packages/mobile-core/src/OrderDetailPage.vue",
  "packages/mobile-core/src/order-detail-page.scss",
  "packages/mobile-core/src/order-detail-page.test.mjs",
  "packages/mobile-core/src/order-list-page.js",
  "packages/mobile-core/src/OrderListPage.vue",
  "packages/mobile-core/src/order-list-page.scss",
  "packages/mobile-core/src/order-list-page.test.mjs",
  "packages/mobile-core/src/order-list-utils.js",
  "packages/mobile-core/src/order-payment-options.js",
  "packages/mobile-core/src/order-payment-options.test.mjs",
  "packages/mobile-core/src/order-support-pages.js",
  "packages/mobile-core/src/order-support-pages.test.mjs",
  "packages/mobile-core/src/phone-contact.js",
  "packages/mobile-core/src/phone-contact.d.ts",
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
  "packages/mobile-core/src/ProfileHomePage.vue",
  "packages/mobile-core/src/profile-home.js",
  "packages/mobile-core/src/profile-home-page.scss",
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
    "app-mobile/pages/order/list/index.vue",
    "../../../../packages/mobile-core/src/OrderListPage.vue",
  ],
  [
    "app-mobile/pages/order/detail/index.vue",
    "../../../../packages/mobile-core/src/OrderDetailPage.vue",
  ],
  [
    "app-mobile/pages/order/confirm/index.vue",
    "../../../../packages/mobile-core/src/OrderConfirmPage.vue",
  ],
  [
    "app-mobile/pages/message/chat/index.vue",
    "../../../../packages/mobile-core/src/MessageChatPage.vue",
  ],
  [
    "app-mobile/pages/profile/customer-service/index.vue",
    "../../../../packages/mobile-core/src/CustomerServicePage.vue",
  ],
  [
    "app-mobile/pages/order/refund/index.vue",
    "../../../../packages/mobile-core/src/OrderRefundPage.vue",
  ],
  [
    "app-mobile/pages/order/review/index.vue",
    "../../../../packages/mobile-core/src/OrderReviewPage.vue",
  ],
  [
    "app-mobile/pages/profile/wallet/index.vue",
    "../../../../packages/mobile-core/src/wallet-overview-page.js",
  ],
  [
    "app-mobile/pages/profile/wallet/bills/index.vue",
    "../../../../../packages/mobile-core/src/WalletBillsPage.vue",
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
    "user-vue/pages/order/list/index.vue",
    "../../../../packages/mobile-core/src/OrderListPage.vue",
  ],
  [
    "user-vue/pages/order/detail/index.vue",
    "../../../../packages/mobile-core/src/OrderDetailPage.vue",
  ],
  [
    "user-vue/pages/order/confirm/index.vue",
    "../../../../packages/mobile-core/src/OrderConfirmPage.vue",
  ],
  [
    "user-vue/pages/message/chat/index.vue",
    "../../../../packages/mobile-core/src/MessageChatPage.vue",
  ],
  [
    "user-vue/pages/profile/customer-service/index.vue",
    "../../../../packages/mobile-core/src/CustomerServicePage.vue",
  ],
  [
    "user-vue/pages/order/refund/index.vue",
    "../../../../packages/mobile-core/src/OrderRefundPage.vue",
  ],
  [
    "user-vue/pages/order/review/index.vue",
    "../../../../packages/mobile-core/src/OrderReviewPage.vue",
  ],
  [
    "user-vue/pages/profile/wallet/index.vue",
    "../../../../packages/mobile-core/src/wallet-overview-page.js",
  ],
  [
    "user-vue/pages/profile/wallet/bills/index.vue",
    "../../../../../packages/mobile-core/src/WalletBillsPage.vue",
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
    "../../../../packages/mobile-core/src/AuthResetPasswordPage.vue",
  ],
  [
    "app-mobile/pages/auth/set-password/index.vue",
    "../../../../packages/mobile-core/src/AuthSetPasswordPage.vue",
  ],
  [
    "app-mobile/pages/category/all/index.vue",
    "../../../../packages/mobile-core/src/CategoryAllPage.vue",
  ],
  [
    "app-mobile/pages/category/burger/index.vue",
    "../../../../packages/mobile-core/src/CategoryBurgerPage.vue",
  ],
  [
    "app-mobile/pages/category/dessert/index.vue",
    "../../../../packages/mobile-core/src/CategoryDessertPage.vue",
  ],
  [
    "app-mobile/pages/category/food/index.vue",
    "../../../../packages/mobile-core/src/CategoryFoodPage.vue",
  ],
  [
    "app-mobile/pages/category/fruit/index.vue",
    "../../../../packages/mobile-core/src/CategoryFruitPage.vue",
  ],
  [
    "app-mobile/pages/category/index/index.vue",
    "../../../../packages/mobile-core/src/CategoryDynamicPage.vue",
  ],
  [
    "app-mobile/pages/category/market/index.vue",
    "../../../../packages/mobile-core/src/CategoryMarketPage.vue",
  ],
  [
    "app-mobile/pages/category/medicine/index.vue",
    "../../../../packages/mobile-core/src/CategoryMedicinePage.vue",
  ],
  [
    "app-mobile/pages/errand/buy/index.vue",
    "../../../../packages/mobile-core/src/ErrandBuyPage.vue",
  ],
  [
    "app-mobile/pages/errand/deliver/index.vue",
    "../../../../packages/mobile-core/src/ErrandDeliverPage.vue",
  ],
  [
    "app-mobile/pages/errand/do/index.vue",
    "../../../../packages/mobile-core/src/ErrandDoPage.vue",
  ],
  [
    "app-mobile/pages/errand/pickup/index.vue",
    "../../../../packages/mobile-core/src/ErrandPickupPage.vue",
  ],
  [
    "app-mobile/pages/errand/detail/index.vue",
    "../../../../packages/mobile-core/src/ErrandDetailPage.vue",
  ],
  [
    "app-mobile/pages/errand/home/index.vue",
    "../../../../packages/mobile-core/src/ErrandHomePage.vue",
  ],
  [
    "app-mobile/pages/errand/index/index.vue",
    "../../../../packages/mobile-core/src/ErrandLegacyPage.vue",
  ],
  [
    "app-mobile/pages/search/index/index.vue",
    "../../../../packages/mobile-core/src/search-page.js",
  ],
  [
    "app-mobile/pages/message/index/index.vue",
    "../../../../packages/mobile-core/src/MessageCenterPage.vue",
  ],
  [
    "app-mobile/pages/message/notification-list/index.vue",
    "../../../../packages/mobile-core/src/NotificationListPage.vue",
  ],
  [
    "app-mobile/pages/message/notification-detail/index.vue",
    "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
  ],
  [
    "app-mobile/pages/dining-buddy/index.vue",
    "../../../packages/mobile-core/src/DiningBuddyPage.vue",
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
    "../../../../packages/mobile-core/src/AuthResetPasswordPage.vue",
  ],
  [
    "user-vue/pages/auth/set-password/index.vue",
    "../../../../packages/mobile-core/src/AuthSetPasswordPage.vue",
  ],
  [
    "user-vue/pages/category/all/index.vue",
    "../../../../packages/mobile-core/src/CategoryAllPage.vue",
  ],
  [
    "user-vue/pages/category/burger/index.vue",
    "../../../../packages/mobile-core/src/CategoryBurgerPage.vue",
  ],
  [
    "user-vue/pages/category/dessert/index.vue",
    "../../../../packages/mobile-core/src/CategoryDessertPage.vue",
  ],
  [
    "user-vue/pages/category/food/index.vue",
    "../../../../packages/mobile-core/src/CategoryFoodPage.vue",
  ],
  [
    "user-vue/pages/category/fruit/index.vue",
    "../../../../packages/mobile-core/src/CategoryFruitPage.vue",
  ],
  [
    "user-vue/pages/category/index/index.vue",
    "../../../../packages/mobile-core/src/CategoryDynamicPage.vue",
  ],
  [
    "user-vue/pages/category/market/index.vue",
    "../../../../packages/mobile-core/src/CategoryMarketPage.vue",
  ],
  [
    "user-vue/pages/category/medicine/index.vue",
    "../../../../packages/mobile-core/src/CategoryMedicinePage.vue",
  ],
  [
    "user-vue/pages/errand/buy/index.vue",
    "../../../../packages/mobile-core/src/ErrandBuyPage.vue",
  ],
  [
    "user-vue/pages/errand/deliver/index.vue",
    "../../../../packages/mobile-core/src/ErrandDeliverPage.vue",
  ],
  [
    "user-vue/pages/errand/do/index.vue",
    "../../../../packages/mobile-core/src/ErrandDoPage.vue",
  ],
  [
    "user-vue/pages/errand/pickup/index.vue",
    "../../../../packages/mobile-core/src/ErrandPickupPage.vue",
  ],
  [
    "user-vue/pages/errand/detail/index.vue",
    "../../../../packages/mobile-core/src/ErrandDetailPage.vue",
  ],
  [
    "user-vue/pages/errand/home/index.vue",
    "../../../../packages/mobile-core/src/ErrandHomePage.vue",
  ],
  [
    "user-vue/pages/errand/index/index.vue",
    "../../../../packages/mobile-core/src/ErrandLegacyPage.vue",
  ],
  [
    "user-vue/pages/search/index/index.vue",
    "../../../../packages/mobile-core/src/search-page.js",
  ],
  [
    "user-vue/pages/message/index/index.vue",
    "../../../../packages/mobile-core/src/MessageCenterPage.vue",
  ],
  [
    "user-vue/pages/message/notification-list/index.vue",
    "../../../../packages/mobile-core/src/NotificationListPage.vue",
  ],
  [
    "user-vue/pages/message/notification-detail/index.vue",
    "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
  ],
  [
    "user-vue/pages/dining-buddy/index.vue",
    "../../../packages/mobile-core/src/DiningBuddyPage.vue",
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
assertContains("merchant-app/shared-ui/api.ts", "createRoleApiRuntimeBindings");
assertContains("merchant-app/shared-ui/api.ts", "extractSMSResult");
assertContains("rider-app/shared-ui/api.ts", "createRoleApiRuntimeBindings");
assertContains("rider-app/shared-ui/api.ts", "extractSMSResult");
assertContains("rider-app/shared-ui/api.ts", "createRiderPreferenceApi");
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "createMobilePushApiImpl({",
);
assertContains("packages/mobile-core/src/consumer-api.js", "extractSMSResult");
assertContains(
  "user-vue/shared-ui/api.js",
  'from "./service-runtime.js"',
);
assertContains(
  "packages/mobile-core/src/NotificationDetailPage.vue",
  '../../domain-core/src/notification-content.js',
);
assertContains(
  "packages/mobile-core/src/NotificationDetailPage.vue",
  'import { createNotificationDetailPage } from "./notification-detail.js";',
);
assertContains(
  "app-mobile/shared-ui/api.js",
  'from "./service-runtime.js"',
);
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

[
  "user-vue",
  "app-mobile",
  "merchant-app",
  "rider-app",
  "admin-vue/src",
].forEach(assertNoLegacyMobileCommonImports);
assertNoDirectGenerateTokenRequests("user-vue");
assertNoDirectGenerateTokenRequests("app-mobile");
assertNoDirectGenerateTokenRequests("merchant-app");
assertNoDirectGenerateTokenRequests("rider-app");
assertNoDirectGenerateTokenRequests("admin-vue");
assertNoDirectGenerateTokenRequests("admin-app");
assertNoDirectGenerateTokenRequests("packages/mobile-core");
assertNoDirectGenerateTokenRequests("packages/client-sdk", [
  "packages/client-sdk/src/realtime-token.js",
  "packages/client-sdk/src/realtime-token.test.mjs",
]);
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
assertContains("admin-vue/src/utils/runtime.js", "createAdminSessionIdentity");
assertContains("admin-vue/src/utils/runtime.js", "normalizeAdminAuthSessionRecord");
assertContains("admin-vue/src/utils/runtime.js", "createSocketSessionIdentity");
assertContains(
  "admin-app/utils/auth.js",
  "buildAdminAuthSession",
);
assertContains(
  "admin-app/utils/auth.js",
  "normalizeAdminAuthSessionRecord",
);
assertContains("admin-vue/src/App.vue", "getStoredAdminUser");
assertContains("admin-vue/src/views/AfterSales.vue", "getStoredAdminUser");
assertContains("admin-vue/src/views/Login.vue", "getStoredAdminUser");
assertContains(
  "packages/admin-core/src/index.js",
  'export * from "./admin-auth-session.js";',
);
assertContains(
  "merchant-app/shared-ui/merchantAccountPages.ts",
  "persistMerchantAuthSession",
);
assertContains("merchant-app/App.vue", "ensureMerchantAuthSession");
assertContains("merchant-app/shared-ui/auth-session.js", "readMerchantAuthIdentity");
assertContains(
  "merchant-app/shared-ui/auth-session.js",
  'from "../../packages/client-sdk/src/role-auth-shell.js"',
);
assertContains(
  "merchant-app/shared-ui/auth-session.js",
  "createRoleAuthSessionBindings({",
);
assertContains("merchant-app/shared-ui/push-registration.ts", "MERCHANT_STORED_AUTH_RESOLVER_OPTIONS");
assertContains("merchant-app/shared-ui/realtime-notify.ts", "MERCHANT_STORED_AUTH_RESOLVER_OPTIONS");
assertContains("rider-app/App-logic.ts", "ensureRiderAuthSession");
assertContains("rider-app/pages/login/index.vue", "persistRiderAuthSession");
assertContains("rider-app/pages/profile/settings.vue", "clearRiderAuthSession");
assertContains("rider-app/pages/profile/change-phone.vue", "persistRiderAuthSession");
assertContains("rider-app/shared-ui/auth-session.js", "readRiderAuthIdentity");
assertContains(
  "rider-app/shared-ui/auth-session.js",
  'from "../../packages/client-sdk/src/role-auth-shell.js"',
);
assertContains(
  "rider-app/shared-ui/auth-session.js",
  "createRoleAuthSessionBindings({",
);
assertContains("rider-app/shared-ui/push-registration.ts", "RIDER_STORED_AUTH_RESOLVER_OPTIONS");
assertContains("rider-app/shared-ui/realtime-notify.ts", "RIDER_STORED_AUTH_RESOLVER_OPTIONS");
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
  "buildResolvedProxyPayload(req, response, defaultErrorMessage)",
);
assertContains(
  "backend/bff/src/services/adminSettings/proxyClient.js",
  'function normalizeSettingsProxyPayload(req, response, defaultErrorMessage = "请求后端服务失败，请稍后重试") {',
);
assertContains(
  "backend/bff/src/services/adminSettings/proxyClient.js",
  "buildRejectedProxyErrorPayload(",
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
  'sendResolvedProxyResponse(req, res, response, "删除财务日志失败")',
);
assertContains(
  "backend/bff/src/controllers/riderController.js",
  "sendRejectedProxyError(req, res, error, '上传证件失败')",
);
assertContains(
  "backend/bff/src/controllers/riderController.js",
  "sendResolvedProxyResponse(req, res, response, '上传证件失败')",
);
assertContains(
  "backend/bff/src/controllers/riderController.js",
  "return sendStreamProxyResponse(req, res, response);",
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
  "backend/bff/src/utils/multipartProxy.js",
  "function buildMultipartProxyResponseOptions() {",
);
assertContains(
  "backend/bff/src/utils/multipartProxy.js",
  "buildResolvedProxyPayload(",
);
assertContains(
  "backend/bff/src/utils/multipartProxy.js",
  "buildRejectedProxyErrorPayload(",
);
assertContains(
  "backend/bff/src/middleware/uploadsProxy.js",
  'buildErrorEnvelopePayload(req, 405, "Method not allowed")',
);
assertContains(
  "backend/bff/src/middleware/uploadsProxy.js",
  "return sendStreamProxyResponse(req, res, upstream);",
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
  "packages/mobile-core/src/consumer-app-bootstrap.js",
  "export function createConsumerAppBootstrap(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-app-bridges.js",
  "export function createConsumerAppBridgeManager(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-app-session.js",
  "export function createConsumerAppSessionManager(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-app-version.js",
  "export function readAppVersion(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-app-version.js",
  "export function getAppVersionLabel(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "export function createConsumerApi(options = {}) {",
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
  "packages/mobile-core/src/consumer-cache.js",
  "export function clearSQLiteCache(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-cache.js",
  "export function checkAndClearCacheIfNeeded(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-errand.js",
  "export function buildErrandOrderPayload(config = {}, identity = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-errand.js",
  "export function mapErrandOrderDetail(order = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-runtime.js",
  "export function createConsumerErrandRuntimeBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-home-categories.js",
  "export function buildHomeCategories(remoteCategories = []) {",
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
  "packages/mobile-core/src/role-runtime-support.js",
  "export function createDefaultRolePlatformRuntimeBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/role-runtime-support.js",
  "export function createDefaultRoleSupportRuntimeBindings(options = {}) {",
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
  "packages/mobile-core/src/role-portal-runtime-shell.js",
  "export function createDefaultRolePortalRuntimeBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/role-api-shell.js",
  "export function createRoleApiRuntimeBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/support-runtime.js",
  "export function createSupportRuntimeStore(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/support-runtime.js",
  "export function normalizeSupportRuntimeSettings(payload = {}, defaultSettings = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-notify-bridges.js",
  "export function createConsumerPushRegistrationBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-notify-bridges.js",
  "export function createConsumerRealtimeNotifyBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-notify-bridges.js",
  "export function createConsumerPushEventBridge(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-request-interceptor.js",
  "export function createConsumerRequestInterceptor(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-rtc-contact.js",
  "export function createConsumerRTCContactBindings(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/home-weather-modal.js",
  "export function createHomeWeatherModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/home-weather-modal.js",
  "export function createHomeWeatherModalViewModel(weather = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-modal-components.js",
  "export function createContactModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-modal-components.js",
  "export function createPhoneWarningModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-modal-components.js",
  "export function createCartModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-modal-components.js",
  "export function createOrderDetailPopupComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-modal-components.js",
  "export function buildConsumerOrderDetailRows(order = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-shop-components.js",
  "export function createCartBarComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-shop-components.js",
  "export function createCategorySidebarComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-shop-components.js",
  "export function createPageHeaderComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-shop-components.js",
  "export function createSuccessModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/consumer-shop-components.js",
  "export function getConsumerCategoryCount(cartItems = [], categoryId) {",
);
assertContains(
  "packages/mobile-core/src/home-shell-components.js",
  "export function createHomeLocationModalComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/home-shell-components.js",
  "export function createFeaturedSectionComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/home-shell-components.js",
  "export function createHomeShopCardComponent(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/home-shell-components.js",
  "export async function relocateHomeLocation(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/sync-service.js",
  "export function createMobileSyncServiceGetter(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/role-sync-shell.js",
  "export function createDefaultRoleSyncServiceGetter(options = {}) {",
);
assertContains("user-vue/shared-ui/sync.ts", 'from "./service-runtime.js"');
assertContains(
  "app-mobile/shared-ui/sync.ts",
  'from "./service-runtime.js"',
);
assertContains(
  "merchant-app/shared-ui/sync.ts",
  "createDefaultRoleSyncServiceGetter({",
);
assertContains(
  "merchant-app/shared-ui/sync.ts",
  'from "../../packages/mobile-core/src/role-sync-shell.js"',
);
assertContains(
  "rider-app/shared-ui/sync.ts",
  "createDefaultRoleSyncServiceGetter({",
);
assertContains(
  "rider-app/shared-ui/sync.ts",
  'from "../../packages/mobile-core/src/role-sync-shell.js"',
);
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
  'from "./service-runtime.js"',
);
assertContains(
  "app-mobile/shared-ui/auth-runtime.js",
  'from "./service-runtime.js"',
);
assertContains(
  "user-vue/shared-ui/service-runtime.js",
  "createDefaultConsumerServiceRuntime({",
);
assertContains(
  "app-mobile/shared-ui/service-runtime.js",
  "createDefaultConsumerServiceRuntime({",
);
assertContains(
  "user-vue/shared-ui/app-core/session.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-core/runtime.ts",
  "createDefaultConsumerUserAppRuntime({",
);
assertContains(
  "user-vue/shared-ui/app-core/bridges.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-core/bootstrap.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/session.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/runtime.ts",
  "createDefaultConsumerUserAppRuntime({",
);
assertContains(
  "app-mobile/shared-ui/app-core/bridges.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/bootstrap.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-version.js",
  'export * from "../../packages/mobile-core/src/consumer-app-version.js"',
);
assertContains(
  "app-mobile/shared-ui/app-version.js",
  'export * from "../../packages/mobile-core/src/consumer-app-version.js"',
);
assertContains(
  "merchant-app/shared-ui/app-version.ts",
  "consumer-app-version.js",
);
assertContains(
  "rider-app/shared-ui/app-version.ts",
  "consumer-app-version.js",
);
assertContains(
  "user-vue/shared-ui/cache-cleaner.ts",
  'export * from "../../packages/mobile-core/src/consumer-cache.js"',
);
assertContains(
  "app-mobile/shared-ui/cache-cleaner.ts",
  'export * from "../../packages/mobile-core/src/consumer-cache.js"',
);
assertContains(
  "user-vue/shared-ui/request-interceptor.ts",
  "createConsumerRequestInterceptor({",
);
assertContains(
  "app-mobile/shared-ui/request-interceptor.ts",
  "createConsumerRequestInterceptor({",
);
assertContains(
  "user-vue/shared-ui/errand.js",
  'export * from "../../packages/mobile-core/src/consumer-errand.js"',
);
assertContains(
  "app-mobile/shared-ui/errand.js",
  'export * from "../../packages/mobile-core/src/consumer-errand.js"',
);
assertContains(
  "user-vue/shared-ui/home-categories.js",
  'export * from "../../packages/mobile-core/src/consumer-home-categories.js"',
);
assertContains(
  "app-mobile/shared-ui/home-categories.js",
  'export * from "../../packages/mobile-core/src/consumer-home-categories.js"',
);
assertContains(
  "user-vue/shared-ui/errand-runtime.js",
  "createConsumerErrandRuntimeBindings({",
);
assertContains(
  "app-mobile/shared-ui/errand-runtime.js",
  "createConsumerErrandRuntimeBindings({",
);
assertContains(
  "user-vue/shared-ui/push-events.js",
  "createConsumerPushEventBridge({",
);
assertContains(
  "app-mobile/shared-ui/push-events.js",
  "createConsumerPushEventBridge({",
);
assertContains(
  "merchant-app/shared-ui/push-events.ts",
  "createDefaultRolePushEventBridgeStarter({",
);
assertContains(
  "rider-app/shared-ui/push-events.ts",
  "createDefaultRolePushEventBridgeStarter({",
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
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
);
assertContains(
  "app-mobile/shared-ui/platform-runtime.js",
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
);
assertContains(
  "merchant-app/shared-ui/platform-runtime.ts",
  "from '../../packages/mobile-core/src/role-runtime-support.js'",
);
assertContains(
  "merchant-app/shared-ui/platform-runtime.ts",
  "createDefaultRolePlatformRuntimeBindings({",
);
assertContains(
  "rider-app/shared-ui/platform-runtime.ts",
  "from '../../packages/mobile-core/src/role-runtime-support.js'",
);
assertContains(
  "rider-app/shared-ui/platform-runtime.ts",
  "createDefaultRolePlatformRuntimeBindings({",
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
  "createDefaultRolePortalRuntimeBindings({",
);
assertContains(
  "merchant-app/shared-ui/portal-runtime.ts",
  "from '../../packages/mobile-core/src/role-portal-runtime-shell.js'",
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  "role-api-shell.js",
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  "const merchantApiRuntime = createRoleApiRuntimeBindings({",
);
assertContains(
  "merchant-app/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "merchant-app/shared-ui/socket.ts",
  "support-socket-shell.js",
);
assertContains(
  "rider-app/shared-ui/portal-runtime.ts",
  "createDefaultRolePortalRuntimeBindings({",
);
assertContains(
  "rider-app/shared-ui/portal-runtime.ts",
  "from '../../packages/mobile-core/src/role-portal-runtime-shell.js'",
);
assertContains(
  "rider-app/shared-ui/api.ts",
  "role-api-shell.js",
);
assertContains(
  "rider-app/shared-ui/api.ts",
  "const riderApiRuntime = createRoleApiRuntimeBindings({",
);
assertContains(
  "rider-app/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "rider-app/shared-ui/socket.ts",
  "support-socket-shell.js",
);
assertContains(
  "user-vue/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "user-vue/shared-ui/socket.ts",
  "support-socket-shell.js",
);
assertContains(
  "user-vue/shared-ui/socket.js",
  "support-socket-shell.js",
);
assertContains(
  "app-mobile/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "app-mobile/shared-ui/socket.ts",
  "support-socket-shell.js",
);
assertContains(
  "user-vue/shared-ui/support-runtime.js",
  "createConsumerSupportRuntimeBindings(",
);
assertContains(
  "app-mobile/shared-ui/support-runtime.js",
  "createConsumerSupportRuntimeBindings(",
);
assertContains(
  "merchant-app/shared-ui/support-runtime.ts",
  "createDefaultRoleSupportRuntimeBindings({",
);
assertContains(
  "rider-app/shared-ui/support-runtime.ts",
  "createDefaultRoleSupportRuntimeBindings({",
);
assertContains(
  "merchant-app/shared-ui/support-runtime.ts",
  "from '../../packages/mobile-core/src/role-runtime-support.js'",
);
assertContains(
  "rider-app/shared-ui/support-runtime.ts",
  "from '../../packages/mobile-core/src/role-runtime-support.js'",
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
assertMatches(
  "backend/go/internal/handler/rider_cert_storage.go",
  /private:\/\/rider-cert\/|ridercert\.PrivateScheme/,
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
  "function buildOfficialSiteProxyResponseOptions() {",
);
assertContains(
  "backend/bff/src/controllers/officialSiteController.js",
  'return sendResolvedProxyResponse(',
);
assertContains(
  "backend/bff/src/controllers/officialSiteController.js",
  "return sendRejectedProxyError(req, res, error, defaultErrorMessage, responseOptions);",
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
  "packages/mobile-core/src/OrderListPage.vue",
  'import { createOrderListPage } from "./order-list-page.js";',
);
assertContains(
  "packages/mobile-core/src/OrderListPage.vue",
  'import { mapAfterSalesItem, mapOrderItem } from "./order-list-utils.js";',
);
assertContains(
  "packages/mobile-core/src/OrderListPage.vue",
  '<style scoped lang="scss" src="./order-list-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/order-list-utils.js",
  'import {',
);
assertContains(
  "packages/mobile-core/src/order-list-utils.js",
  "export function mapOrderItem(order) {",
);
assertContains(
  "packages/mobile-core/src/order-list-utils.js",
  "export function mapAfterSalesItem(item) {",
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
  "packages/mobile-core/src/OrderRefundPage.vue",
  'import { createOrderRefundPage } from "./order-after-sales-pages.js";',
);
assertContains(
  "packages/mobile-core/src/OrderRefundPage.vue",
  '<style scoped lang="scss" src="./order-refund-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/OrderReviewPage.vue",
  'import { createOrderReviewPage } from "./order-after-sales-pages.js";',
);
assertContains(
  "packages/mobile-core/src/OrderReviewPage.vue",
  '<style scoped lang="scss" src="./order-review-page.scss"></style>',
);
assertContains(
  "user-vue/pages/order/refund/index.vue",
  "../../../../packages/mobile-core/src/OrderRefundPage.vue",
);
assertContains(
  "app-mobile/pages/order/refund/index.vue",
  "../../../../packages/mobile-core/src/OrderRefundPage.vue",
);
assertContains(
  "user-vue/pages/order/review/index.vue",
  "../../../../packages/mobile-core/src/OrderReviewPage.vue",
);
assertContains(
  "app-mobile/pages/order/review/index.vue",
  "../../../../packages/mobile-core/src/OrderReviewPage.vue",
);
assertContains(
  "packages/mobile-core/src/WalletBillsPage.vue",
  'import { createWalletBillsPageLogic } from "./wallet-bills-page.js";',
);
assertContains(
  "packages/mobile-core/src/WalletBillsPage.vue",
  '<style scoped lang="scss" src="./wallet-bills-page.scss"></style>',
);
assertContains(
  "user-vue/pages/profile/wallet/bills/index.vue",
  "../../../../../packages/mobile-core/src/WalletBillsPage.vue",
);
assertContains(
  "app-mobile/pages/profile/wallet/bills/index.vue",
  "../../../../../packages/mobile-core/src/WalletBillsPage.vue",
);
assertContains(
  "packages/mobile-core/src/OrderDetailPage.vue",
  'import { createOrderDetailPage } from "./order-detail-page.js";',
);
assertContains(
  "packages/mobile-core/src/OrderDetailPage.vue",
  '<style scoped lang="scss" src="./order-detail-page.scss"></style>',
);
assertContains(
  "user-vue/pages/order/list/index.vue",
  "../../../../packages/mobile-core/src/OrderListPage.vue",
);
assertContains(
  "app-mobile/pages/order/list/index.vue",
  "../../../../packages/mobile-core/src/OrderListPage.vue",
);
assertContains(
  "user-vue/pages/order/detail/index.vue",
  "../../../../packages/mobile-core/src/OrderDetailPage.vue",
);
assertContains(
  "app-mobile/pages/order/detail/index.vue",
  "../../../../packages/mobile-core/src/OrderDetailPage.vue",
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "extractEnvelopeData(payload) || {}",
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "const paginated = extractPaginatedItems(response, {",
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
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
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["categories", "items", "records", "list"]',
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["parties", "items", "records", "list"]',
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "extractEnvelopeData(response) || {}",
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["addresses", "items", "records", "list"]',
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["orders", "items", "records", "list"]',
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["messages", "items", "records", "list"]',
);
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  'listKeys: ["banners", "items", "records", "list"]',
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
  "SOCKET_SERVER_API_SECRET: ${SOCKET_SERVER_API_SECRET:?SOCKET_SERVER_API_SECRET is required}",
);
assertContains(
  "backend/docker/docker-compose.yml",
  "ALIPAY_SIDECAR_ALLOW_STUB: ${ALIPAY_SIDECAR_ALLOW_STUB:-false}",
);
assertContains("package.json", '"verify:sidecar-tests":');
assertContains("package.json", '"verify:socket-tests":');
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
  "function buildResolvedProxyPayload(req, response, defaultErrorMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function buildRejectedProxyErrorPayload(req, error, defaultErrorMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function sendResolvedProxyResponse(req, res, response, defaultErrorMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function sendRejectedProxyError(req, res, error, defaultErrorMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function applyPassthroughResponseHeaders(res, responseHeaders = {}, explicitHeaders = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function sendBufferProxyResponse(res, response, options = {}) {",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "function sendStreamProxyResponse(req, res, response, options = {}) {",
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
  "function buildResolvedGoErrorPayload(req, status, payload, fallbackMessage, options = {}) {",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "return sendResolvedProxyResponse(req, res, response, '微信登录会话不存在或已失效', {",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "legacy: { statusCode: status }",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "return sendBufferProxyResponse(res, response);",
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
  "packages/mobile-core/src/consumer-app-shell.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/auth-portal-pages.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/category-pages.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-errand-home.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-errand-pages.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/sync-service.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/role-sync-shell.test.mjs",
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
  "packages/mobile-core/src/consumer-service-shell.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-app-version.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-api.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/cart-popup-page.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-modal-components.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-shop-components.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/product-pages.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/featured-page.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/home-weather-modal.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/location-select-page.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/home-shell-components.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-cache.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-errand.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-errand-runtime.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-home-categories.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-request-interceptor.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-app-bootstrap.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-app-bridges.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/consumer-app-session.test.mjs",
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
  "packages/mobile-core/src/role-api-shell.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/role-portal-runtime-shell.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/role-runtime-support.test.mjs",
);
assertContains(
  "package.json",
  "packages/mobile-core/src/support-runtime.test.mjs",
);
assertContains(
  "package.json",
  "packages/client-sdk/src/mobile-config-shell.test.mjs",
);
assertContains(
  "package.json",
  "packages/client-sdk/src/support-socket-shell.test.mjs",
);
assertContains(
  "package.json",
  '"verify:admin-core-tests": "node --test packages/admin-core/src/admin-auth-session.test.mjs packages/admin-core/src/paginated-resources.test.mjs packages/admin-core/src/system-log-resources.test.mjs packages/admin-core/src/payment-center-resources.test.mjs packages/admin-core/src/service-health-resources.test.mjs packages/admin-core/src/official-site-resources.test.mjs packages/admin-core/src/financial-transaction-resources.test.mjs packages/admin-core/src/notification-resources.test.mjs packages/admin-core/src/content-settings-resources.test.mjs packages/admin-core/src/operations-center-resources.test.mjs packages/admin-core/src/dashboard-resources.test.mjs packages/admin-core/src/system-settings-resources.test.mjs packages/admin-core/src/api-management-resources.test.mjs packages/admin-core/src/order-resources.test.mjs packages/admin-core/src/user-management-resources.test.mjs packages/admin-core/src/shop-management-resources.test.mjs packages/admin-core/src/merchant-profile-resources.test.mjs packages/admin-core/src/home-entry-resources.test.mjs packages/admin-core/src/communication-audit-resources.test.mjs packages/admin-core/src/home-campaign-resources.test.mjs packages/admin-core/src/admin-management-resources.test.mjs packages/admin-core/src/dining-buddy-governance-resources.test.mjs packages/admin-core/src/chat-console-resources.test.mjs packages/admin-core/src/data-management-resources.test.mjs packages/admin-core/src/coupon-resources.test.mjs packages/admin-core/src/api-documentation-resources.test.mjs"',
);
assertContains(
  "package.json",
  '"verify:modernization": "node scripts/architecture/verify-modernization-baseline.mjs && npm run verify:mobile-types && npm run verify:admin-stack && npm run verify:contracts-tests && npm run verify:domain-core-tests && npm run verify:mobile-core-tests && npm run verify:admin-core-tests && npm run verify:client-sdk-tests && npm run verify:backend-runtime && npm run verify:management-tests"',
);
assertContains(
  "package.json",
  '"verify:client-sdk-tests": "node --test packages/client-sdk/src/error-utils.test.mjs packages/client-sdk/src/local-db.test.mjs packages/client-sdk/src/mobile-capabilities.test.mjs packages/client-sdk/src/mobile-config.test.mjs packages/client-sdk/src/mobile-config-shell.test.mjs packages/client-sdk/src/mobile-config-helper.test.mjs packages/client-sdk/src/mobile-utils.test.mjs packages/client-sdk/src/notification-audio.test.mjs packages/client-sdk/src/onboarding-invite.test.mjs packages/client-sdk/src/push-events.test.mjs packages/client-sdk/src/push-registration.test.mjs packages/client-sdk/src/realtime-notify.test.mjs packages/client-sdk/src/role-auth-session.test.mjs packages/client-sdk/src/role-auth-shell.test.mjs packages/client-sdk/src/role-notify-bridges.test.mjs packages/client-sdk/src/role-notify-shell.test.mjs packages/client-sdk/src/role-push-event-shell.test.mjs packages/client-sdk/src/realtime-token.test.mjs packages/client-sdk/src/rtc-contact.test.mjs packages/client-sdk/src/rtc-media.test.mjs packages/client-sdk/src/rtc-runtime.test.mjs packages/client-sdk/src/safe-access.test.mjs packages/client-sdk/src/socket-io.test.mjs packages/client-sdk/src/stored-auth-identity.test.mjs packages/client-sdk/src/support-socket.test.mjs packages/client-sdk/src/support-socket-bridge.test.mjs packages/client-sdk/src/support-socket-shell.test.mjs packages/client-sdk/src/uni-request.test.mjs"',
);
assertContains(
  "packages/client-sdk/src/role-auth-shell.js",
  "export function createRoleAuthSessionBindings(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/role-push-event-shell.js",
  "export function createDefaultRolePushEventBridgeStarter(options = {}) {",
);
assertContains(
  "package.json",
  '"verify:mobile-core-tests": "node --test packages/mobile-core/src/upload.test.mjs packages/mobile-core/src/vip-center.test.mjs packages/mobile-core/src/medicine-home.test.mjs packages/mobile-core/src/medicine-order.test.mjs packages/mobile-core/src/mobile-client-context.test.mjs packages/mobile-core/src/charity-page.test.mjs packages/mobile-core/src/dining-buddy.test.mjs packages/mobile-core/src/auth-portal.test.mjs packages/mobile-core/src/auth-portal-pages.test.mjs packages/mobile-core/src/cart-popup-page.test.mjs packages/mobile-core/src/category-pages.test.mjs packages/mobile-core/src/consumer-app-bootstrap.test.mjs packages/mobile-core/src/consumer-app-bridges.test.mjs packages/mobile-core/src/consumer-app-runtime.test.mjs packages/mobile-core/src/consumer-app-shell.test.mjs packages/mobile-core/src/consumer-app-session.test.mjs packages/mobile-core/src/consumer-app-version.test.mjs packages/mobile-core/src/consumer-api.test.mjs packages/mobile-core/src/consumer-auth-runtime.test.mjs packages/mobile-core/src/consumer-cache.test.mjs packages/mobile-core/src/consumer-errand.test.mjs packages/mobile-core/src/consumer-errand-home.test.mjs packages/mobile-core/src/consumer-errand-pages.test.mjs packages/mobile-core/src/consumer-errand-runtime.test.mjs packages/mobile-core/src/consumer-home-categories.test.mjs packages/mobile-core/src/consumer-legal-runtime.test.mjs packages/mobile-core/src/consumer-modal-components.test.mjs packages/mobile-core/src/consumer-notification-sound.test.mjs packages/mobile-core/src/consumer-order-store.test.mjs packages/mobile-core/src/consumer-runtime-support.test.mjs packages/mobile-core/src/consumer-service-runtime.test.mjs packages/mobile-core/src/consumer-service-shell.test.mjs packages/mobile-core/src/consumer-shop-components.test.mjs packages/mobile-core/src/shop-detail-page.test.mjs packages/mobile-core/src/product-pages.test.mjs packages/mobile-core/src/featured-page.test.mjs packages/mobile-core/src/consumer-notify-bridges.test.mjs packages/mobile-core/src/consumer-request-interceptor.test.mjs packages/mobile-core/src/consumer-rtc-contact.test.mjs packages/mobile-core/src/home-index.test.mjs packages/mobile-core/src/home-shell-components.test.mjs packages/mobile-core/src/home-weather-modal.test.mjs packages/mobile-core/src/location.test.mjs packages/mobile-core/src/location-select-page.test.mjs packages/mobile-core/src/platform-runtime.test.mjs packages/mobile-core/src/platform-schema.test.mjs packages/mobile-core/src/portal-runtime.test.mjs packages/mobile-core/src/role-api-shell.test.mjs packages/mobile-core/src/role-portal-runtime-shell.test.mjs packages/mobile-core/src/role-runtime-support.test.mjs packages/mobile-core/src/rtc-call-page.test.mjs packages/mobile-core/src/search-page.test.mjs packages/mobile-core/src/support-runtime.test.mjs packages/mobile-core/src/profile-home.test.mjs packages/mobile-core/src/profile-settings.test.mjs packages/mobile-core/src/profile-address.test.mjs packages/mobile-core/src/profile-favorites.test.mjs packages/mobile-core/src/profile-my-reviews.test.mjs packages/mobile-core/src/profile-points-mall.test.mjs packages/mobile-core/src/profile-edit.test.mjs packages/mobile-core/src/profile-outreach.test.mjs packages/mobile-core/src/profile-coupon-list.test.mjs packages/mobile-core/src/profile-phone-change.test.mjs packages/mobile-core/src/message-center.test.mjs packages/mobile-core/src/notification-detail.test.mjs packages/mobile-core/src/message-chat-page.test.mjs packages/mobile-core/src/customer-service-page.test.mjs packages/mobile-core/src/client-payment.test.mjs packages/mobile-core/src/push-event-route.test.mjs packages/mobile-core/src/order-after-sales.test.mjs packages/mobile-core/src/order-confirm-page.test.mjs packages/mobile-core/src/order-contact.test.mjs packages/mobile-core/src/order-coupon.test.mjs packages/mobile-core/src/order-detail-page.test.mjs packages/mobile-core/src/order-list-page.test.mjs packages/mobile-core/src/order-payment-options.test.mjs packages/mobile-core/src/order-support-pages.test.mjs packages/mobile-core/src/phone-contact.test.mjs packages/mobile-core/src/role-sync-shell.test.mjs packages/mobile-core/src/sync-service.test.mjs packages/mobile-core/src/wallet-overview-page.test.mjs packages/mobile-core/src/wallet-bills-page.test.mjs packages/mobile-core/src/wallet-recharge-page.test.mjs packages/mobile-core/src/wallet-withdraw-page.test.mjs"',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./error-utils.js";',
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
  'export * from "./mobile-config-shell.js";',
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
  'export * from "./role-auth-shell.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./role-notify-bridges.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./role-notify-shell.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./role-push-event-shell.js";',
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
  "packages/client-sdk/src/index.js",
  'export * from "./safe-access.js";',
);
assertContains(
  "packages/client-sdk/src/index.js",
  'export * from "./support-socket-shell.js";',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./error-utils": "./src/error-utils.js"',
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
  '"./mobile-config-shell": "./src/mobile-config-shell.js"',
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
  '"./role-auth-shell": "./src/role-auth-shell.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./role-notify-bridges": "./src/role-notify-bridges.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./role-notify-shell": "./src/role-notify-shell.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./role-push-event-shell": "./src/role-push-event-shell.js"',
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
assertContains(
  "packages/client-sdk/package.json",
  '"./safe-access": "./src/safe-access.js"',
);
assertContains(
  "packages/client-sdk/package.json",
  '"./support-socket-shell": "./src/support-socket-shell.js"',
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
  "packages/client-sdk/src/mobile-config-shell.js",
  "export function createManifestBoundMobileConfig(options = {}) {",
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
  "packages/client-sdk/src/support-socket-shell.js",
  "export function createDefaultSupportSocketBridge(options = {}) {",
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
  "packages/client-sdk/src/realtime-token.js",
  "export function clearCachedSocketToken(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/realtime-token.js",
  "export async function resolveSocketToken(options = {}) {",
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
  "createConfiguredSupportSocketBridge({",
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
  "from '../../packages/mobile-core/src/consumer-notification-sound.js'",
);
assertContains(
  "app-mobile/shared-ui/notification-sound.js",
  "from '../../packages/mobile-core/src/consumer-notification-sound.js'",
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
  "mobile-config-shell.js",
);
assertContains(
  "app-mobile/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "merchant-app/shared-ui/config.ts",
  "mobile-config-shell.js",
);
assertContains(
  "rider-app/shared-ui/config.ts",
  "mobile-config-shell.js",
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
assertContains(
  "packages/mobile-core/src/consumer-api.js",
  "createUniRequestClientImpl({",
);
assertContains("user-vue/shared-ui/api.js", 'from "./service-runtime.js"');
assertContains("app-mobile/shared-ui/api.js", 'from "./service-runtime.js"');
assertContains(
  "user-vue/shared-ui/service-runtime.js",
  'from "../../packages/mobile-core/src/consumer-service-shell.js"',
);
assertContains(
  "app-mobile/shared-ui/service-runtime.js",
  'from "../../packages/mobile-core/src/consumer-service-shell.js"',
);
assertContains("merchant-app/shared-ui/api.ts", "createRoleApiRuntimeBindings({");
assertContains("rider-app/shared-ui/api.ts", "createRoleApiRuntimeBindings({");
assertContains(
  "user-vue/shared-ui/push-registration.js",
  "createConsumerPushRegistrationBindings({",
);
assertContains(
  "user-vue/shared-ui/push-registration.js",
  'from "../../packages/mobile-core/src/consumer-notify-bridges.js"',
);
assertContains(
  "app-mobile/shared-ui/push-registration.js",
  "createConsumerPushRegistrationBindings({",
);
assertContains(
  "app-mobile/shared-ui/push-registration.js",
  'from "../../packages/mobile-core/src/consumer-notify-bridges.js"',
);
assertContains(
  "packages/client-sdk/src/role-notify-shell.js",
  "export function createDefaultRolePushRegistrationBindings(options = {}) {",
);
assertContains(
  "packages/client-sdk/src/role-notify-shell.js",
  "export function createDefaultRoleRealtimeNotifyBindings(options = {}) {",
);
assertContains(
  "merchant-app/shared-ui/push-registration.ts",
  "createDefaultRolePushRegistrationBindings({",
);
assertContains(
  "merchant-app/shared-ui/push-registration.ts",
  "from '../../packages/client-sdk/src/role-notify-shell.js'",
);
assertContains(
  "rider-app/shared-ui/push-registration.ts",
  "createDefaultRolePushRegistrationBindings({",
);
assertContains(
  "rider-app/shared-ui/push-registration.ts",
  "from '../../packages/client-sdk/src/role-notify-shell.js'",
);
assertContains(
  "user-vue/shared-ui/realtime-notify.js",
  "createConsumerRealtimeNotifyBindings({",
);
assertContains(
  "user-vue/shared-ui/realtime-notify.js",
  'from "../../packages/mobile-core/src/consumer-notify-bridges.js"',
);
assertContains(
  "app-mobile/shared-ui/realtime-notify.js",
  "createConsumerRealtimeNotifyBindings({",
);
assertContains(
  "app-mobile/shared-ui/realtime-notify.js",
  'from "../../packages/mobile-core/src/consumer-notify-bridges.js"',
);
assertContains(
  "user-vue/shared-ui/request-interceptor.ts",
  'from "../../packages/mobile-core/src/consumer-request-interceptor.js"',
);
assertContains(
  "user-vue/shared-ui/request-interceptor.ts",
  'pushRegistrationStorageKey: "user_vue_push_registration"',
);
assertContains(
  "app-mobile/shared-ui/request-interceptor.ts",
  'from "../../packages/mobile-core/src/consumer-request-interceptor.js"',
);
assertContains(
  "app-mobile/shared-ui/request-interceptor.ts",
  'pushRegistrationStorageKey: "app_mobile_push_registration"',
);
assertContains("user-vue/App.vue", "bootstrapUserApp");
assertContains("user-vue/App.vue", "handleUserAppShow");
assertContains("app-mobile/App.vue", "bootstrapUserApp");
assertContains("app-mobile/App.vue", "handleUserAppShow");
assertContains(
  "user-vue/shared-ui/app-core/bootstrap.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-core/bridges.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-core/session.ts",
  'from "./runtime"',
);
assertContains(
  "user-vue/shared-ui/app-core/runtime.ts",
  'from "../../../packages/mobile-core/src/consumer-app-shell.js"',
);
assertContains(
  "app-mobile/shared-ui/app-core/bootstrap.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/bridges.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/session.ts",
  'from "./runtime"',
);
assertContains(
  "app-mobile/shared-ui/app-core/runtime.ts",
  'from "../../../packages/mobile-core/src/consumer-app-shell.js"',
);
assertContains(
  "user-vue/shared-ui/errand-runtime.js",
  'from "../../packages/mobile-core/src/consumer-errand-runtime.js"',
);
assertContains(
  "user-vue/shared-ui/errand-runtime.js",
  'clientScope: "user-vue"',
);
assertContains(
  "app-mobile/shared-ui/errand-runtime.js",
  'from "../../packages/mobile-core/src/consumer-errand-runtime.js"',
);
assertContains(
  "app-mobile/shared-ui/errand-runtime.js",
  'clientScope: "app-mobile"',
);
assertContains(
  "user-vue/shared-ui/legal-runtime.js",
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
);
assertContains(
  "app-mobile/shared-ui/legal-runtime.js",
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
);
assertContains(
  "user-vue/shared-ui/userOrderStore.js",
  "from '../../packages/mobile-core/src/consumer-order-store.js'",
);
assertContains(
  "app-mobile/shared-ui/userOrderStore.js",
  "from '../../packages/mobile-core/src/consumer-order-store.js'",
);
assertContains(
  "user-vue/shared-ui/notification-sound.js",
  "from '../../packages/mobile-core/src/consumer-notification-sound.js'",
);
assertContains(
  "app-mobile/shared-ui/notification-sound.js",
  "from '../../packages/mobile-core/src/consumer-notification-sound.js'",
);
assertContains(
  "user-vue/shared-ui/foundation/safe.js",
  "from '../../../packages/client-sdk/src/safe-access.js'",
);
assertContains(
  "app-mobile/shared-ui/foundation/safe.js",
  "from '../../../packages/client-sdk/src/safe-access.js'",
);
assertContains(
  "user-vue/shared-ui/foundation/error.js",
  "from '../../../packages/client-sdk/src/error-utils.js'",
);
assertContains(
  "app-mobile/shared-ui/foundation/error.js",
  "from '../../../packages/client-sdk/src/error-utils.js'",
);
assertContains(
  "merchant-app/shared-ui/realtime-notify.ts",
  "createDefaultRoleRealtimeNotifyBindings({",
);
assertContains(
  "merchant-app/shared-ui/realtime-notify.ts",
  "from '../../packages/client-sdk/src/role-notify-shell.js'",
);
assertContains(
  "rider-app/shared-ui/realtime-notify.ts",
  "createDefaultRoleRealtimeNotifyBindings({",
);
assertContains(
  "rider-app/shared-ui/realtime-notify.ts",
  "from '../../packages/client-sdk/src/role-notify-shell.js'",
);
assertContains(
  "user-vue/shared-ui/push-events.js",
  "createConsumerPushEventBridge({",
);
assertContains(
  "app-mobile/shared-ui/push-events.js",
  "createConsumerPushEventBridge({",
);
assertContains(
  "merchant-app/shared-ui/push-events.ts",
  "from '../../packages/client-sdk/src/role-push-event-shell.js'",
);
assertContains(
  "merchant-app/shared-ui/push-events.ts",
  "createDefaultRolePushEventBridgeStarter({",
);
assertContains(
  "rider-app/shared-ui/push-events.ts",
  "from '../../packages/client-sdk/src/role-push-event-shell.js'",
);
assertContains(
  "rider-app/shared-ui/push-events.ts",
  "createDefaultRolePushEventBridgeStarter({",
);
assertContains(
  "admin-vue/src/utils/socket.js",
  "resolveSocketToken({",
);
assertContains(
  "merchant-app/shared-ui/merchantChatPage.ts",
  "resolveSocketToken({",
);
assertContains(
  "user-vue/shared-ui/rtc-contact.js",
  "createConsumerRTCContactBindings({",
);
assertContains(
  "app-mobile/shared-ui/rtc-contact.js",
  "createConsumerRTCContactBindings({",
);
assertContains(
  "user-vue/shared-ui/rtc-runtime.js",
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
);
assertContains(
  "app-mobile/shared-ui/rtc-runtime.js",
  "from '../../packages/mobile-core/src/consumer-runtime-support.js'",
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
  "socketToken = await resolveSocketToken({",
);
assertContains(
  "admin-app/utils/socketService.js",
  "return await resolveSocketToken({",
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
  "packages/mobile-core/src/consumer-errand-home.js",
  "export function createErrandHomePage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-home.js",
  "export function normalizeConsumerErrandHomeOrderCollection(response)",
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
  'export * from "./auth-portal-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./category-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-errand-home.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-bootstrap.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-bridges.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-runtime.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-shell.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-session.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./role-api-shell.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./role-portal-runtime-shell.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-service-runtime.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-service-shell.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./role-runtime-support.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./role-sync-shell.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-app-version.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-api.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-legal-runtime.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-notification-sound.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-order-store.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-runtime-support.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-auth-runtime.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-cache.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-errand.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-errand-runtime.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-home-categories.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-notify-bridges.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-request-interceptor.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-rtc-contact.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./featured-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./home-index.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./home-shell-components.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./home-weather-modal.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-modal-components.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./product-pages.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./location-select-page.js";',
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
  'export * from "./cart-popup-page.js";',
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
  '"./consumer-app-bootstrap": "./src/consumer-app-bootstrap.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-app-bridges": "./src/consumer-app-bridges.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-app-runtime": "./src/consumer-app-runtime.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./role-api-shell": "./src/role-api-shell.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./role-portal-runtime-shell": "./src/role-portal-runtime-shell.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-app-shell": "./src/consumer-app-shell.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-app-session": "./src/consumer-app-session.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-service-runtime": "./src/consumer-service-runtime.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-service-shell": "./src/consumer-service-shell.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./role-runtime-support": "./src/role-runtime-support.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./role-sync-shell": "./src/role-sync-shell.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./auth-portal-pages": "./src/auth-portal-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./cart-popup-page": "./src/cart-popup-page.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./category-pages": "./src/category-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-errand-home": "./src/consumer-errand-home.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-errand-pages": "./src/consumer-errand-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-app-version": "./src/consumer-app-version.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-api": "./src/consumer-api.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-legal-runtime": "./src/consumer-legal-runtime.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-notification-sound": "./src/consumer-notification-sound.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-order-store": "./src/consumer-order-store.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-runtime-support": "./src/consumer-runtime-support.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-modal-components": "./src/consumer-modal-components.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-shop-components": "./src/consumer-shop-components.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./product-pages": "./src/product-pages.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-auth-runtime": "./src/consumer-auth-runtime.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-cache": "./src/consumer-cache.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-errand": "./src/consumer-errand.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-errand-runtime": "./src/consumer-errand-runtime.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-home-categories": "./src/consumer-home-categories.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-notify-bridges": "./src/consumer-notify-bridges.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-request-interceptor": "./src/consumer-request-interceptor.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./consumer-rtc-contact": "./src/consumer-rtc-contact.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./featured-page": "./src/featured-page.js"',
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
  '"./home-shell-components": "./src/home-shell-components.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./home-weather-modal": "./src/home-weather-modal.js"',
);
assertContains(
  "packages/mobile-core/package.json",
  '"./location-select-page": "./src/location-select-page.js"',
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
  "../../../../packages/mobile-core/src/MessageCenterPage.vue",
);
assertContains(
  "app-mobile/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/MessageCenterPage.vue",
);
assertContains(
  "user-vue/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/NotificationListPage.vue",
);
assertContains(
  "app-mobile/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/NotificationListPage.vue",
);
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
);
assertContains(
  "user-vue/pages/message/chat/index.vue",
  "../../../../packages/mobile-core/src/MessageChatPage.vue",
);
assertContains(
  "app-mobile/pages/message/chat/index.vue",
  "../../../../packages/mobile-core/src/MessageChatPage.vue",
);
assertContains(
  "user-vue/pages/profile/customer-service/index.vue",
  "../../../../packages/mobile-core/src/CustomerServicePage.vue",
);
assertContains(
  "app-mobile/pages/profile/customer-service/index.vue",
  "../../../../packages/mobile-core/src/CustomerServicePage.vue",
);
assertContains(
  "user-vue/shared-ui/feature-runtime.js",
  "../../packages/mobile-core/src/consumer-runtime-support.js",
);
assertContains(
  "app-mobile/shared-ui/feature-runtime.js",
  "../../packages/mobile-core/src/consumer-runtime-support.js",
);
assertContains(
  "packages/mobile-core/src/ErrandHomePage.vue",
  'import { createErrandHomePage } from "./consumer-errand-home.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandHomePage.vue",
  '<style scoped lang="scss" src="./errand-home-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/MessageCenterPage.vue",
  'import { createMessageCenterPage } from "./message-center.js";',
);
assertContains(
  "packages/mobile-core/src/MessageCenterPage.vue",
  '<style scoped lang="scss" src="./message-center-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/NotificationListPage.vue",
  'import { createNotificationListPage } from "./message-center.js";',
);
assertContains(
  "packages/mobile-core/src/NotificationListPage.vue",
  '<style scoped lang="scss" src="./notification-list-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/NotificationDetailPage.vue",
  'import { createNotificationDetailPage } from "./notification-detail.js";',
);
assertContains(
  "packages/mobile-core/src/NotificationDetailPage.vue",
  '<style scoped lang="scss" src="./notification-detail-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/MessageChatPage.vue",
  'import { createMessageChatPage } from "./message-chat-page.js";',
);
assertContains(
  "packages/mobile-core/src/MessageChatPage.vue",
  '<style scoped lang="scss" src="./message-chat-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/CustomerServicePage.vue",
  'import { createCustomerServicePage } from "./customer-service-page.js";',
);
assertContains(
  "packages/mobile-core/src/CustomerServicePage.vue",
  '<style scoped lang="scss" src="./customer-service-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/VipCenterPage.vue",
  'import { fetchPointsBalance, fetchPointsGoods, fetchPublicVIPSettings } from "@/shared-ui/api.js";',
);
assertContains(
  "packages/mobile-core/src/VipCenterPage.vue",
  '<style scoped lang="scss" src="./vip-center-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ShopMenuPage.vue",
  'import { fetchShopDetail, fetchCategories, fetchProducts, fetchBanners } from \'@/shared-ui/api.js\'',
);
assertContains(
  "packages/mobile-core/src/ShopMenuPage.vue",
  '<style scoped lang="scss" src="./shop-menu-page.scss"></style>',
);
assertContains(
  "user-vue/pages/shop/menu/index.vue",
  "../../../../packages/mobile-core/src/ShopMenuPage.vue",
);
assertContains(
  "app-mobile/pages/shop/menu/index.vue",
  "../../../../packages/mobile-core/src/ShopMenuPage.vue",
);
assertContains(
  "user-vue/pages/profile/vip-center/index.vue",
  "../../../../packages/mobile-core/src/VipCenterPage.vue",
);
assertContains(
  "app-mobile/pages/profile/vip-center/index.vue",
  "../../../../packages/mobile-core/src/VipCenterPage.vue",
);
assertContains(
  "packages/mobile-core/src/MedicineHomePage.vue",
  'import { createPhoneContactHelper } from "./phone-contact.js";',
);
assertContains(
  "packages/mobile-core/src/MedicineChatPage.vue",
  "consultMedicineAssistant",
);
assertContains(
  "packages/mobile-core/src/MedicineChatPage.vue",
  "requireCurrentUserIdentity",
);
assertContains(
  "packages/mobile-core/src/WelcomeLandingPage.vue",
  "isUserLoggedIn()",
);
assertContains(
  "packages/mobile-core/src/WelcomeLandingPage.vue",
  "goGuest()",
);
assertContains(
  "packages/mobile-core/src/MedicineHomePage.vue",
  '<style scoped lang="scss" src="./medicine-home-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/CharityPage.vue",
  'import {\n  buildCharityLeaderboardToShow,',
);
assertContains(
  "packages/mobile-core/src/CharityPage.vue",
  '<style scoped lang="scss" src="./charity-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/DiningBuddyPage.vue",
  'import { createDiningBuddyPage } from "./dining-buddy.js";',
);
assertContains(
  "packages/mobile-core/src/DiningBuddyPage.vue",
  '<style scoped lang="scss" src="./dining-buddy-page.scss"></style>',
);
assertContains(
  "user-vue/pages/dining-buddy/index.vue",
  "../../../packages/mobile-core/src/DiningBuddyPage.vue",
);
assertContains(
  "app-mobile/pages/dining-buddy/index.vue",
  "../../../packages/mobile-core/src/DiningBuddyPage.vue",
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
  "../../../packages/mobile-core/src/MedicineHomePage.vue",
);
assertContains(
  "app-mobile/pages/medicine/home.vue",
  "../../../packages/mobile-core/src/MedicineHomePage.vue",
);
assertContains(
  "user-vue/pages/medicine/chat.vue",
  "../../../packages/mobile-core/src/MedicineChatPage.vue",
);
assertContains(
  "app-mobile/pages/medicine/chat.vue",
  "../../../packages/mobile-core/src/MedicineChatPage.vue",
);
assertContains(
  "user-vue/pages/welcome/welcome/index.vue",
  "../../../../packages/mobile-core/src/WelcomeLandingPage.vue",
);
assertContains(
  "app-mobile/pages/welcome/welcome/index.vue",
  "../../../../packages/mobile-core/src/WelcomeLandingPage.vue",
);
assertContains(
  "packages/mobile-core/src/shop-detail-page.js",
  'import { createPhoneContactHelper } from "./phone-contact.js";',
);
assertContains(
  "packages/mobile-core/src/shop-detail-page.js",
  'import { extractEnvelopeData } from "../../contracts/src/http.js";',
);
assertContains(
  "packages/mobile-core/src/shop-detail-page.js",
  "export function createShopDetailPageOptions(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/ShopDetailPage.vue",
  'import {\n  createShopDetailPageOptions,\n} from "./shop-detail-page.js";',
);
assertContains(
  "packages/mobile-core/src/index.js",
  'export * from "./shop-detail-page.js";',
);
assertContains(
  "packages/mobile-core/src/ShopDetailPage.vue",
  'import {\n  addUserFavorite,',
);
assertContains(
  "packages/mobile-core/src/ShopDetailPage.vue",
  '<style scoped lang="scss" src="./shop-detail-page.scss"></style>',
);
assertContains(
  "user-vue/pages/shop/detail/index.vue",
  "../../../../packages/mobile-core/src/ShopDetailPage.vue",
);
assertContains(
  "app-mobile/pages/shop/detail/index.vue",
  "../../../../packages/mobile-core/src/ShopDetailPage.vue",
);
assertContains(
  "packages/mobile-core/src/product-pages.js",
  "export function createProductDetailPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/product-pages.js",
  "export function createProductPopupDetailPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/product-pages.js",
  "export function createShopListPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/product-pages.js",
  "export function writeConsumerProductCartCount(",
);
assertContains(
  "packages/mobile-core/src/ProductDetailPage.vue",
  'import { createProductDetailPage } from "./product-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ProductDetailPage.vue",
  '<style scoped lang="scss" src="./product-detail-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ProductPopupDetailPage.vue",
  'import { createProductPopupDetailPage } from "./product-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ProductPopupDetailPage.vue",
  '<style scoped lang="scss" src="./product-popup-detail-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ShopListPage.vue",
  'import { createShopListPage } from "./product-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ShopListPage.vue",
  '<style scoped lang="scss" src="./shop-list-page.scss"></style>',
);
assertContains(
  "user-vue/pages/product/detail/index.vue",
  "../../../../packages/mobile-core/src/ProductDetailPage.vue",
);
assertContains(
  "app-mobile/pages/product/detail/index.vue",
  "../../../../packages/mobile-core/src/ProductDetailPage.vue",
);
assertContains(
  "user-vue/pages/product/popup-detail/index.vue",
  "../../../../packages/mobile-core/src/ProductPopupDetailPage.vue",
);
assertContains(
  "app-mobile/pages/product/popup-detail/index.vue",
  "../../../../packages/mobile-core/src/ProductPopupDetailPage.vue",
);
assertContains(
  "user-vue/pages/shop/list/index.vue",
  "../../../../packages/mobile-core/src/ShopListPage.vue",
);
assertContains(
  "app-mobile/pages/shop/list/index.vue",
  "../../../../packages/mobile-core/src/ShopListPage.vue",
);
assertContains(
  "packages/mobile-core/src/featured-page.js",
  "export function createFeaturedPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/FeaturedPage.vue",
  'import { createFeaturedPage } from "./featured-page.js";',
);
assertContains(
  "packages/mobile-core/src/FeaturedPage.vue",
  '<style scoped lang="scss" src="./featured-page.scss"></style>',
);
assertContains(
  "user-vue/pages/product/featured/index.vue",
  "../../../../packages/mobile-core/src/FeaturedPage.vue",
);
assertContains(
  "app-mobile/pages/product/featured/index.vue",
  "../../../../packages/mobile-core/src/FeaturedPage.vue",
);
assertContains(
  "packages/mobile-core/src/location-select-page.js",
  "export function createLocationSelectPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/LocationSelectPage.vue",
  'import { createLocationSelectPage } from "./location-select-page.js";',
);
assertContains(
  "packages/mobile-core/src/LocationSelectPage.vue",
  '<style scoped lang="scss" src="./location-select-page.scss"></style>',
);
assertContains(
  "user-vue/pages/location/select/index.vue",
  "../../../../packages/mobile-core/src/LocationSelectPage.vue",
);
assertContains(
  "app-mobile/pages/location/select/index.vue",
  "../../../../packages/mobile-core/src/LocationSelectPage.vue",
);
assertContains(
  "packages/mobile-core/src/cart-popup-page.js",
  "export function createCartPopupPage(options = {}) {",
);
assertContains(
  "packages/mobile-core/src/CartPopupPage.vue",
  'import { createCartPopupPage } from "./cart-popup-page.js";',
);
assertContains(
  "packages/mobile-core/src/CartPopupPage.vue",
  '<style scoped lang="scss" src="./cart-popup-page.scss"></style>',
);
assertContains(
  "user-vue/pages/shop/cart-popup/index.vue",
  "../../../../packages/mobile-core/src/CartPopupPage.vue",
);
assertContains(
  "app-mobile/pages/shop/cart-popup/index.vue",
  "../../../../packages/mobile-core/src/CartPopupPage.vue",
);
assertContains(
  "user-vue/pages/charity/index.vue",
  "../../../packages/mobile-core/src/CharityPage.vue",
);
assertContains(
  "app-mobile/pages/charity/index.vue",
  "../../../packages/mobile-core/src/CharityPage.vue",
);
assertContains(
  "packages/mobile-core/src/CharityPage.vue",
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
  "user-vue/pages/auth/reset-password/index.vue",
  "app-mobile/pages/auth/reset-password/index.vue",
  "user-vue/pages/auth/set-password/index.vue",
  "app-mobile/pages/auth/set-password/index.vue",
  "user-vue/pages/auth/wechat-callback/index.vue",
  "app-mobile/pages/auth/wechat-callback/index.vue",
].forEach((relativePath) => {
  assertContains(relativePath, "packages/mobile-core/src/Auth");
});
assertContains(
  "user-vue/pages/auth/login/index.vue",
  "../../../../packages/mobile-core/src/AuthLoginPage.vue",
);
assertContains(
  "app-mobile/pages/auth/login/index.vue",
  "../../../../packages/mobile-core/src/AuthLoginPage.vue",
);
assertContains(
  "user-vue/pages/auth/register/index.vue",
  "../../../../packages/mobile-core/src/AuthRegisterPage.vue",
);
assertContains(
  "app-mobile/pages/auth/register/index.vue",
  "../../../../packages/mobile-core/src/AuthRegisterPage.vue",
);
assertContains(
  "user-vue/pages/auth/reset-password/index.vue",
  "../../../../packages/mobile-core/src/AuthResetPasswordPage.vue",
);
assertContains(
  "app-mobile/pages/auth/reset-password/index.vue",
  "../../../../packages/mobile-core/src/AuthResetPasswordPage.vue",
);
assertContains(
  "user-vue/pages/auth/set-password/index.vue",
  "../../../../packages/mobile-core/src/AuthSetPasswordPage.vue",
);
assertContains(
  "app-mobile/pages/auth/set-password/index.vue",
  "../../../../packages/mobile-core/src/AuthSetPasswordPage.vue",
);
assertContains(
  "user-vue/pages/auth/wechat-callback/index.vue",
  "../../../../packages/mobile-core/src/AuthWechatCallbackPage.vue",
);
assertContains(
  "app-mobile/pages/auth/wechat-callback/index.vue",
  "../../../../packages/mobile-core/src/AuthWechatCallbackPage.vue",
);
assertContains(
  "packages/mobile-core/src/auth-portal-pages.js",
  "export function createLoginPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/auth-portal-pages.js",
  "export function createRegisterPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/auth-portal-pages.js",
  "export function createWechatCallbackPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/AuthLoginPage.vue",
  'import { createLoginPage } from "./auth-portal-pages.js";',
);
assertContains(
  "packages/mobile-core/src/AuthRegisterPage.vue",
  'import { createRegisterPage } from "./auth-portal-pages.js";',
);
assertContains(
  "packages/mobile-core/src/AuthResetPasswordPage.vue",
  'import { createResetPasswordPage } from "./auth-portal.js";',
);
assertContains(
  "packages/mobile-core/src/AuthSetPasswordPage.vue",
  'import { createSetPasswordPage } from "./auth-portal.js";',
);
assertContains(
  "packages/mobile-core/src/AuthWechatCallbackPage.vue",
  'import { createWechatCallbackPage } from "./auth-portal-pages.js";',
);
assertContains(
  "packages/mobile-core/src/AuthLoginPage.vue",
  '<style scoped lang="scss" src="./auth-login-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/AuthRegisterPage.vue",
  '<style scoped lang="scss" src="./auth-register-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/category-pages.js",
  "export function createCategoryPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/category-pages.js",
  "export function matchesCategoryPageShop(shop = {}, categoryConfig = {})",
);
assertContains(
  "packages/mobile-core/src/category-pages.js",
  'export function sortCategoryPageShops(shops = [], activeFilter = "default")',
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandLegacyPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandBuyPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandDeliverPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandDoPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandPickupPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "export function createErrandDetailPage(options = {})",
);
assertContains(
  "packages/mobile-core/src/consumer-errand-pages.js",
  "const components = resolveConsumerErrandPageComponents(options);",
);
assertContains(
  "packages/mobile-core/src/CategoryListPage.vue",
  'import { createCategoryPage } from "./category-pages.js";',
);
assertContains(
  "packages/mobile-core/src/CategoryListPage.vue",
  '<style scoped lang="scss" src="./category-page.scss"></style>',
);
[
  "packages/mobile-core/src/CategoryAllPage.vue",
  "packages/mobile-core/src/CategoryBurgerPage.vue",
  "packages/mobile-core/src/CategoryDessertPage.vue",
  "packages/mobile-core/src/CategoryDynamicPage.vue",
  "packages/mobile-core/src/CategoryFoodPage.vue",
  "packages/mobile-core/src/CategoryFruitPage.vue",
  "packages/mobile-core/src/CategoryMarketPage.vue",
  "packages/mobile-core/src/CategoryMedicinePage.vue",
].forEach((relativePath) => {
  assertContains(relativePath, 'extends: SharedCategoryListPage');
});
assertContains(
  "packages/mobile-core/src/ErrandBuyPage.vue",
  'import { createErrandBuyPage } from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandBuyPage.vue",
  '<style scoped lang="scss" src="./errand-form-pages.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ErrandDeliverPage.vue",
  'import { createErrandDeliverPage } from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandDeliverPage.vue",
  '<style scoped lang="scss" src="./errand-form-pages.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ErrandDoPage.vue",
  'import { createErrandDoPage } from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandDoPage.vue",
  '<style scoped lang="scss" src="./errand-form-pages.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ErrandPickupPage.vue",
  'import { createErrandPickupPage } from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandPickupPage.vue",
  '<style scoped lang="scss" src="./errand-form-pages.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ErrandDetailPage.vue",
  'import { createErrandDetailPage } from "./consumer-errand-pages.js";',
);
assertContains(
  "packages/mobile-core/src/ErrandLegacyPage.vue",
  'import { createErrandLegacyPage } from "./consumer-errand-pages.js";',
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
  "user-vue/components/HomeHeader.vue",
  "../../packages/mobile-core/src/HomeHeader.vue",
);
assertContains(
  "app-mobile/components/HomeHeader.vue",
  "../../packages/mobile-core/src/HomeHeader.vue",
);
assertContains(
  "user-vue/components/CategoryGrid.vue",
  "../../packages/mobile-core/src/CategoryGrid.vue",
);
assertContains(
  "app-mobile/components/CategoryGrid.vue",
  "../../packages/mobile-core/src/CategoryGrid.vue",
);
assertContains(
  "user-vue/components/FeaturedSection.vue",
  "../../packages/mobile-core/src/FeaturedSection.vue",
);
assertContains(
  "app-mobile/components/FeaturedSection.vue",
  "../../packages/mobile-core/src/FeaturedSection.vue",
);
assertContains(
  "user-vue/components/HomeShopCard.vue",
  "../../packages/mobile-core/src/HomeShopCard.vue",
);
assertContains(
  "app-mobile/components/HomeShopCard.vue",
  "../../packages/mobile-core/src/HomeShopCard.vue",
);
assertContains(
  "user-vue/components/LocationModal.vue",
  "../../packages/mobile-core/src/HomeLocationModal.vue",
);
assertContains(
  "app-mobile/components/LocationModal.vue",
  "../../packages/mobile-core/src/HomeLocationModal.vue",
);
assertContains(
  "packages/mobile-core/src/HomeHeader.vue",
  'import { createHomeHeaderComponent } from "./home-shell-components.js";',
);
assertContains(
  "packages/mobile-core/src/CategoryGrid.vue",
  'import { createCategoryGridComponent } from "./home-shell-components.js";',
);
assertContains(
  "packages/mobile-core/src/FeaturedSection.vue",
  'import { createFeaturedSectionComponent } from "./home-shell-components.js";',
);
assertContains(
  "packages/mobile-core/src/HomeShopCard.vue",
  'import { createHomeShopCardComponent } from "./home-shell-components.js";',
);
assertContains(
  "packages/mobile-core/src/HomeLocationModal.vue",
  'import { createHomeLocationModalComponent } from "./home-shell-components.js";',
);
assertContains(
  "user-vue/components/WeatherModal.vue",
  "../../packages/mobile-core/src/HomeWeatherModal.vue",
);
assertContains(
  "app-mobile/components/WeatherModal.vue",
  "../../packages/mobile-core/src/HomeWeatherModal.vue",
);
assertContains(
  "user-vue/components/ContactModal.vue",
  "../../packages/mobile-core/src/ContactModal.vue",
);
assertContains(
  "app-mobile/components/ContactModal.vue",
  "../../packages/mobile-core/src/ContactModal.vue",
);
assertContains(
  "user-vue/components/PhoneWarningModal.vue",
  "../../packages/mobile-core/src/PhoneWarningModal.vue",
);
assertContains(
  "app-mobile/components/PhoneWarningModal.vue",
  "../../packages/mobile-core/src/PhoneWarningModal.vue",
);
assertContains(
  "user-vue/components/CartModal.vue",
  "../../packages/mobile-core/src/CartModal.vue",
);
assertContains(
  "app-mobile/components/CartModal.vue",
  "../../packages/mobile-core/src/CartModal.vue",
);
assertContains(
  "user-vue/components/OrderDetailPopup.vue",
  "../../packages/mobile-core/src/OrderDetailPopup.vue",
);
assertContains(
  "app-mobile/components/OrderDetailPopup.vue",
  "../../packages/mobile-core/src/OrderDetailPopup.vue",
);
assertContains(
  "user-vue/components/CartBar.vue",
  "../../packages/mobile-core/src/CartBar.vue",
);
assertContains(
  "app-mobile/components/CartBar.vue",
  "../../packages/mobile-core/src/CartBar.vue",
);
assertContains(
  "user-vue/components/CategorySidebar.vue",
  "../../packages/mobile-core/src/CategorySidebar.vue",
);
assertContains(
  "app-mobile/components/CategorySidebar.vue",
  "../../packages/mobile-core/src/CategorySidebar.vue",
);
assertContains(
  "user-vue/components/EmptyState.vue",
  "../../packages/mobile-core/src/EmptyState.vue",
);
assertContains(
  "app-mobile/components/EmptyState.vue",
  "../../packages/mobile-core/src/EmptyState.vue",
);
assertContains(
  "user-vue/components/FilterBar.vue",
  "../../packages/mobile-core/src/FilterBar.vue",
);
assertContains(
  "app-mobile/components/FilterBar.vue",
  "../../packages/mobile-core/src/FilterBar.vue",
);
assertContains(
  "user-vue/components/MenuItem.vue",
  "../../packages/mobile-core/src/MenuItem.vue",
);
assertContains(
  "app-mobile/components/MenuItem.vue",
  "../../packages/mobile-core/src/MenuItem.vue",
);
assertContains(
  "user-vue/components/MenuNav.vue",
  "../../packages/mobile-core/src/MenuNav.vue",
);
assertContains(
  "app-mobile/components/MenuNav.vue",
  "../../packages/mobile-core/src/MenuNav.vue",
);
assertContains(
  "user-vue/components/PageHeader.vue",
  "../../packages/mobile-core/src/PageHeader.vue",
);
assertContains(
  "app-mobile/components/PageHeader.vue",
  "../../packages/mobile-core/src/PageHeader.vue",
);
assertContains(
  "user-vue/components/ShopCard.vue",
  "../../packages/mobile-core/src/ShopCard.vue",
);
assertContains(
  "app-mobile/components/ShopCard.vue",
  "../../packages/mobile-core/src/ShopCard.vue",
);
assertContains(
  "user-vue/components/SuccessModal.vue",
  "../../packages/mobile-core/src/SuccessModal.vue",
);
assertContains(
  "app-mobile/components/SuccessModal.vue",
  "../../packages/mobile-core/src/SuccessModal.vue",
);
assertContains(
  "packages/mobile-core/src/HomeWeatherModal.vue",
  'import { createHomeWeatherModalComponent } from "./home-weather-modal.js";',
);
assertContains(
  "packages/mobile-core/src/ContactModal.vue",
  'import { createContactModalComponent } from "./consumer-modal-components.js";',
);
assertContains(
  "packages/mobile-core/src/PhoneWarningModal.vue",
  'import { createPhoneWarningModalComponent } from "./consumer-modal-components.js";',
);
assertContains(
  "packages/mobile-core/src/CartModal.vue",
  'import { createCartModalComponent } from "./consumer-modal-components.js";',
);
assertContains(
  "packages/mobile-core/src/OrderDetailPopup.vue",
  'import { createOrderDetailPopupComponent } from "./consumer-modal-components.js";',
);
assertContains(
  "packages/mobile-core/src/CartBar.vue",
  'import { createCartBarComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/CategorySidebar.vue",
  'import { createCategorySidebarComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/EmptyState.vue",
  'import { createEmptyStateComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/FilterBar.vue",
  'import { createFilterBarComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/MenuItem.vue",
  'import { createMenuItemComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/MenuNav.vue",
  'import { createMenuNavComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/PageHeader.vue",
  'import { createPageHeaderComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/ShopCard.vue",
  'import { createShopCardComponent } from "./consumer-shop-components.js";',
);
assertContains(
  "packages/mobile-core/src/SuccessModal.vue",
  'import { createSuccessModalComponent } from "./consumer-shop-components.js";',
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
  "packages/mobile-core/src/OrderConfirmPage.vue",
  'import { createOrderConfirmPage } from "./order-confirm-page.js";',
);
assertContains(
  "packages/mobile-core/src/OrderConfirmPage.vue",
  '<style scoped lang="scss" src="./order-confirm-page.scss"></style>',
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
  "../../../../packages/mobile-core/src/MessageCenterPage.vue",
);
assertContains(
  "app-mobile/pages/message/index/index.vue",
  "../../../../packages/mobile-core/src/MessageCenterPage.vue",
);
assertContains(
  "user-vue/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/NotificationListPage.vue",
);
assertContains(
  "app-mobile/pages/message/notification-list/index.vue",
  "../../../../packages/mobile-core/src/NotificationListPage.vue",
);
assertContains(
  "user-vue/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
);
assertContains(
  "app-mobile/pages/message/notification-detail/index.vue",
  "../../../../packages/mobile-core/src/NotificationDetailPage.vue",
);
assertContains(
  "user-vue/pages/message/chat/index.vue",
  "../../../../packages/mobile-core/src/MessageChatPage.vue",
);
assertContains(
  "app-mobile/pages/message/chat/index.vue",
  "../../../../packages/mobile-core/src/MessageChatPage.vue",
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
  "../../../../packages/mobile-core/src/ProfileHomePage.vue",
);
assertContains(
  "app-mobile/pages/profile/index/index.vue",
  "../../../../packages/mobile-core/src/ProfileHomePage.vue",
);
assertContains(
  "packages/mobile-core/src/ProfileHomePage.vue",
  'import { createProfileHomePage } from "./profile-home.js";',
);
assertContains(
  "packages/mobile-core/src/ProfileHomePage.vue",
  '<style scoped lang="scss" src="./profile-home-page.scss"></style>',
);
assertContains(
  "packages/mobile-core/src/ProfileSettingsPage.vue",
  'import { createProfileSettingsPage } from "./profile-settings.js";',
);
assertContains(
  "packages/mobile-core/src/ProfileSettingsDetailPage.vue",
  'import { createProfileSettingsDetailPage } from "./profile-settings.js";',
);
assertContains(
  "user-vue/pages/profile/settings/index.vue",
  "../../../../packages/mobile-core/src/ProfileSettingsPage.vue",
);
assertContains(
  "app-mobile/pages/profile/settings/index.vue",
  "../../../../packages/mobile-core/src/ProfileSettingsPage.vue",
);
assertContains(
  "user-vue/pages/profile/settings/detail/index.vue",
  "../../../../../packages/mobile-core/src/ProfileSettingsDetailPage.vue",
);
assertContains(
  "app-mobile/pages/profile/settings/detail/index.vue",
  "../../../../../packages/mobile-core/src/ProfileSettingsDetailPage.vue",
);
assertContains(
  "user-vue/pages/profile/settings/detail/index.vue",
  "ProfileSettingsDetailPage",
);
assertContains(
  "app-mobile/pages/profile/settings/detail/index.vue",
  "ProfileSettingsDetailPage",
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
  "user-vue/pages/medicine/chat.vue",
  "consultMedicineAssistant",
);
assertNotContains(
  "app-mobile/pages/medicine/chat.vue",
  "consultMedicineAssistant",
);
assertNotContains(
  "user-vue/pages/medicine/chat.vue",
  "requireCurrentUserIdentity",
);
assertNotContains(
  "app-mobile/pages/medicine/chat.vue",
  "requireCurrentUserIdentity",
);
assertNotContains(
  "user-vue/pages/welcome/welcome/index.vue",
  "isUserLoggedIn()",
);
assertNotContains(
  "app-mobile/pages/welcome/welcome/index.vue",
  "isUserLoggedIn()",
);
assertNotContains(
  "user-vue/pages/welcome/welcome/index.vue",
  "goGuest()",
);
assertNotContains(
  "app-mobile/pages/welcome/welcome/index.vue",
  "goGuest()",
);
assertNotContains(
  "user-vue/pages/medicine/home.vue",
  "normalizeMedicineRuntimeSettings(response)",
);
assertNotContains(
  "app-mobile/pages/medicine/home.vue",
  "normalizeMedicineRuntimeSettings(response)",
);
assertNotContains(
  "user-vue/pages/medicine/home.vue",
  "createPhoneContactHelper({ recordPhoneContactClick })",
);
assertNotContains(
  "app-mobile/pages/medicine/home.vue",
  "createPhoneContactHelper({ recordPhoneContactClick })",
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
  "user-vue/pages/charity/index.vue",
  "buildCharityLeaderboardToShow(",
);
assertNotContains(
  "app-mobile/pages/charity/index.vue",
  "buildCharityLeaderboardToShow(",
);
assertNotContains(
  "user-vue/pages/charity/index.vue",
  "normalizeCharityJoinUrl(url)",
);
assertNotContains(
  "app-mobile/pages/charity/index.vue",
  "normalizeCharityJoinUrl(url)",
);
assertNotContains(
  "user-vue/pages/profile/vip-center/index.vue",
  "import options from './page-options.js'",
);
assertNotContains(
  "app-mobile/pages/profile/vip-center/index.vue",
  "import options from './page-options.js'",
);
assertNotContains(
  "user-vue/pages/shop/menu/index.vue",
  "fetchShopDetail",
);
assertNotContains(
  "app-mobile/pages/shop/menu/index.vue",
  "fetchShopDetail",
);
assertNotContains(
  "user-vue/pages/shop/menu/index.vue",
  "CartModal",
);
assertNotContains(
  "app-mobile/pages/shop/menu/index.vue",
  "CartModal",
);
assertNotContains(
  "user-vue/pages/dining-buddy/index.vue",
  "const QUIZ_STORAGE_KEY =",
);
assertNotContains(
  "app-mobile/pages/dining-buddy/index.vue",
  "const QUIZ_STORAGE_KEY =",
);
assertNotContains(
  "user-vue/pages/dining-buddy/index.vue",
  "createDiningBuddyPage({",
);
assertNotContains(
  "app-mobile/pages/dining-buddy/index.vue",
  "createDiningBuddyPage({",
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
[
  "user-vue/pages/category/all/index.vue",
  "user-vue/pages/category/burger/index.vue",
  "user-vue/pages/category/dessert/index.vue",
  "user-vue/pages/category/food/index.vue",
  "user-vue/pages/category/fruit/index.vue",
  "user-vue/pages/category/index/index.vue",
  "user-vue/pages/category/market/index.vue",
  "user-vue/pages/category/medicine/index.vue",
  "app-mobile/pages/category/all/index.vue",
  "app-mobile/pages/category/burger/index.vue",
  "app-mobile/pages/category/dessert/index.vue",
  "app-mobile/pages/category/food/index.vue",
  "app-mobile/pages/category/fruit/index.vue",
  "app-mobile/pages/category/index/index.vue",
  "app-mobile/pages/category/market/index.vue",
  "app-mobile/pages/category/medicine/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "import { fetchShops }");
  assertNotContains(relativePath, "filteredShops()");
  assertNotContains(relativePath, "matchCategory(shop");
});
[
  "user-vue/pages/errand/buy/index.vue",
  "user-vue/pages/errand/deliver/index.vue",
  "user-vue/pages/errand/do/index.vue",
  "user-vue/pages/errand/pickup/index.vue",
  "user-vue/pages/errand/detail/index.vue",
  "user-vue/pages/errand/index/index.vue",
  "app-mobile/pages/errand/buy/index.vue",
  "app-mobile/pages/errand/deliver/index.vue",
  "app-mobile/pages/errand/do/index.vue",
  "app-mobile/pages/errand/pickup/index.vue",
  "app-mobile/pages/errand/detail/index.vue",
  "app-mobile/pages/errand/index/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "createOrder(");
  assertNotContains(relativePath, "buildErrandOrderPayload");
  assertNotContains(relativePath, "ensureErrandServiceOpen");
  assertNotContains(relativePath, "uni.redirectTo({ url: '/pages/errand/home/index' })");
});
[
  "user-vue/pages/errand/home/index.vue",
  "app-mobile/pages/errand/home/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchOrders(");
  assertNotContains(relativePath, "buildErrandHomeViewModel(");
  assertNotContains(relativePath, "loadPlatformRuntimeSettings(");
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
assertNotContains("app-mobile/App.vue", "async validateAuth()");
assertNotContains("app-mobile/App.vue", "async syncPushRegistration()");
assertNotContains("app-mobile/App.vue", "async syncRealtimeNotifyBridge()");
assertNotContains("app-mobile/App.vue", "async syncRTCInviteBridge()");
assertNotContains("app-mobile/App.vue", "clearAuthData()");
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
  assertNotContains(relativePath, "createOrderRefundPage({");
});
[
  "user-vue/pages/order/review/index.vue",
  "app-mobile/pages/order/review/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "formatOrderData(data) {");
  assertNotContains(relativePath, "const shop = data.shop || {}");
  assertNotContains(relativePath, "createOrderReviewPage({");
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
  "user-vue/pages/order/detail/index.vue",
  "app-mobile/pages/order/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "platform: '");
});
[
  "user-vue/pages/order/confirm/index.vue",
  "app-mobile/pages/order/confirm/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "createOrderConfirmPage({");
});
[
  "user-vue/pages/order/detail/index.vue",
  "app-mobile/pages/order/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "page-logic.js");
  assertNotContains(relativePath, "export default pageLogic");
});
[
  "user-vue/pages/order/list/index.vue",
  "app-mobile/pages/order/list/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "page-logic.js");
  assertNotContains(relativePath, "order-list-utils");
  assertNotContains(relativePath, "export default pageLogic");
});
[
  "user-vue/pages/profile/wallet/bills/index.vue",
  "app-mobile/pages/profile/wallet/bills/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "page-logic.js");
  assertNotContains(relativePath, "export default pageLogic");
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
  assertNotContains(relativePath, "shop-detail-logic.js");
  assertNotContains(relativePath, "createShopDetailState()");
  assertNotContains(
    relativePath,
    `:style="{ color: isCollected ? '#f59e0b' : '#fff' }"`,
  );
});
[
  "user-vue/pages/product/detail/index.vue",
  "app-mobile/pages/product/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchProductDetail");
  assertNotContains(relativePath, "addToCart()");
});
[
  "user-vue/pages/product/popup-detail/index.vue",
  "app-mobile/pages/product/popup-detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchProductDetail");
  assertNotContains(relativePath, "handleAddCart()");
});
[
  "user-vue/pages/product/featured/index.vue",
  "app-mobile/pages/product/featured/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchHomeFeed");
  assertNotContains(relativePath, "goProductDetail(item)");
});
[
  "user-vue/pages/location/select/index.vue",
  "app-mobile/pages/location/select/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "getCurrentLocation");
  assertNotContains(relativePath, "handleRelocate()");
});
[
  "user-vue/pages/shop/cart-popup/index.vue",
  "app-mobile/pages/shop/cart-popup/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchMenuItems");
  assertNotContains(relativePath, "handleClear()");
});
[
  "user-vue/pages/shop/list/index.vue",
  "app-mobile/pages/shop/list/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "fetchShops");
  assertNotContains(relativePath, "goDetail(id)");
});
["packages/mobile-core/src/shop-detail-page.js"].forEach((relativePath) => {
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
  assertNotContains(relativePath, "createMessageCenterPage({");
});
[
  "user-vue/pages/message/notification-list/index.vue",
  "app-mobile/pages/message/notification-list/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const NOTIFICATION_READ_EVENT =");
  assertNotContains(relativePath, "async loadNotifications()");
  assertNotContains(relativePath, "handleNotificationRead(payload = {})");
  assertNotContains(relativePath, "createNotificationListPage({");
});
[
  "user-vue/pages/message/notification-detail/index.vue",
  "app-mobile/pages/message/notification-detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const NOTIFICATION_READ_EVENT =");
  assertNotContains(relativePath, "async ackPushOpened(messageId)");
  assertNotContains(relativePath, "async markAsRead(id)");
  assertNotContains(relativePath, "createNotificationDetailPage({");
});
[
  "user-vue/pages/message/chat/index.vue",
  "app-mobile/pages/message/chat/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "import pageLogic from './page-logic.js'");
  assertNotContains(relativePath, "createMessageChatPage({");
});
[
  "user-vue/pages/profile/customer-service/index.vue",
  "app-mobile/pages/profile/customer-service/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "import pageLogic from './page-logic.js'");
  assertNotContains(relativePath, "createCustomerServicePage({");
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
  assertNotContains(relativePath, "createProfileHomePage({");
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
  assertNotContains(relativePath, "createProfileSettingsPage({");
});
[
  "user-vue/pages/profile/settings/detail/index.vue",
  "app-mobile/pages/profile/settings/detail/index.vue",
].forEach((relativePath) => {
  assertNotContains(relativePath, "const SETTINGS_STORAGE_KEY = 'appSettings'");
  assertNotContains(relativePath, "const DEFAULT_SETTINGS = {");
  assertNotContains(relativePath, "calculateCacheSize()");
  assertNotContains(relativePath, "createProfileSettingsDetailPage({");
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
assertContains("socket-server/.env.example", "SOCKET_SERVER_API_SECRET=");
assertContains(
  "socket-server/trustedApi.js",
  "SOCKET_SERVER_API_SECRET is required for socket-server in production-like environments",
);
assertContains("socket-server/trustedApi.js", "x-socket-server-secret");
assertContains("socket-server/index.js", "validateTrustedSocketTokenRequest");
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
