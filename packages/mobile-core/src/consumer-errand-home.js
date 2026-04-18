import { buildErrandHomeViewModel } from "../../domain-core/src/errand-settings.js";
import {
  getCurrentUserIdentity,
  isErrandOrder,
  mapErrandOrderSummary,
} from "./consumer-errand.js";
import { getMobileClientId } from "./mobile-client-context.js";

function resolveConsumerErrandHomeUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function resolveConsumerErrandHomeComponents(options = {}) {
  return options.components && typeof options.components === "object"
    ? options.components
    : undefined;
}

function resolveConsumerErrandHomeLogger(logger) {
  return logger && typeof logger.error === "function" ? logger : console;
}

export function normalizeConsumerErrandHomeOrderCollection(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.list)) {
    return response.list;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

export function formatConsumerErrandHomePrice(value) {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toFixed(2);
}

export function createErrandHomePage(options = {}) {
  const fetchOrders =
    typeof options.fetchOrders === "function" ? options.fetchOrders : async () => [];
  const loadPlatformRuntimeSettings =
    typeof options.loadPlatformRuntimeSettings === "function"
      ? options.loadPlatformRuntimeSettings
      : async () => ({});
  const isRuntimeRouteEnabled =
    typeof options.isRuntimeRouteEnabled === "function"
      ? options.isRuntimeRouteEnabled
      : () => true;
  const getIdentity =
    typeof options.getCurrentUserIdentity === "function"
      ? options.getCurrentUserIdentity
      : getCurrentUserIdentity;
  const matchErrandOrder =
    typeof options.isErrandOrder === "function"
      ? options.isErrandOrder
      : isErrandOrder;
  const summarizeErrandOrder =
    typeof options.mapErrandOrderSummary === "function"
      ? options.mapErrandOrderSummary
      : mapErrandOrderSummary;
  const buildHomeViewModel =
    typeof options.buildErrandHomeViewModel === "function"
      ? options.buildErrandHomeViewModel
      : buildErrandHomeViewModel;
  const resolveClientId =
    typeof options.getMobileClientId === "function"
      ? options.getMobileClientId
      : getMobileClientId;
  const uniApp = resolveConsumerErrandHomeUniApp(options.uniApp);
  const logger = resolveConsumerErrandHomeLogger(options.logger);
  const components = resolveConsumerErrandHomeComponents(options);

  return {
    components,
    data() {
      const errandHome = buildHomeViewModel();
      return {
        featureEnabled: true,
        pageTitle: errandHome.pageTitle,
        heroTitle: errandHome.heroTitle,
        heroDesc: errandHome.heroDesc,
        detailTip: errandHome.detailTip,
        services: Array.isArray(errandHome.services) ? errandHome.services : [],
        recentOrders: [],
        loadingRecent: false,
      };
    },
    async onLoad() {
      await this.loadRuntime();
      await this.loadRecentOrders();
    },
    async onShow() {
      await this.loadRuntime();
      await this.loadRecentOrders();
    },
    methods: {
      async loadRuntime() {
        try {
          const runtime = (await loadPlatformRuntimeSettings()) || {};
          this.featureEnabled = isRuntimeRouteEnabled(
            runtime,
            "feature",
            "errand",
            resolveClientId(),
          );
          const errandHome = buildHomeViewModel(
            runtime.errandSettings || runtime.errand_settings || {},
          );
          this.pageTitle = errandHome.pageTitle;
          this.heroTitle = errandHome.heroTitle;
          this.heroDesc = errandHome.heroDesc;
          this.detailTip = errandHome.detailTip;
          this.services = Array.isArray(errandHome.services) ? errandHome.services : [];
        } catch (error) {
          logger.error?.("加载跑腿 runtime 失败:", error);
        }
      },
      goService(item = {}) {
        if (!this.featureEnabled) {
          uniApp.showToast?.({ title: "当前服务暂未开放", icon: "none" });
          return;
        }

        if (item.serviceFeeHint) {
          uniApp.showToast?.({ title: item.serviceFeeHint, icon: "none" });
        }

        if (item.route) {
          uniApp.navigateTo?.({ url: item.route });
        }
      },
      async loadRecentOrders() {
        const identity = getIdentity() || {};
        if (!identity.userId) {
          this.recentOrders = [];
          this.loadingRecent = false;
          return;
        }

        this.loadingRecent = true;
        try {
          const response = await fetchOrders(identity.userId);
          this.recentOrders = normalizeConsumerErrandHomeOrderCollection(response)
            .filter((item) => matchErrandOrder(item))
            .slice(0, 5)
            .map((item) => summarizeErrandOrder(item));
        } catch (error) {
          logger.error?.("加载跑腿订单失败:", error);
          this.recentOrders = [];
        } finally {
          this.loadingRecent = false;
        }
      },
      goOrderDetail(order = {}) {
        if (!order.id) {
          return;
        }

        uniApp.navigateTo?.({
          url: `/pages/errand/detail/index?id=${encodeURIComponent(order.id)}`,
        });
      },
      formatPrice(value) {
        return formatConsumerErrandHomePrice(value);
      },
    },
  };
}
