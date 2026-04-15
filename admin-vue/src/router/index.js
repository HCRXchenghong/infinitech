import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Login.vue";
import InviteLanding from "@/views/InviteLanding.vue";
import CouponLanding from "@/views/CouponLanding.vue";
import AccessDenied from "@/views/AccessDenied.vue";
import { adminProtectedRoutes } from "@infinitech/admin-core/route-registry";
import { getAppRuntime, getToken } from "@/utils/runtime";
import {
  applyOfficialSiteSeo,
  clearOfficialSiteSeo,
  resolveOfficialSiteSeoConfig,
} from "@/utils/officialSiteSeo";
import { getSiteCookieConsent } from "@/utils/siteCookieConsent";

const protectedRoutes = adminProtectedRoutes;

const protectedViewMap = {
  dashboard: () => import("@/views/Dashboard.vue"),
  orders: () => import("@/views/Orders.vue"),
  users: () => import("@/views/Users.vue"),
  riders: () => import("@/views/Riders.vue"),
  "rider-ranks": () => import("@/views/RiderRanks.vue"),
  merchants: () => import("@/views/Merchants.vue"),
  "support-chat": () => import("@/views/SupportChat.vue"),
  "monitor-chat": () => import("@/views/MonitorChat.vue"),
  "blank-page": () => import("@/views/BlankPage.vue"),
  "rtc-console": () => import("@/views/AdminRTCConsole.vue"),
  "home-entry-settings": () => import("@/views/HomeEntrySettings.vue"),
  "errand-settings": () => import("@/views/ErrandSettings.vue"),
  "dining-buddy-governance": () => import("@/views/DiningBuddyGovernance.vue"),
  "featured-products": () => import("@/views/FeaturedProducts.vue"),
  "home-campaigns": () => import("@/views/HomeCampaigns.vue"),
  "contact-phone-audits": () => import("@/views/ContactPhoneAudits.vue"),
  "rtc-call-audits": () => import("@/views/RTCCallAudits.vue"),
  "after-sales": () => import("@/views/AfterSales.vue"),
  "operations-center": () => import("@/views/OperationsCenter.vue"),
  "official-site-center": () => import("@/views/OfficialSiteCenter.vue"),
  "official-notifications": () =>
    import("@/views/OfficialNotificationsPage.vue"),
  "finance-center": () => import("@/views/FinanceCenter.vue"),
  "transaction-logs": () => import("@/views/TransactionLogs.vue"),
  "payment-center": () => import("@/views/PaymentCenter.vue"),
  "management-center": () => import("@/views/ManagementCenter.vue"),
  "coupon-management": () => import("@/views/CouponManagement.vue"),
  settings: () => import("@/views/Settings.vue"),
  "merchant-taxonomy-settings": () =>
    import("@/views/MerchantTaxonomySettings.vue"),
  "rider-rank-settings": () => import("@/views/RiderRankSettings.vue"),
  "system-logs": () => import("@/views/SystemLogs.vue"),
  "data-management": () => import("@/views/DataManagement.vue"),
  "content-settings": () => import("@/views/ContentSettings.vue"),
  "api-management": () => import("@/views/ApiManagement.vue"),
  "api-permissions": () => import("@/views/ApiPermissions.vue"),
  "api-documentation": () => import("@/views/ApiDocumentation.vue"),
};

function resolveProtectedView(routeName) {
  const view = protectedViewMap[routeName];
  if (view) {
    return view;
  }
  throw new Error(`missing admin protected view mapping for route: ${routeName}`);
}

