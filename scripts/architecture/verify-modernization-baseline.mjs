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
  "packages/contracts/src/http.test.mjs",
  "packages/client-sdk/src/index.js",
  "packages/client-sdk/src/mobile-capabilities.js",
  "packages/client-sdk/src/mobile-capabilities.test.mjs",
  "packages/client-sdk/src/onboarding-invite.js",
  "packages/client-sdk/src/onboarding-invite.test.mjs",
  "packages/domain-core/src/index.js",
  "packages/mobile-core/src/index.js",
  "packages/admin-core/src/index.js",
  "packages/admin-core/src/menu-groups.js",
  "packages/admin-core/src/temporary-credential.js",
  "packages/admin-core/src/paginated-resources.js",
  "packages/admin-core/src/paginated-resources.test.mjs",
  "packages/admin-core/src/DesktopShellApp.vue",
  "admin-win/src/App.vue",
  "admin-mac/src/App.vue",
].forEach(assertExists);

[
  [
    "app-mobile/pages/order/list/page-logic.js",
    "../../../../shared/mobile-common/order-list-page.js",
  ],
  [
    "app-mobile/pages/order/detail/page-logic.js",
    "../../../../shared/mobile-common/order-detail-page.js",
  ],
  [
    "app-mobile/pages/order/confirm/index.vue",
    "../../../../shared/mobile-common/order-confirm-page.js",
  ],
  [
    "app-mobile/pages/message/chat/page-logic.js",
    "../../../../shared/mobile-common/message-chat-page.js",
  ],
  [
    "app-mobile/pages/profile/customer-service/page-logic.js",
    "../../../../shared/mobile-common/customer-service-page.js",
  ],
  [
    "app-mobile/pages/profile/wallet/index.vue",
    "../../../../shared/mobile-common/wallet-overview-page.js",
  ],
  [
    "user-vue/pages/order/list/page-logic.js",
    "../../../../shared/mobile-common/order-list-page.js",
  ],
  [
    "user-vue/pages/order/detail/page-logic.js",
    "../../../../shared/mobile-common/order-detail-page.js",
  ],
  [
    "user-vue/pages/order/confirm/index.vue",
    "../../../../shared/mobile-common/order-confirm-page.js",
  ],
  [
    "user-vue/pages/message/chat/page-logic.js",
    "../../../../shared/mobile-common/message-chat-page.js",
  ],
  [
    "user-vue/pages/profile/customer-service/page-logic.js",
    "../../../../shared/mobile-common/customer-service-page.js",
  ],
  [
    "user-vue/pages/profile/wallet/index.vue",
    "../../../../shared/mobile-common/wallet-overview-page.js",
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
  [
    "rider-app/pages/hall/index-logic.ts",
    "../../shared-ui/riderOrderStore",
  ],
  [
    "rider-app/pages/tasks/index-logic.ts",
    "../../shared-ui/riderOrderStore",
  ],
  [
    "rider-app/pages/profile/index-logic.ts",
    "../../shared-ui/riderOrderStore",
  ],
  [
    "rider-app/pages/profile/wallet-bills/index-logic.ts",
    "../../../../shared/mobile-common/wallet-bills-page",
  ],
  [
    "rider-app/pages/profile/wallet-recharge/index.vue",
    "../../../../shared/mobile-common/wallet-recharge-page",
  ],
  [
    "rider-app/pages/profile/wallet-withdraw/index.vue",
    "../../../../shared/mobile-common/wallet-withdraw-page",
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
assertContains(
  "admin-vue/src/views/Users.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/views/Merchants.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "createOnboardingInviteApi",
);
assertContains(
  "merchant-app/shared-ui/api.ts",
  "createMobilePushApi",
);
assertContains(
  "rider-app/shared-ui/api.ts",
  "createMobilePushApi",
);
assertContains(
  "rider-app/shared-ui/api.ts",
  "createRiderPreferenceApi",
);
assertContains(
  "user-vue/shared-ui/api.js",
  "createMobilePushApi",
);
assertContains(
  "app-mobile/shared-ui/api.js",
  "createMobilePushApi",
);
assertContains(
  "rider-app/pages/profile/order-settings.vue",
  "extractRiderPreferenceSettings",
);
assertContains(
  "rider-app/components/dispatch-popup-logic.ts",
  "extractRiderPreferenceSettings",
);
assertContains(
  "admin-vue/src/views/Users.vue",
  "extractTemporaryCredential(",
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
assertContains("admin-vue/src/router/index.js", "resolveProtectedView(item.name)");
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
  'respondAdminWalletInvalidRequest(c)',
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
  `"temporaryCredential": temporaryCredential`,
);
assertContains(
  "backend/go/internal/handler/admin_handler.go",
  'respondAdminSuccess(c, "管理员账号列表加载成功", admins)',
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
assertNotContains(
  "backend/go/internal/service/admin_service.go",
  "hashPassword(defaultAdminPassword)",
);
assertNotContains(
  "backend/go/internal/repository/admin_models.go",
  'default:super_admin',
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
  'BOOTSTRAP_ADMIN_PASSWORD: ${BOOTSTRAP_ADMIN_PASSWORD:-123456}',
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  'JWT_SECRET: ${JWT_SECRET:-yuexiang-dev-secret-key-change-in-production-32chars}',
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  'TOKEN_API_SECRET: ${TOKEN_API_SECRET:-compose-token-api-secret}',
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  'BANK_PAYOUT_ALLOW_STUB: ${BANK_PAYOUT_ALLOW_STUB:-true}',
);
assertNotContains(
  "backend/docker/docker-compose.yml",
  'RABBITMQ_DEFAULT_PASS: admin_password',
);
assertNotContains(
  "backend/go/.env.example",
  "JWT_SECRET=yuexiang-dev-secret-key-change-in-production-32chars",
);
assertNotContains(
  "scripts/verify-im-e2e.mjs",
  "DEFAULT_JWT_SECRET",
);
assertNotContains(
  "scripts/verify-im-e2e.mjs",
  "process.env.JWT_SECRET || DEFAULT_JWT_SECRET",
);
assertNotContains(
  "admin-app/pages/work-password/work-password.vue",
  "response.newPassword ? response.newPassword : '123456'",
);
assertNotContains(
  "admin-vue/src/views/Users.vue",
  "密码重置成功！新密码为：",
);
assertNotContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "骑手密码重置成功！新密码为：",
);
assertNotContains(
  "admin-vue/src/views/Merchants.vue",
  "新密码：<strong",
);
assertNotContains(
  "admin-vue/src/views/ManagementCenter.vue",
  "新密码：${newPassword}",
);
assertNotContains(
  "scripts/install-all.mjs",
  'console.log(`  密码:   ${runtimeValues.BOOTSTRAP_ADMIN_PASSWORD}`)',
);
assertNotContains(
  "scripts/install-all.mjs",
  'console.log(`  密码: ${runtimeValues.SYSTEM_LOG_DELETE_PASSWORD}`)',
);
assertNotContains(
  "scripts/lib/management/cli.mjs",
  "console.log(`初始密码：${payload.newPassword}`)",
);
assertNotContains(
  "scripts/lib/management/cli.mjs",
  "console.log(`新密码：${payload.newPassword}`)",
);
assertNotContains(
  "scripts/lib/management/cli.mjs",
  "revealSensitive: true",
);
assertNotContains(
  "scripts/lib/management/menu.mjs",
  "输入管理员类型 admin/super_admin', 'super_admin'",
);
assertContains(
  "backend/bff/src/utils/goProxy.js",
  "const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'pragma', 'expires', 'x-content-type-options'];",
);
assertContains(
  "backend/bff/src/utils/apiEnvelope.js",
  "function buildErrorEnvelopePayload(req, status, message, options = {})",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "buildErrorEnvelopePayload(req, status, message, {",
);
assertContains(
  "backend/bff/src/controllers/authController.js",
  "legacy: { statusCode: status }",
);
assertNotContains(
  "backend/bff/src/controllers/authController.js",
  "debug:",
);
assertContains(
  "backend/bff/src/middleware/errorHandler.js",
  "buildErrorEnvelopePayload(req, 413, '文件大小不能超过10MB'",
);
assertContains(
  "package.json",
  '"verify:contracts-tests": "node --test packages/contracts/src/http.test.mjs"',
);
assertContains(
  "package.json",
  '"verify:admin-core-tests": "node --test packages/admin-core/src/paginated-resources.test.mjs packages/admin-core/src/system-log-resources.test.mjs"',
);
assertContains(
  "package.json",
  '"verify:client-sdk-tests": "node --test packages/client-sdk/src/mobile-capabilities.test.mjs packages/client-sdk/src/onboarding-invite.test.mjs"',
);
assertContains(
  "admin-vue/src/views/Users.vue",
  "extractAdminUserPage",
);
assertContains(
  "admin-vue/src/views/Merchants.vue",
  "extractAdminMerchantPage",
);
assertContains(
  "admin-vue/src/views/InviteLanding.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/components/OldUserInviteFlow.vue",
  "createOnboardingInviteApi",
);
assertContains(
  "admin-vue/src/views/ridersHelpers.js",
  "extractAdminRiderPage",
);
assertContains(
  "admin-vue/src/views/ContactPhoneAudits.vue",
  "extractContactPhoneAuditPage",
);
assertContains(
  "admin-vue/src/views/RTCCallAudits.vue",
  "extractRTCCallAuditPage",
);
assertContains(
  "admin-vue/src/views/AdminRTCConsole.vue",
  "extractRTCCallAuditPage",
);
assertContains(
  "admin-vue/src/views/Login.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/ShopManageDetail.vue",
  "extractShopReviewPage",
);
assertContains(
  "admin-vue/src/views/ridersReviewActionHelpers.js",
  "extractRiderReviewPage",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "extractPaginatedItems(payload).items",
);
assertContains(
  "admin-vue/src/views/BlankPage.vue",
  "extractPaginatedItems(payload).items",
);
assertContains(
  "admin-vue/src/views/NotificationEditorPage.vue",
  "extractUploadAsset",
);
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "extractUploadAsset",
);
assertContains(
  "admin-vue/src/views/settingsHelpers.js",
  "extractUploadAsset",
);
assertContains(
  "admin-vue/src/views/ridersActionHelpers.js",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/HomeEntrySettings.vue",
  "extractEnvelopeData(data)",
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
  "admin-vue/src/views/ManagementCenter.vue",
  "extractPaginatedItems(data",
);
assertContains(
  "admin-vue/src/views/OfficialNotifications.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/OfficialNotificationsPage.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/OperationsCenter.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/ContentSettings.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/ShopMenuManage.vue",
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/MerchantProfile.vue",
  "extractPaginatedItems(data, { listKeys: ['shops'] }).items",
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
  "extractPaginatedItems(data).items",
);
assertContains(
  "admin-vue/src/views/Dashboard.vue",
  "extractPaginatedItems(payload).items",
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
  "admin-vue/src/views/HomeCampaigns.vue",
  "extractPaginatedItems(data, { listKeys: ['campaigns'] }).items",
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
  "extractPaginatedItems(payload",
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
  "admin-vue/src/views/Dashboard.vue",
  "const payload = extractEnvelopeData(data) || {}",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "const payload = extractEnvelopeData(res.data) || {};",
);
assertContains(
  "admin-vue/src/views/settingsHelpers/sms.js",
  "normalizeSMSConfig(extractEnvelopeData(res.data) || {})",
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
  "data = extractEnvelopeData(response.data);",
);
assertContains(
  "admin-vue/src/views/dataManagementBundleHelpers.js",
  "request.get('/api/data-exports/system-settings').then((res) => extractEnvelopeData(res.data))",
);
assertContains(
  "admin-vue/src/views/apiManagementHelpers.js",
  "extractEnvelopeData(data)",
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
  'const data = normalizeAssetUrlFields(req, response.data, ["ios_url", "android_url", "mini_program_qr_url"]);',
);
assertContains(
  "backend/bff/src/services/adminSettingsService.js",
  'const data = normalizeAssetUrlFields(req, response.data, ["imageUrl", "image_url", "url", "asset_url"]);',
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
  "admin-vue/src/views/CouponLanding.vue",
  "extractEnvelopeData(data)",
);
assertContains(
  "admin-vue/src/views/PaymentCenter.vue",
  "extractErrorMessage(error",
);
assertContains(
  "admin-vue/src/views/FinanceCenter.vue",
  "extractEnvelopeData(res.data)",
);
assertContains(
  "backend/go/internal/handler/shop_handler.go",
  'respondEnvelope(c, http.StatusOK, "SHOP_REVIEW_LISTED"',
);
assertContains(
  "backend/go/internal/handler/shop_handler.go",
  'respondSuccessEnvelope(c, "商户店铺列表加载成功"',
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
assertContains(
  "backend/bff/src/config/index.js",
  "BFF requires BFF_CORS_ORIGINS or explicit ADMIN_WEB_BASE_URL/SITE_WEB_BASE_URL in production-like environments",
);

console.log("modernization baseline checks passed");
