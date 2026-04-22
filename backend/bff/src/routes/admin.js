const express = require('express');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const adminController = require('../controllers/adminController');
const adminDataController = require('../controllers/adminDataController');
const adminSettingsController = require('../controllers/adminSettingsController');
const systemLogsController = require('../controllers/systemLogsController');
const adminOperationsController = require('../controllers/adminOperationsController');
const onboardingInviteController = require('../controllers/onboardingInviteController');
const homeController = require('../controllers/homeController');
const contactController = require('../controllers/contactController');
const rtcController = require('../controllers/rtcController');
const diningBuddyController = require('../controllers/diningBuddyController');
const officialSiteController = require('../controllers/officialSiteController');
const financialRoutes = require('./financial');
const adminWalletRoutes = require('./adminWallet');
const {
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
} = require('../utils/apiEnvelope');

const router = express.Router();

function createRateLimitHandler(message, legacy = {}) {
  return function rateLimitHandler(req, res, _next, options = {}) {
    return res.status(options.statusCode || 429).json(
      buildErrorEnvelopePayload(req, options.statusCode || 429, message, {
        legacy,
      }),
    );
  };
}

const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX || 12),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('登录尝试过于频繁，请稍后再试'),
});

const smsRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.ADMIN_SMS_RATE_LIMIT_MAX || 6),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('验证码请求过于频繁，请稍后再试'),
});

const verifyTokenRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ADMIN_VERIFY_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('校验请求过于频繁，请稍后再试', { valid: false }),
});

const qrCreateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ADMIN_QR_CREATE_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('二维码创建过于频繁，请稍后再试'),
});

const qrPollRateLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: Number(process.env.ADMIN_QR_POLL_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('轮询过于频繁，请稍后再试'),
});

const qrActionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.ADMIN_QR_ACTION_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('操作过于频繁，请稍后再试'),
});

router.get('/health', (req, res) => {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  res.json(
    buildSuccessEnvelopePayload(req, 'admin route health ok', payload, {
      legacy: payload,
    }),
  );
});

router.post('/login', loginRateLimiter, adminController.login);
router.post('/send-admin-sms-code', smsRateLimiter, adminController.sendAdminSMSCode);
router.get('/verify-token', verifyTokenRateLimiter, adminController.verifyToken);
router.post('/qr-login/session', qrCreateRateLimiter, adminController.createQrLoginSession);
router.get('/qr-login/session/:ticket', qrPollRateLimiter, adminController.getQrLoginSessionStatus);
router.post('/qr-login/scan', qrActionRateLimiter, requireAdminAuth, adminController.scanQrLoginSession);
router.post('/qr-login/confirm', qrActionRateLimiter, requireAdminAuth, adminController.confirmQrLoginSession);

router.use(requireAdminAuth);

router.get('/home-campaigns', homeController.listCampaigns);
router.post('/home-campaigns', homeController.createCampaign);
router.put('/home-campaigns/:id', homeController.updateCampaign);
router.post('/home-campaigns/:id/:action', homeController.changeCampaignStatus);
router.get('/home-slots', homeController.getHomeSlots);
router.put('/home-slots', homeController.upsertLockedSlot);
router.get('/contact-phone-audits', contactController.listPhoneContactAudits);
router.get('/rtc-call-audits', rtcController.listRTCCallAudits);
router.post('/rtc-call-audits/cleanup-cycle', rtcController.runRTCRetentionCleanupCycle);
router.post('/rtc-call-audits/:callId/review', rtcController.reviewRTCCallAudit);
router.get('/admin/official-site/exposures', officialSiteController.listAdminExposures);
router.put('/admin/official-site/exposures/:id', officialSiteController.updateExposure);
router.get('/admin/official-site/cooperations', officialSiteController.listAdminCooperations);
router.put('/admin/official-site/cooperations/:id', officialSiteController.updateCooperation);
router.get('/admin/official-site/support/sessions', officialSiteController.listAdminSupportSessions);
router.get('/admin/official-site/support/sessions/:id/messages', officialSiteController.getAdminSupportMessages);
router.post('/admin/official-site/support/sessions/:id/messages', officialSiteController.appendAdminSupportMessage);
router.put('/admin/official-site/support/sessions/:id', officialSiteController.updateSupportSession);

router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.post('/admins/:id/reset-password', adminController.resetAdminPassword);
router.post('/admins/complete-bootstrap', adminController.completeBootstrapSetup);
router.post('/admins/change-password', adminController.changeOwnPassword);

