import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import InviteLanding from '@/views/InviteLanding.vue'
import CouponLanding from '@/views/CouponLanding.vue'
import AccessDenied from '@/views/AccessDenied.vue'
import AppDownloadLanding from '@/views/AppDownloadLanding.vue'
import { getAppRuntime, getToken } from '@/utils/runtime'

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
  { path: '/home-entry-settings', name: 'home-entry-settings', title: '首页入口配置' },
  { path: '/errand-settings', name: 'errand-settings', title: '跑腿配置' },
  { path: '/dining-buddy-governance', name: 'dining-buddy-governance', title: '同频饭友治理' },
  { path: '/featured-products', name: 'featured-products', title: '今日推荐' },
  { path: '/home-campaigns', name: 'home-campaigns', title: '首页推广' },
  { path: '/contact-phone-audits', name: 'contact-phone-audits', title: '电话联系审计' },
  { path: '/rtc-call-audits', name: 'rtc-call-audits', title: 'RTC 通话审计' },
  { path: '/after-sales', name: 'after-sales', title: '售后服务' },
  { path: '/operations-center', name: 'operations-center', title: '运营管理' },
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
  'home-entry-settings': () => import('@/views/HomeEntrySettings.vue'),
  'errand-settings': () => import('@/views/ErrandSettings.vue'),
  'dining-buddy-governance': () => import('@/views/DiningBuddyGovernance.vue'),
  'featured-products': () => import('@/views/FeaturedProducts.vue'),
  'home-campaigns': () => import('@/views/HomeCampaigns.vue'),
  'contact-phone-audits': () => import('@/views/ContactPhoneAudits.vue'),
  'rtc-call-audits': () => import('@/views/RTCCallAudits.vue'),
  'after-sales': () => import('@/views/AfterSales.vue'),
  'operations-center': () => import('@/views/OperationsCenter.vue'),
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
  { path: '/download', name: 'download-landing', component: AppDownloadLanding, meta: { title: 'APP 下载' } },
  { path: '/access-denied', name: 'access-denied', component: AccessDenied, meta: { title: '访问受限' } },
  {
    path: '/',
    name: 'home',
    redirect: '/dashboard',
    meta: { requiresAuth: true, title: '首页' },
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

function resolveDocumentTitle(route) {
  const runtime = getAppRuntime()
  const routeTitle = typeof route?.meta?.title === 'string' ? route.meta.title.trim() : ''
  if (runtime === 'invite' || runtime === 'download') {
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
  const accessDeniedRoute = to.name === 'access-denied'
  const publicRuntime = runtime === 'invite' || runtime === 'download'

  if (runtime === 'invite' && to.path === '/') {
    next({ name: 'access-denied', query: { mode: 'invite-only' }, replace: true })
    return
  }
  if (runtime === 'invite' && (downloadPath || (!invitePath && !couponClaimPath && !accessDeniedRoute))) {
    next({ name: 'access-denied', query: { mode: 'invite-only' }, replace: true })
    return
  }
  if (runtime === 'download' && to.path === '/') {
    next({ name: 'download-landing', replace: true })
    return
  }
  if (runtime === 'download' && (invitePath || couponClaimPath || (!downloadPath && !accessDeniedRoute))) {
    next({ name: 'access-denied', query: { mode: 'download-only' }, replace: true })
    return
  }

  if (runtime === 'admin' && (invitePath || couponClaimPath || downloadPath)) {
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
  document.title = resolveDocumentTitle(to)
})

export default router
