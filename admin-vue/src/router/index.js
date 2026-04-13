import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import InviteLanding from '@/views/InviteLanding.vue'
import CouponLanding from '@/views/CouponLanding.vue'
import AccessDenied from '@/views/AccessDenied.vue'
import { getAppRuntime, getToken } from '@/utils/runtime'
import { applyOfficialSiteSeo, clearOfficialSiteSeo, resolveOfficialSiteSeoConfig } from '@/utils/officialSiteSeo'
import { getSiteCookieConsent } from '@/utils/siteCookieConsent'

const protectedRoutes = [
  { path: '/dashboard', name: 'dashboard', title: '仪表盘' },
  { path: '/orders', name: 'orders', title: '订单管理' },
  { path: '/users', name: 'users', title: '用户管理' },
  { path: '/riders', name: 'riders', title: '骑手管理' },
  { path: '/rider-ranks', name: 'rider-ranks', title: '骑手等级' },
  { path: '/merchants', name: 'merchants', title: '商户管理' },
  { path: '/support-chat', name: 'support-chat', title: '客服工作台' },
  { path: '/monitor-chat', name: 'monitor-chat', title: '平台监控' },
  { path: '/blank-page', name: 'blank-page', title: '联调工作台' },
  { path: '/rtc-console', name: 'rtc-console', title: 'RTC 管理台' },
  { path: '/home-entry-settings', name: 'home-entry-settings', title: '首页入口配置' },
  { path: '/errand-settings', name: 'errand-settings', title: '跑腿配置' },
  { path: '/dining-buddy-governance', name: 'dining-buddy-governance', title: '同频饭友治理' },
  { path: '/featured-products', name: 'featured-products', title: '今日推荐' },
  { path: '/home-campaigns', name: 'home-campaigns', title: '首页推广' },
  { path: '/contact-phone-audits', name: 'contact-phone-audits', title: '电话联系审计' },
  { path: '/rtc-call-audits', name: 'rtc-call-audits', title: 'RTC 通话审计' },
  { path: '/after-sales', name: 'after-sales', title: '售后服务' },
  { path: '/operations-center', name: 'operations-center', title: '运营管理' },
  { path: '/official-site-center', name: 'official-site-center', title: '官网中心' },
  { path: '/finance-center', name: 'finance-center', title: '财务中心' },
  { path: '/transaction-logs', name: 'transaction-logs', title: '财务日志' },
  { path: '/payment-center', name: 'payment-center', title: '支付中心' },
  { path: '/management-center', name: 'management-center', title: '管理中心' },
  { path: '/coupon-management', name: 'coupon-management', title: '优惠券管理' },
  { path: '/settings', name: 'settings', title: '系统设置' },
  { path: '/merchant-taxonomy-settings', name: 'merchant-taxonomy-settings', title: '商户业务字典' },
  { path: '/rider-rank-settings', name: 'rider-rank-settings', title: '骑手等级配置' },
  { path: '/system-logs', name: 'system-logs', title: '系统日志' },
  { path: '/content-settings', name: 'content-settings', title: '内容设置' },
  { path: '/api-management', name: 'api-management', title: 'API 管理' },
  { path: '/api-permissions', name: 'api-permissions', title: 'API 权限管理' },
  { path: '/api-documentation', name: 'api-documentation', title: 'API 文档' },
]