router.get('/users', adminDataController.getUsers);
router.get('/users/export', adminDataController.exportData);
router.get('/users/:id', adminDataController.getUserById);
router.post('/users', adminDataController.createUser);
router.delete('/users/:id', adminDataController.deleteUser);
router.post('/users/:id/reset-password', adminOperationsController.resetUserPassword);
router.post('/users/:id/delete-orders', adminOperationsController.deleteUserOrders);
router.post('/users/delete-all', adminOperationsController.deleteAllUsers);
router.post('/users/import', adminDataController.importData);

router.get('/riders', adminDataController.getRiders);
router.get('/riders/export', adminDataController.exportData);
router.get('/riders/:id', adminDataController.getRiderById);
router.post('/riders', adminDataController.createRider);
router.put('/riders/:id', adminDataController.updateRider);
router.delete('/riders/:id', adminOperationsController.deleteRider);
router.post('/riders/:id/reset-password', adminOperationsController.resetRiderPassword);
router.post('/riders/:id/delete-orders', adminOperationsController.deleteRiderOrders);
router.post('/riders/delete-all', adminOperationsController.deleteAllRiders);
router.post('/riders/import', adminDataController.importData);

router.get('/orders', adminDataController.getOrders);
router.post('/orders/delete-all', adminDataController.deleteAllOrders);
router.get('/orders/export', adminDataController.exportData);
router.post('/orders/import', adminDataController.importData);

router.get('/merchants', adminDataController.getMerchants);
router.post('/merchants', adminDataController.createMerchant);
router.post('/merchants/delete-all', adminOperationsController.deleteAllMerchants);
router.get('/merchants/export', adminDataController.exportData);
router.post('/merchants/import', adminDataController.importData);
router.get('/merchant/:id', adminDataController.getMerchantById);
router.put('/merchants/:id', adminDataController.updateMerchant);
router.delete('/merchants/:id', adminDataController.deleteMerchant);
router.post('/merchants/:id/reset-password', adminOperationsController.resetMerchantPassword);

router.post('/admin/onboarding/invites', onboardingInviteController.adminCreateInvite);
router.get('/admin/onboarding/invites', onboardingInviteController.adminListInvites);
router.post('/admin/onboarding/invites/:id/revoke', onboardingInviteController.adminRevokeInvite);
router.get('/admin/onboarding/invites/submissions', onboardingInviteController.adminListSubmissions);

router.post('/reorganize-role-ids/:type', adminOperationsController.reorganizeRoleIds);

router.get('/stats', adminDataController.getStats);
router.get('/realtime/stats', adminDataController.getRealtimeStats);
router.get('/user-ranks', adminDataController.getUserRanks);
router.get('/rider-ranks', adminDataController.getRiderRanks);
router.get('/dining-buddy/parties', diningBuddyController.adminListParties);
router.get('/dining-buddy/parties/:id', diningBuddyController.adminGetParty);
router.post('/dining-buddy/parties/:id/close', diningBuddyController.adminCloseParty);
router.post('/dining-buddy/parties/:id/reopen', diningBuddyController.adminReopenParty);
router.get('/dining-buddy/parties/:id/messages', diningBuddyController.adminListMessages);
router.delete('/dining-buddy/messages/:id', diningBuddyController.adminDeleteMessage);
router.get('/dining-buddy/reports', diningBuddyController.adminListReports);
router.post('/dining-buddy/reports/:id/resolve', diningBuddyController.adminResolveReport);
router.post('/dining-buddy/reports/:id/reject', diningBuddyController.adminRejectReport);
router.get('/dining-buddy/sensitive-words', diningBuddyController.adminListSensitiveWords);
router.post('/dining-buddy/sensitive-words', diningBuddyController.adminCreateSensitiveWord);
router.put('/dining-buddy/sensitive-words/:id', diningBuddyController.adminUpdateSensitiveWord);
router.delete('/dining-buddy/sensitive-words/:id', diningBuddyController.adminDeleteSensitiveWord);
router.get('/dining-buddy/user-restrictions', diningBuddyController.adminListUserRestrictions);
router.post('/dining-buddy/user-restrictions', diningBuddyController.adminCreateUserRestriction);
router.put('/dining-buddy/user-restrictions/:id', diningBuddyController.adminUpdateUserRestriction);
router.get('/dining-buddy/audit-logs', diningBuddyController.adminListAuditLogs);

router.get('/carousel', adminSettingsController.getCarousel);
router.post('/carousel', adminSettingsController.createCarousel);
router.put('/carousel/:id', adminSettingsController.updateCarousel);
router.delete('/carousel/:id', adminSettingsController.deleteCarousel);
router.get('/carousel-settings', adminSettingsController.getCarouselSettings);
router.post('/carousel-settings', adminSettingsController.updateCarouselSettings);