const routes = [
  { path: "/login", name: "login", component: Login, meta: { title: "登录" } },
  {
    path: "/invite/:token",
    name: "invite-landing",
    component: InviteLanding,
    meta: { title: "邀请入驻" },
  },
  {
    path: "/coupon/:token",
    name: "coupon-landing",
    component: CouponLanding,
    meta: { title: "优惠券领取" },
  },
  {
    path: "/access-denied",
    name: "access-denied",
    component: AccessDenied,
    meta: { title: "访问受限" },
  },
  {
    path: "/",
    component: () => import("@/views/OfficialSiteLayout.vue"),
    meta: { publicSite: true, siteRuntimeOnly: true },
    children: [
      {
        path: "",
        name: "site-home",
        component: () => import("@/views/OfficialSiteHome.vue"),
        meta: { title: "首页", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "news",
        name: "site-news",
        component: () => import("@/views/OfficialSiteNews.vue"),
        meta: { title: "新闻资讯", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "news/:id",
        name: "site-news-detail",
        component: () => import("@/views/OfficialSiteNewsDetail.vue"),
        meta: { title: "新闻详情", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "download",
        name: "site-download",
        component: () => import("@/views/AppDownloadLanding.vue"),
        meta: { title: "平台下载", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "about",
        name: "site-about",
        component: () => import("@/views/OfficialSiteAbout.vue"),
        meta: { title: "关于我们", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "privacy-policy",
        name: "site-privacy-policy",
        component: () => import("@/views/OfficialSitePrivacyPolicy.vue"),
        meta: { title: "隐私政策", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "disclaimer",
        name: "site-disclaimer",
        component: () => import("@/views/OfficialSiteDisclaimer.vue"),
        meta: { title: "免责声明", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "cookie-required",
        name: "site-cookie-required",
        component: () => import("@/views/OfficialSiteCookieRequired.vue"),
        meta: { title: "Cookie 说明", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "expose",
        alias: ["/exposures"],
        name: "site-expose",
        component: () => import("@/views/OfficialSiteExposureBoard.vue"),
        meta: { title: "曝光店铺", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "expose/submit",
        alias: ["/exposures/submit"],
        name: "site-expose-submit",
        component: () => import("@/views/OfficialSiteExposureBoard.vue"),
        meta: { title: "提交曝光", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "expose/:id",
        alias: ["/exposures/:id"],
        name: "site-expose-detail",
        component: () => import("@/views/OfficialSiteExposureDetail.vue"),
        meta: { title: "曝光详情", publicSite: true, siteRuntimeOnly: true },
      },
      {
        path: "coop",
        alias: ["/cooperation"],
        name: "site-coop",
        component: () => import("@/views/OfficialSiteCooperation.vue"),
        meta: { title: "商务合作", publicSite: true, siteRuntimeOnly: true },
      },
    ],
  },
  {
    path: "/merchants/:merchantId/shops/:shopId/menu",
    name: "shop-menu-manage",
    component: () => import("@/views/ShopMenuManage.vue"),
    meta: { requiresAuth: true, title: "菜单管理", menuRoot: "/merchants" },
  },
  {
    path: "/merchants/:merchantId/shops/:shopId",
    name: "shop-manage-detail",
    component: () => import("@/views/ShopManageDetail.vue"),
    meta: { requiresAuth: true, title: "店铺详情", menuRoot: "/merchants" },
  },
  {
    path: "/merchants/:id",
    name: "merchant-profile",
    component: () => import("@/views/MerchantProfile.vue"),
    meta: { requiresAuth: true, title: "商户详情", menuRoot: "/merchants" },
  },
  {
    path: "/notifications/edit",
    name: "notification-create",
    component: () => import("@/views/NotificationEditorPage.vue"),
    meta: { requiresAuth: true, title: "新建通知" },
  },
  {
    path: "/notifications/edit/:id",
    name: "notification-edit",
    component: () => import("@/views/NotificationEditorPage.vue"),
    meta: { requiresAuth: true, title: "编辑通知" },
  },
  {
    path: "/notifications/preview/:id",
    name: "notification-preview",
    component: () => import("@/views/NotificationPreviewPage.vue"),
    meta: { requiresAuth: true, title: "通知预览" },
  },
  ...protectedRoutes.map((item) => ({
    path: item.path,
    name: item.name,
    component: resolveProtectedView(item.name),
    meta: { requiresAuth: true, title: item.title },
  })),
  { path: "/system-settings", redirect: "/settings" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function isInvitePath(path) {
  return typeof path === "string" && path.startsWith("/invite/");
}

function isDownloadPath(path) {
  return typeof path === "string" && path === "/download";
}

function isCouponClaimPath(path) {
  return typeof path === "string" && path.startsWith("/coupon/");
}

function isSitePath(path) {
  return (
    path === "/" ||
    path === "/news" ||
    path.startsWith("/news/") ||
    path === "/download" ||
    path === "/about" ||
    path === "/privacy-policy" ||
    path === "/disclaimer" ||
    path === "/cookie-required" ||
    path === "/expose" ||
    path === "/expose/submit" ||
    path.startsWith("/expose/") ||
    path === "/exposures" ||
    path === "/exposures/submit" ||
    path.startsWith("/exposures/") ||
    path === "/coop" ||
    path === "/cooperation"
  );
}

function resolveDocumentTitle(route) {
  const runtime = getAppRuntime();
  const routeTitle =
    typeof route?.meta?.title === "string" ? route.meta.title.trim() : "";
  if (runtime === "site") {
    if (routeTitle) {
      return `悦享e食 - ${routeTitle}`;
    }
    return "悦享e食";
  }
  if (runtime === "invite") {
    if (routeTitle) {
      return `悦享e食 - ${routeTitle}`;
    }
    return "悦享e食";
  }
  if (routeTitle) {
    return `悦享e食管理后台 - ${routeTitle}`;
  }
  return "悦享e食管理后台";
}

router.beforeEach((to, from, next) => {
  const runtime = getAppRuntime();
  const invitePath = isInvitePath(to.path);
  const downloadPath = isDownloadPath(to.path);
  const couponClaimPath = isCouponClaimPath(to.path);
  const sitePath = isSitePath(to.path);
  const accessDeniedRoute = to.name === "access-denied";
  const publicRuntime = runtime === "invite" || runtime === "site";
  const siteMatchedRoute = to.matched.some((record) => record.meta?.publicSite);

  if (runtime === "invite" && to.path === "/") {
    next({
      name: "access-denied",
      query: { mode: "invite-only" },
      replace: true,
    });
    return;
  }
  if (
    runtime === "invite" &&
    (downloadPath || (!invitePath && !couponClaimPath && !accessDeniedRoute))
  ) {
    next({
      name: "access-denied",
      query: { mode: "invite-only" },
      replace: true,
    });
    return;
  }
  if (runtime === "site" && accessDeniedRoute) {
    next({ name: "site-home", replace: true });
    return;
  }
  if (runtime === "site" && !siteMatchedRoute && !sitePath) {
    next({ name: "site-home", replace: true });
    return;
  }

  if (runtime === "site" && siteMatchedRoute) {
    const siteCookieConsent = getSiteCookieConsent();
    if (
      siteCookieConsent === "accepted" &&
      to.name === "site-cookie-required"
    ) {
      const redirectPath =
        typeof to.query.redirect === "string" &&
        to.query.redirect.startsWith("/")
          ? to.query.redirect
          : "/";
      next({ path: redirectPath, replace: true });
      return;
    }
  }

  if (runtime === "admin" && (invitePath || couponClaimPath || downloadPath)) {
    next({
      name: "access-denied",
      query: { mode: "admin-only" },
      replace: true,
    });
    return;
  }
  if (runtime === "admin" && to.path === "/") {
    next({ name: "dashboard", replace: true });
    return;
  }
  if (runtime === "admin" && sitePath) {
    next({
      name: "access-denied",
      query: { mode: "admin-only" },
      replace: true,
    });
    return;
  }

  const token = getToken();
  if (!publicRuntime && to.meta.requiresAuth && !token) {
    next({ name: "login", replace: true });
    return;
  }

  next();
});

router.afterEach((to) => {
  if (typeof document === "undefined") {
    return;
  }
  const siteMatchedRoute = to.matched.some((record) => record.meta?.publicSite);
  if (siteMatchedRoute) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(to));
    return;
  }
  clearOfficialSiteSeo();
  document.title = resolveDocumentTitle(to);
});

export default router;