const protectedViewMap = {
  dashboard: () => import('@/views/Dashboard.vue'),
  orders: () => import('@/views/Orders.vue'),
  users: () => import('@/views/Users.vue'),
  riders: () => import('@/views/Riders.vue'),
  'rider-ranks': () => import('@/views/RiderRanks.vue'),
  merchants: () => import('@/views/Merchants.vue'),
  'support-chat': () => import('@/views/SupportChat.vue'),
  'monitor-chat': () => import('@/views/MonitorChat.vue'),
  'blank-page': () => import('@/views/BlankPage.vue'),
  'rtc-console': () => import('@/views/AdminRTCConsole.vue'),
  'home-entry-settings': () => import('@/views/HomeEntrySettings.vue'),
  'errand-settings': () => import('@/views/ErrandSettings.vue'),
  'dining-buddy-governance': () => import('@/views/DiningBuddyGovernance.vue'),
  'featured-products': () => import('@/views/FeaturedProducts.vue'),
  'home-campaigns': () => import('@/views/HomeCampaigns.vue'),
  'contact-phone-audits': () => import('@/views/ContactPhoneAudits.vue'),
  'rtc-call-audits': () => import('@/views/RTCCallAudits.vue'),
  'after-sales': () => import('@/views/AfterSales.vue'),
  'operations-center': () => import('@/views/OperationsCenter.vue'),
  'official-site-center': () => import('@/views/OfficialSiteCenter.vue'),
  'finance-center': () => import('@/views/FinanceCenter.vue'),
  'transaction-logs': () => import('@/views/TransactionLogs.vue'),
  'payment-center': () => import('@/views/PaymentCenter.vue'),
  'management-center': () => import('@/views/ManagementCenter.vue'),
  'coupon-management': () => import('@/views/CouponManagement.vue'),
  settings: () => import('@/views/Settings.vue'),
  'merchant-taxonomy-settings': () => import('@/views/MerchantTaxonomySettings.vue'),
  'rider-rank-settings': () => import('@/views/RiderRankSettings.vue'),
  'system-logs': () => import('@/views/SystemLogs.vue'),
  'content-settings': () => import('@/views/ContentSettings.vue'),
  'api-management': () => import('@/views/ApiManagement.vue'),
  'api-permissions': () => import('@/views/ApiPermissions.vue'),
  'api-documentation': () => import('@/views/ApiDocumentation.vue'),
}

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { title: '登录' } },
  { path: '/invite/:token', name: 'invite-landing', component: InviteLanding, meta: { title: '邀请入驻' } },
  { path: '/coupon/:token', name: 'coupon-landing', component: CouponLanding, meta: { title: '优惠券领取' } },
  { path: '/access-denied', name: 'access-denied', component: AccessDenied, meta: { title: '访问受限' } },
  {
    path: '/',
    component: () => import('@/views/OfficialSiteLayout.vue'),
    meta: { publicSite: true, siteRuntimeOnly: true },
    children: [
      {
        path: '',
        name: 'site-home',
        component: () => import('@/views/OfficialSiteHome.vue'),
        meta: { title: '首页', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'news',
        name: 'site-news',
        component: () => import('@/views/OfficialSiteNews.vue'),
        meta: { title: '新闻资讯', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'news/:id',
        name: 'site-news-detail',
        component: () => import('@/views/OfficialSiteNewsDetail.vue'),
        meta: { title: '新闻详情', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'download',
        name: 'site-download',
        component: () => import('@/views/AppDownloadLanding.vue'),
        meta: { title: '平台下载', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'about',
        name: 'site-about',
        component: () => import('@/views/OfficialSiteAbout.vue'),
        meta: { title: '关于我们', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'privacy-policy',
        name: 'site-privacy-policy',
        component: () => import('@/views/OfficialSitePrivacyPolicy.vue'),
        meta: { title: '隐私政策', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'disclaimer',
        name: 'site-disclaimer',
        component: () => import('@/views/OfficialSiteDisclaimer.vue'),
        meta: { title: '免责声明', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'cookie-required',
        name: 'site-cookie-required',
        component: () => import('@/views/OfficialSiteCookieRequired.vue'),
        meta: { title: 'Cookie 说明', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'expose',
        alias: ['/exposures'],
        name: 'site-expose',
        component: () => import('@/views/OfficialSiteExposureBoard.vue'),
        meta: { title: '曝光店铺', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'expose/submit',
        alias: ['/exposures/submit'],
        name: 'site-expose-submit',
        component: () => import('@/views/OfficialSiteExposureBoard.vue'),
        meta: { title: '提交曝光', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'expose/:id',
        alias: ['/exposures/:id'],
        name: 'site-expose-detail',
        component: () => import('@/views/OfficialSiteExposureDetail.vue'),
        meta: { title: '曝光详情', publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: 'coop',
        alias: ['/cooperation'],
        name: 'site-coop',
        component: () => import('@/views/OfficialSiteCooperation.vue'),
        meta: { title: '商务合作', publicSite: true, siteRuntimeOnly: true },
      },
    ],
  },
  {
    path: '/merchants/:merchantId/shops/:shopId/menu',
    name: 'shop-menu-manage',
    component: () => import('@/views/ShopMenuManage.vue'),
    meta: { requiresAuth: true, title: '菜单管理', menuRoot: '/merchants' },
  },
  {
    path: '/merchants/:merchantId/shops/:shopId',
    name: 'shop-manage-detail',
    component: () => import('@/views/ShopManageDetail.vue'),
    meta: { requiresAuth: true, title: '店铺详情', menuRoot: '/merchants' },
  },
  {
    path: '/merchants/:id',
    name: 'merchant-profile',
    component: () => import('@/views/MerchantProfile.vue'),
    meta: { requiresAuth: true, title: '商户详情', menuRoot: '/merchants' },
  },
  {
    path: '/notifications',
    name: 'official-notifications',
    component: () => import('@/views/OfficialNotificationsPage.vue'),
    meta: { requiresAuth: true, title: '官方通知' },
  },
  {
    path: '/notifications/edit',
    name: 'notification-create',
    component: () => import('@/views/NotificationEditorPage.vue'),
    meta: { requiresAuth: true, title: '新建通知' },
  },
  {
    path: '/notifications/edit/:id',
    name: 'notification-edit',
    component: () => import('@/views/NotificationEditorPage.vue'),
    meta: { requiresAuth: true, title: '编辑通知' },
  },
  {
    path: '/notifications/preview/:id',
    name: 'notification-preview',
    component: () => import('@/views/NotificationPreviewPage.vue'),
    meta: { requiresAuth: true, title: '通知预览' },
  },
  {
    path: '/data-management',
    name: 'data-management',
    component: () => import('@/views/DataManagement.vue'),
    meta: { requiresAuth: true, title: '数据管理' },
  },
  ...protectedRoutes.map((item) => ({
    path: item.path,
    name: item.name,
    component: protectedViewMap[item.name] || (() => import('@/views/BlankPage.vue')),
    meta: { requiresAuth: true, title: item.title },
  })),
  { path: '/system-settings', redirect: '/settings' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

function isInvitePath(path) {
  return typeof path === 'string' && path.startsWith('/invite/')
}

function isDownloadPath(path) {
  return typeof path === 'string' && path === '/download'
}

function isCouponClaimPath(path) {
  return typeof path === 'string' && path.startsWith('/coupon/')
}

function isSitePath(path) {
  return path === '/' ||
    path === '/news' ||
    path.startsWith('/news/') ||
    path === '/download' ||
    path === '/about' ||
    path === '/privacy-policy' ||
    path === '/disclaimer' ||
    path === '/cookie-required' ||
    path === '/expose' ||
    path === '/expose/submit' ||
    path.startsWith('/expose/') ||
    path === '/exposures' ||
    path === '/exposures/submit' ||
    path.startsWith('/exposures/') ||
    path === '/coop' ||
    path === '/cooperation'
}

function resolveDocumentTitle(route) {
  const runtime = getAppRuntime()
  const routeTitle = typeof route?.meta?.title === 'string' ? route.meta.title.trim() : ''
  if (runtime === 'site') {
    if (routeTitle) {
      return `悦享e食 - ${routeTitle}`
    }
    return '悦享e食'
  }
  if (runtime === 'invite') {
    if (routeTitle) {
      return `悦享e食 - ${routeTitle}`
    }
    return '悦享e食'
  }
  if (routeTitle) {
    return `悦享e食管理后台 - ${routeTitle}`
  }
  return '悦享e食管理后台'
}

router.beforeEach((to, from, next) => {
  const runtime = getAppRuntime()
  const invitePath = isInvitePath(to.path)
  const downloadPath = isDownloadPath(to.path)
  const couponClaimPath = isCouponClaimPath(to.path)
  const sitePath = isSitePath(to.path)
  const accessDeniedRoute = to.name === 'access-denied'
  const publicRuntime = runtime === 'invite' || runtime === 'site'
  const siteMatchedRoute = to.matched.some((record) => record.meta?.publicSite)

  if (runtime === 'invite' && to.path === '/') {
    next({ name: 'access-denied', query: { mode: 'invite-only' }, replace: true })
    return
  }
  if (runtime === 'invite' && (downloadPath || (!invitePath && !couponClaimPath && !accessDeniedRoute))) {
    next({ name: 'access-denied', query: { mode: 'invite-only' }, replace: true })
    return
  }
  if (runtime === 'site' && accessDeniedRoute) {
    next({ name: 'site-home', replace: true })
    return
  }
  if (runtime === 'site' && !siteMatchedRoute && !sitePath) {
    next({ name: 'site-home', replace: true })
    return
  }

  if (runtime === 'site' && siteMatchedRoute) {
    const siteCookieConsent = getSiteCookieConsent()
    if (siteCookieConsent === 'accepted' && to.name === 'site-cookie-required') {
      const redirectPath = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
        ? to.query.redirect
        : '/'
      next({ path: redirectPath, replace: true })
      return
    }
  }

  if (runtime === 'admin' && (invitePath || couponClaimPath || downloadPath)) {
    next({ name: 'access-denied', query: { mode: 'admin-only' }, replace: true })
    return
  }
  if (runtime === 'admin' && to.path === '/') {
    next({ name: 'dashboard', replace: true })
    return
  }
  if (runtime === 'admin' && sitePath) {
    next({ name: 'access-denied', query: { mode: 'admin-only' }, replace: true })
    return
  }

  const token = getToken()
  if (!publicRuntime && to.meta.requiresAuth && !token) {
    next({ name: 'login', replace: true })
    return
  }

  next()
})

router.afterEach((to) => {
  if (typeof document === 'undefined') {
    return
  }
  const siteMatchedRoute = to.matched.some((record) => record.meta?.publicSite)
  if (siteMatchedRoute) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(to))
    return
  }
  clearOfficialSiteSeo()
  document.title = resolveDocumentTitle(to)
})

export default router
