const express = require('express');

const shopRoutes = require('./shop');
const orderRoutes = require('./order');
const userRoutes = require('./user');
const messageRoutes = require('./message');
const productRoutes = require('./product');
const authRoutes = require('./auth');
const notificationRoutes = require('./notification');
const syncRoutes = require('./sync');
const adminRoutes = require('./admin');
const riderRoutes = require('./rider');
const pointsRoutes = require('./points');
const cooperationRoutes = require('./cooperation');
const inviteRoutes = require('./invite');
const diningBuddyRoutes = require('./diningBuddy');
const medicineRoutes = require('./medicine');
const walletRoutes = require('./wallet');
const couponRoutes = require('./coupon');
const afterSalesRoutes = require('./afterSales');
const groupbuyRoutes = require('./groupbuy');
const opNotificationRoutes = require('./opNotification');
const uploadRoutes = require('./upload');
const reviewRoutes = require('./review');
const riderReviewRoutes = require('./riderReview');
const mobileRoutes = require('./mobile');
const contactController = require('../controllers/contactController');

const authController = require('../controllers/authController');
const shopController = require('../controllers/shopController');
const productController = require('../controllers/productController');
const groupbuyController = require('../controllers/groupbuyController');
const afterSalesController = require('../controllers/afterSalesController');
const onboardingInviteController = require('../controllers/onboardingInviteController');
const adminSettingsController = require('../controllers/adminSettingsController');
const homeController = require('../controllers/homeController');

const router = express.Router();

router.use('/shops', shopRoutes);
router.use('/orders', orderRoutes);
router.use('/user', userRoutes);
router.use('/messages', messageRoutes);
router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sync', syncRoutes);
router.use('/riders', riderRoutes);
router.use('/points', pointsRoutes);
router.use('/cooperations', cooperationRoutes);
router.use('/invite', inviteRoutes);
router.use('/dining-buddy', diningBuddyRoutes);
router.use('/medicine', medicineRoutes);
router.use('/wallet', walletRoutes);
router.use('/coupons', couponRoutes);
router.use('/after-sales', afterSalesRoutes);
router.use('/groupbuy', groupbuyRoutes);
router.use('/op-notifications', opNotificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/reviews', reviewRoutes);
router.use('/rider-reviews', riderReviewRoutes);
router.use('/mobile', mobileRoutes);
router.post('/contact/phone-clicks', contactController.recordPhoneContactClick);

router.post('/merchant/groupbuy/vouchers/redeem-by-scan', groupbuyController.redeemByScan);
router.post('/merchant/groupbuy/refunds', afterSalesController.createMerchantGroupbuyRefund);
router.get('/merchants/:merchantId/shops', shopController.getMerchantShops);

router.get('/categories', productController.getCategories);
router.post('/categories', productController.createCategory);
router.put('/categories/:id', productController.updateCategory);
router.delete('/categories/:id', productController.deleteCategory);
router.get('/banners', productController.getBanners);
router.post('/banners', productController.createBanner);
router.put('/banners/:id', productController.updateBanner);
router.delete('/banners/:id', productController.deleteBanner);
router.get('/featured-products', productController.getFeaturedProducts);
router.get('/home/feed', homeController.getHomeFeed);

router.get('/onboarding/invites/:token', onboardingInviteController.publicGetInvite);
router.post('/onboarding/invites/:token/submit', onboardingInviteController.publicSubmitInvite);
router.get('/public/app-download-config', adminSettingsController.getAppDownloadConfig);
router.get('/public/weather', adminSettingsController.getWeather);
router.get('/public/runtime-settings', adminSettingsController.getPublicRuntimeSettings);
router.get('/public/charity-settings', adminSettingsController.getPublicCharitySettings);
router.get('/public/vip-settings', adminSettingsController.getPublicVIPSettings);

router.get('/captcha', authController.getCaptcha);
router.post('/request-sms-code', authController.requestSMSCode);
router.post('/verify-sms-code', authController.verifySMSCode);
router.post('/verify-sms-code-check', authController.verifySMSCodeCheck);

router.post('/auth/rider/login', authController.riderLogin);
router.post('/auth/merchant/login', authController.merchantLogin);
router.post('/auth/set-new-password', authController.setNewPassword);
router.post('/auth/rider/set-new-password', authController.riderSetNewPassword);
router.post('/auth/merchant/set-new-password', authController.merchantSetNewPassword);

router.use('/', adminRoutes);

module.exports = router;