router.get('/push-messages', adminSettingsController.getPushMessages);
router.post('/push-messages', adminSettingsController.createPushMessage);
router.post('/push-messages/dispatch-cycle', adminSettingsController.runPushDispatchCycle);
router.get('/push-messages/:id/stats', adminSettingsController.getPushMessageStats);
router.get('/push-messages/:id/deliveries', adminSettingsController.getPushMessageDeliveries);
router.put('/push-messages/:id', adminSettingsController.updatePushMessage);
router.delete('/push-messages/:id', adminSettingsController.deletePushMessage);
router.get('/public-apis', adminSettingsController.getPublicAPIs);
router.post('/public-apis', adminSettingsController.createPublicAPI);
router.put('/public-apis/:id', adminSettingsController.updatePublicAPI);
router.delete('/public-apis/:id', adminSettingsController.deletePublicAPI);

if (config.adminDebugModeSettingsEnabled) {
  router.get('/debug-mode', adminSettingsController.getDebugMode);
  router.post('/debug-mode', adminSettingsController.updateDebugMode);
}
router.get('/sms-config', adminSettingsController.getSMSConfig);
router.post('/sms-config', adminSettingsController.updateSMSConfig);
router.get('/weather-config', adminSettingsController.getWeatherConfig);
router.post('/weather-config', adminSettingsController.updateWeatherConfig);
router.get('/wechat-login-config', adminSettingsController.getWechatLoginConfig);
router.post('/wechat-login-config', adminSettingsController.updateWechatLoginConfig);
router.get('/service-settings', adminSettingsController.getServiceSettings);
router.post('/service-settings', adminSettingsController.updateServiceSettings);
router.get('/home-entry-settings', adminSettingsController.getHomeEntrySettings);
router.post('/home-entry-settings', adminSettingsController.updateHomeEntrySettings);
router.get('/errand-settings', adminSettingsController.getErrandSettings);
router.post('/errand-settings', adminSettingsController.updateErrandSettings);
router.get('/merchant-taxonomy-settings', adminSettingsController.getMerchantTaxonomySettings);
router.post('/merchant-taxonomy-settings', adminSettingsController.updateMerchantTaxonomySettings);
router.get('/rider-rank-settings', adminSettingsController.getRiderRankSettings);
router.post('/rider-rank-settings', adminSettingsController.updateRiderRankSettings);
router.get('/dining-buddy-settings', adminSettingsController.getDiningBuddySettings);
router.post('/dining-buddy-settings', adminSettingsController.updateDiningBuddySettings);
router.get('/charity-settings', adminSettingsController.getCharitySettings);
router.post('/charity-settings', adminSettingsController.updateCharitySettings);
router.get('/vip-settings', adminSettingsController.getVIPSettings);
router.post('/vip-settings', adminSettingsController.updateVIPSettings);
router.get('/data-exports/system-settings', adminSettingsController.exportSystemSettings);
router.get('/data-exports/content-config', adminSettingsController.exportContentConfig);
router.get('/data-exports/api-config', adminSettingsController.exportAPIConfig);
router.get('/data-exports/payment-config', adminSettingsController.exportPaymentConfig);
router.post('/data-imports/system-settings', adminSettingsController.importSystemSettings);
router.post('/data-imports/content-config', adminSettingsController.importContentConfig);
router.post('/data-imports/api-config', adminSettingsController.importAPIConfig);
router.post('/data-imports/payment-config', adminSettingsController.importPaymentConfig);
router.post('/settings/clear-all-data', adminSettingsController.clearAllData);
router.get('/app-download-config', adminSettingsController.getAppDownloadConfig);
router.post('/app-download-config', adminSettingsController.updateAppDownloadConfig);
router.get('/system-logs', systemLogsController.listSystemLogs);
router.get('/system-health', systemLogsController.getSystemHealth);
router.post('/system-logs/delete', systemLogsController.deleteSystemLog);
router.post('/system-logs/clear', systemLogsController.clearSystemLogs);

router.get('/pay-config/mode', adminSettingsController.getPayMode);
router.post('/pay-config/mode', adminSettingsController.updatePayMode);
router.get('/pay-config/wxpay', adminSettingsController.getWxpayConfig);
router.post('/pay-config/wxpay', adminSettingsController.updateWxpayConfig);
router.get('/pay-config/alipay', adminSettingsController.getAlipayConfig);
router.post('/pay-config/alipay', adminSettingsController.updateAlipayConfig);
router.get('/weather', adminSettingsController.getWeather);

router.get('/coin-ratio', adminSettingsController.getCoinRatio);
router.post('/coin-ratio', adminSettingsController.updateCoinRatio);
router.post('/recharge', adminSettingsController.adminRecharge);

router.use('/financial', financialRoutes);
router.use('/wallet', adminWalletRoutes);

module.exports = router;
